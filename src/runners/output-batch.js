// Shared by the JavaScript and Python workers. A program's output is sent to the page in batches: a loop that
// prints forever would otherwise queue millions of messages and freeze the page.
// The elapsed-time check keeps batches flowing inside a loop that never lets a timer fire, and the timer
// sends whatever is left over when the program goes quiet.
//
// createOutput(send, schedule) gives { write(text, isError), flush() }. send gets a list of { text, isError }.
// Pass the worker's own setTimeout as schedule if the program can replace the global one.
const KEEP = 200_000; // the page keeps only the last 200,000 characters anyway

export function createOutput(send, schedule = setTimeout) {
  let buffer = [];
  let size = 0; // characters in the buffer
  let lastFlush = 0;
  let flushQueued = false;

  function flush() {
    lastFlush = Date.now();
    if (!buffer.length) return;
    for (const item of buffer) item.text = item.text.slice(-KEEP);
    send(buffer);
    buffer = [];
    size = 0;
  }

  function write(text, isError = false) {
    const last = buffer[buffer.length - 1];
    if (last?.isError === isError) last.text += text; // one big piece is far cheaper for the page than thousands of small ones
    else buffer.push({ text, isError });
    size += text.length;
    // A program that prints forever must not build an endless batch, so the oldest output is dropped. Alternating
    // stdout and stderr can't merge, so the number of pieces is capped too, not only the characters.
    if (buffer.length > 1000) {
      buffer = buffer.slice(-500);
      size = buffer.reduce((total, item) => total + item.text.length, 0);
    }
    while (size > KEEP && buffer.length > 1) size -= buffer.shift().text.length;
    if (Date.now() - lastFlush > 50) flush();
    else if (!flushQueued) {
      flushQueued = true;
      schedule(() => { flushQueued = false; flush(); }, 50);
    }
  }

  return { write, flush };
}
