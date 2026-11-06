import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import javax.tools.ToolProvider;

// Connects javac and the user's program to the page. A worker has no #console for CheerpJ to write to.
public class KodigoRun {
    // Both are implemented in JavaScript through cheerpjInit's natives option.
    private static native String readLine();
    private static native void write(String text, boolean isError);

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

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && args[0].equals("compile")) {
            OutputStream errors = pageStream(true);
            List<String> javac = new ArrayList<>(List.of("-g", "/str/Main.java", "-d", "/files/"));
            javac.addAll(List.of(args).subList(1, args.length));
            System.exit(ToolProvider.getSystemJavaCompiler().run(null, errors, errors, javac.toArray(new String[0])));
        }
        System.setIn(new PageInput());
        System.setOut(new PrintStream(pageStream(false), true, "UTF-8"));
        System.setErr(new PrintStream(pageStream(true), true, "UTF-8"));
        // Reflection, because this class is compiled before the user's Main exists.
        try {
            Class.forName("Main").getMethod("main", String[].class).invoke(null, (Object) args);
        } catch (InvocationTargetException e) {
            e.getCause().printStackTrace();
            System.exit(1);
        }
    }
}
