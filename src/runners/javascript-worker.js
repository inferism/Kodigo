// Runs one JavaScript program inside a Web Worker, so an infinite loop can never freeze the page.
// The page side is src/runners/javascript.js, and the messages between them are listed there.
// A fresh worker is made for every run, so nothing from an earlier program is left behind.
import { parse } from 'acorn';

const realSetTimeout = setTimeout; // kept so Kodigo's own timers aren't counted as the program's
const realClear = clearTimeout;

// Output is sent in batches: a loop that prints forever would otherwise queue millions of messages.
// The elapsed-time check keeps the batches flowing inside a loop that never lets a timer fire,
// and the timer sends whatever is left over when the program goes quiet.
let buffer = [];
let lastFlush = 0;
let flushQueued = false;

function flush() {
  lastFlush = Date.now();
  if (!buffer.length) return;
  // The page keeps only the last 200,000 characters anyway, so a program that prints forever sends no more than that.
  for (const item of buffer) item.text = item.text.slice(-200_000);
  postMessage({ type: 'print', items: buffer });
  buffer = [];
}

function write(text, isError = false) {
  const last = buffer[buffer.length - 1];
  if (last?.isError === isError) last.text += text; // one big piece is far cheaper for the page than thousands of small ones
  else buffer.push({ text, isError });
  if (Date.now() - lastFlush > 50) flush();
  else if (!flushQueued) {
    flushQueued = true;
    realSetTimeout(() => { flushQueued = false; flush(); }, 50);
  }
}

// console.log shows text, objects and arrays as JSON, and an Error as "Name: message".
const show = (value) => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'object' && value !== null) {
    try { return JSON.stringify(value); } catch { /* circular: fall through */ }
  }
  return String(value);
};
const printer = (isError) => (...args) => write(`${args.map(show).join(' ')}\n`, isError);
Object.assign(console, { log: printer(false), info: printer(false), debug: printer(false), warn: printer(true), error: printer(true) });

// Input has to be awaited, because a worker can't stop and wait the way a Java Scanner does.
let giveLine = null;
self.input = (question = '') => {
  write(String(question));
  flush();
  return new Promise((resolve) => { giveLine = resolve; postMessage({ type: 'readLine' }); });
};

// Like Node, the run only ends when the program has finished and no timer is left. setInterval never
// finishes by itself, so that program runs until Stop.
const live = new Set();
let mainDone = false;
let finished = false;

function finish(exitCode) {
  if (finished) return;
  finished = true;
  flush();
  postMessage({ type: 'done', exitCode });
}

// The line is where the error came from in the user's code: acorn's for a syntax error, else the first stack frame.
function fail(error, line) {
  const e = error instanceof Error ? error : new Error(String(error));
  line ??= Number(/kodigo-user\.js:(\d+)/.exec(e.stack ?? '')?.[1]) || null;
  const message = e.message.replace(/ \(\d+:\d+\)$/, ''); // acorn adds "(line:column)" to its messages
  write(`${e.name}: ${message}\n`, true);
  flush();
  if (line) postMessage({ type: 'diagnostic', line, message });
  finish(1);
}

const check = () => {
  flush();
  if (mainDone && !live.size) finish(0);
};

for (const [name, repeats] of [['setTimeout', false], ['setInterval', true]]) {
  const real = self[name];
  self[name] = (callback, ms, ...args) => {
    const id = real(() => {
      if (!repeats) live.delete(id);
      try { callback(...args); } catch (error) { fail(error); }
      check();
    }, ms);
    live.add(id);
    return id;
  };
}
self.clearTimeout = self.clearInterval = (id) => { live.delete(id); realClear(id); };
self.onunhandledrejection = (event) => { event.preventDefault(); fail(event.reason); };

async function run(source) {
  try {
    // Parsing first gives a syntax error its exact line. Top-level await and return are allowed because
    // the program is wrapped in an async function below.
    parse(source, { ecmaVersion: 'latest', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, locations: true });
  } catch (error) {
    fail(error, error.loc?.line);
    return;
  }
  try {
    // The wrapper starts on the program's own first line, so line numbers in errors match the editor.
    await (0, eval)(`(async function () {${source}\n})()\n//# sourceURL=kodigo-user.js`);
  } catch (error) {
    fail(error);
    return;
  }
  mainDone = true;
  check();
}

onmessage = ({ data }) => {
  if (data.type === 'run') run(data.source);
  else if (data.type === 'input') giveLine?.(data.line);
};
postMessage({ type: 'ready' });
