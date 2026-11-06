import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

// Compiled next to the user's Main. Connects System.in, out and err to the page.
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
        System.setIn(new PageInput());
        System.setOut(new PrintStream(pageStream(false), true, "UTF-8"));
        System.setErr(new PrintStream(pageStream(true), true, "UTF-8"));
        Main.main(args);
    }
}
