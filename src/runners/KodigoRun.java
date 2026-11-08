package kodigo;

import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.Tree;
import com.sun.source.util.JavacTask;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.Writer;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.Modifier;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

// Connects javac and the user's program to the page. A worker has no #console for CheerpJ to write to.
// It's in a package so that a user's own class called KodigoRun doesn't clash with it.
public class KodigoRun {
    // These are implemented in JavaScript through cheerpjInit's natives option.
    private static native String readLine();
    private static native void write(String text, boolean isError);
    private static native void setCandidates(String classNames);
    // Takes another worker's folder lock if nobody holds it, so the folder can be deleted safely.
    private static native boolean claimFolder(String id);
    private static native void releaseFolder(String id);

    private static OutputStream pageStream(boolean isError) {
        return new OutputStream() {
            @Override public void write(int b) {
                write(new byte[] { (byte) b }, 0, 1);
            }
            @Override public void write(byte[] b, int off, int len) {
                KodigoRun.write(new String(b, off, len, StandardCharsets.UTF_8), isError);
            }
        };
    }

    private static class PageInput extends InputStream {
        private byte[] line = new byte[0];
        private int pos = 0;

        private boolean fill() {
            if (pos < line.length) return true;
            String text = readLine();
            if (text == null) return false;
            line = (text + "\n").getBytes(StandardCharsets.UTF_8);
            pos = 0;
            return true;
        }

        @Override public int read() {
            return fill() ? line[pos++] & 0xff : -1;
        }

        // Scanner calls this. Returning one line at a time stops it waiting for a full buffer.
        @Override public int read(byte[] b, int off, int len) {
            if (len == 0) return 0;
            if (!fill()) return -1;
            int count = Math.min(len, line.length - pos);
            System.arraycopy(line, pos, b, off, count);
            pos += count;
            return count;
        }
    }

    // The user's code, held in memory so its file name can match their public class.
    private static class Source extends SimpleJavaFileObject {
        private final String fileName;
        private final String code;

        Source(String fileName, String code) {
            super(URI.create("string:///" + fileName), JavaFileObject.Kind.SOURCE);
            this.fileName = fileName;
            this.code = code;
        }

        // Errors use this. The default would add a leading slash.
        @Override public String getName() {
            return fileName;
        }

        @Override public CharSequence getCharContent(boolean ignoreEncodingErrors) {
            return code;
        }
    }

    // Deletes a folder's files, then the folder, unless onlyClasses is set. Deepest paths go first.
    // Best effort: another tab can delete the same folder at the same moment, and CheerpJ can still
    // list a folder it then says is missing. A failed cleanup must never stop the compile.
    private static void delete(Path root, boolean onlyClasses) {
        try (Stream<Path> paths = Files.walk(root)) {
            paths.sorted(Comparator.reverseOrder())
                .filter((path) -> !onlyClasses || path.toString().endsWith(".class"))
                .forEach((path) -> path.toFile().delete());
        } catch (IOException | UncheckedIOException e) {
            // Already gone or unreadable, so there's nothing to clean.
        }
    }

    // Each tab's worker has its own folder, and closed tabs leave theirs behind. A live worker holds its
    // folder's lock for its whole life, so getting the lock proves the owner is gone. The lock is held
    // while deleting, so no worker can take the folder over meanwhile.
    private static void deleteUnusedFolders(Path parent, Path keep) throws IOException {
        try (Stream<Path> folders = Files.list(parent)) {
            for (Path folder : folders.toList()) {
                String id = folder.getFileName().toString();
                if (folder.equals(keep) || !claimFolder(id)) continue;
                try {
                    delete(folder, false);
                } finally {
                    releaseFolder(id);
                }
            }
        }
    }

    // Uses javac's own parser, which isn't fooled by comments, strings or nested classes.
    // Code with syntax errors is fine here: the real compile below reports them.
    private static void compile(String classDir, String code) throws Exception {
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        JavacTask parser = (JavacTask) javac.getTask(Writer.nullWriter(), null, (error) -> {}, null, null,
            List.of(new Source("Main.java", code)));
        CompilationUnitTree unit = parser.parse().iterator().next();

        // The classes that might hold main, public class first. run() checks them once they're compiled.
        String fileName = "Main.java";
        String packagePrefix = unit.getPackageName() == null ? "" : unit.getPackageName() + ".";
        List<String> candidates = new ArrayList<>();
        boolean foundPublic = false;
        for (Tree tree : unit.getTypeDecls()) {
            // After a syntax error the name can be "<error>", which isn't a usable name.
            if (!(tree instanceof ClassTree type) || !SourceVersion.isIdentifier(type.getSimpleName())) continue;
            String name = packagePrefix + type.getSimpleName();
            if (type.getModifiers().getFlags().contains(Modifier.PUBLIC) && !foundPublic) {
                foundPublic = true;
                fileName = type.getSimpleName() + ".java";
                candidates.add(0, name);
            } else {
                candidates.add(name);
            }
        }
        setCandidates(String.join(",", candidates));

        // Classes stay in /files/ even after a reload, and javac would quietly compile against old ones.
        // /files/ is shared by every tab, so only this worker's own folder is cleared.
        Path dir = Path.of(classDir);
        Files.createDirectories(dir);
        delete(dir, true);
        deleteUnusedFolders(dir.getParent(), dir);

        PrintWriter errors = new PrintWriter(pageStream(true), true, StandardCharsets.UTF_8);
        boolean compiled = javac.getTask(errors, null, null, List.of("-g", "-d", classDir), null,
            List.of(new Source(fileName, code))).call();
        System.exit(compiled ? 0 : 1);
    }

    // Reflection sees the compiled classes as Java does, so it counts inherited mains, matches the exact
    // signature in any spelling, and skips overloads like main(int). Loading doesn't run static blocks yet.
    private static Class<?> findMainClass(String candidates) {
        for (String name : candidates.split(",")) {
            try {
                Class<?> type = Class.forName(name, false, KodigoRun.class.getClassLoader());
                Method main = type.getMethod("main", String[].class);
                if (java.lang.reflect.Modifier.isStatic(main.getModifiers()) && main.getReturnType() == void.class) return type;
            } catch (ClassNotFoundException | NoSuchMethodException | LinkageError e) {
                // Not runnable, so try the next class.
            }
        }
        return null;
    }

    private static void run(String candidates) throws Exception {
        System.setIn(new PageInput());
        System.setOut(new PrintStream(pageStream(false), true, "UTF-8"));
        System.setErr(new PrintStream(pageStream(true), true, "UTF-8"));
        // Reflection, because this class is compiled before the user's class exists.
        Class<?> mainClass = findMainClass(candidates);
        if (mainClass == null) {
            System.err.println("No main method found. To run, add: public static void main(String[] args)");
            System.exit(1);
        }
        try {
            // Initialising the chosen class first runs its static blocks, even when main is inherited.
            Class.forName(mainClass.getName(), true, KodigoRun.class.getClassLoader());
            Method main = mainClass.getMethod("main", String[].class);
            main.setAccessible(true); // This package can't otherwise call a class that isn't public.
            main.invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            e.getCause().printStackTrace();
            System.exit(1);
        }
    }

    public static void main(String[] args) throws Exception {
        if (args[0].equals("compile")) compile(args[1], args[2]);
        else run(args[1]);
    }
}
