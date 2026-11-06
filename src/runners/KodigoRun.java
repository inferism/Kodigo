package kodigo;

import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.MethodTree;
import com.sun.source.tree.Tree;
import com.sun.source.util.JavacTask;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.Writer;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
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
    private static native void setMainClass(String name);

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

    private static boolean hasMain(ClassTree type) {
        return type.getMembers().stream().anyMatch((member) -> member instanceof MethodTree method
            && method.getName().contentEquals("main")
            && method.getModifiers().getFlags().containsAll(Set.of(Modifier.PUBLIC, Modifier.STATIC)));
    }

    // Uses javac's own parser, which isn't fooled by comments, strings or nested classes.
    // Code with syntax errors is fine here: the real compile below reports them.
    private static void compile(String code) throws Exception {
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        JavacTask parser = (JavacTask) javac.getTask(Writer.nullWriter(), null, (error) -> {}, null, null,
            List.of(new Source("Main.java", code)));
        CompilationUnitTree unit = parser.parse().iterator().next();

        String fileName = "Main.java";
        String mainClass = "";
        boolean foundPublic = false;
        for (Tree tree : unit.getTypeDecls()) {
            if (!(tree instanceof ClassTree type)) continue;
            boolean isPublic = type.getModifiers().getFlags().contains(Modifier.PUBLIC);
            // After a syntax error the name can be "<error>", which isn't a usable file name.
            if (isPublic && !foundPublic && SourceVersion.isIdentifier(type.getSimpleName())) {
                foundPublic = true;
                fileName = type.getSimpleName() + ".java";
            }
            // The public class wins if it has a main method. Otherwise, the first class that has one.
            if (hasMain(type) && (mainClass.isEmpty() || isPublic)) mainClass = type.getSimpleName().toString();
        }
        if (unit.getPackageName() != null && !mainClass.isEmpty()) mainClass = unit.getPackageName() + "." + mainClass;
        setMainClass(mainClass);

        PrintWriter errors = new PrintWriter(pageStream(true), true, StandardCharsets.UTF_8);
        boolean compiled = javac.getTask(errors, null, null, List.of("-g", "-d", "/files/"), null,
            List.of(new Source(fileName, code))).call();
        System.exit(compiled ? 0 : 1);
    }

    private static void run(String mainClass) throws Exception {
        System.setIn(new PageInput());
        System.setOut(new PrintStream(pageStream(false), true, "UTF-8"));
        System.setErr(new PrintStream(pageStream(true), true, "UTF-8"));
        // Reflection, because this class is compiled before the user's class exists.
        try {
            Method main = Class.forName(mainClass).getMethod("main", String[].class);
            main.setAccessible(true); // This package can't otherwise call a class that isn't public.
            main.invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            e.getCause().printStackTrace();
            System.exit(1);
        } catch (ClassNotFoundException | NoSuchMethodException e) {
            System.err.println("No main method found. To run, add: public static void main(String[] args)");
            System.exit(1);
        }
    }

    public static void main(String[] args) throws Exception {
        if (args[0].equals("compile")) compile(args[1]);
        else run(args[1]);
    }
}
