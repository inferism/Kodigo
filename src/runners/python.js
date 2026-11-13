// The Python runner. See "Runner contract" in docs/ARCHITECTURE.md.
// The program runs in src/runners/python-worker.js. The page sends start (with the shared memory for input) and
// run, and the worker sends ready, print (a batch of { text, isError }), diagnostic ({ line, message }),
// readLine, done ({ exitCode }) and failed ({ message }).

const stoppedResult = { exitCode: null, stopped: true };
const MAX_LINE = 65_536; // bytes of one typed line; the worker waits on this memory for the page to fill it

let worker = null;
let control = null; // Int32Array: [0] is 1 when a line is ready, [1] is its length in bytes
let bytes = null; // Uint8Array: the line itself
let ready = null; // Settles when Python has loaded in the current worker.
let readyWaiters = null; // { resolve, reject } while ready is pending.
let job = null; // The run in progress: { io, resolve, reject }.

function killWorker() {
  if (!worker) return;
  worker.onmessage = null;
  worker.onerror = null;
  worker.terminate();
}

function fail(error) {
  readyWaiters?.reject(error);
  readyWaiters = null;
  job?.reject(error);
  job = null;
  killWorker();
  ready = null;
}

const handlers = {
  ready: () => {
    readyWaiters.resolve();
    readyWaiters = null;
  },
  print: ({ items }) => items.forEach(({ text, isError }) => (isError ? job?.io.onStderr(text) : job?.io.onStdout(text))),
  diagnostic: ({ line, message }) => job?.io.onDiagnostic({ line, message }),
  readLine: async () => {
    const asking = job;
    if (!asking) return;
    try {
      const line = new TextEncoder().encode(await asking.io.readInput()).subarray(0, MAX_LINE);
      if (asking !== job) return;
      bytes.set(line);
      Atomics.store(control, 1, line.length);
      Atomics.store(control, 0, 1);
      Atomics.notify(control, 0); // wakes the worker, which is waiting inside input()
    } catch (error) {
      if (asking === job) fail(error);
    }
  },
  done: ({ exitCode }) => {
    job?.resolve({ exitCode, stopped: false });
    job = null;
    restart(); // every run gets a clean Python, so one program can't change how the next behaves
  },
  failed: ({ message }) => fail(new Error(message)),
};

function start() {
  if (!readyWaiters) { // A Stop while still loading keeps the same promise, so whoever waits on it isn't stranded.
    ready = new Promise((resolve, reject) => { readyWaiters = { resolve, reject }; });
    ready.catch(() => {}); // Nothing may be waiting on a fresh worker yet.
  }
  if (!self.crossOriginIsolated) { // Without it there is no shared memory, so input() could never wait.
    // Retrying can't help, so the rejected promise stays and load() keeps returning it.
    readyWaiters.reject(new Error('this page is missing the headers Python needs (see docs/ARCHITECTURE.md)'));
    readyWaiters = null;
    return;
  }
  const sharedMemory = new SharedArrayBuffer(8 + MAX_LINE);
  control = new Int32Array(sharedMemory, 0, 2);
  bytes = new Uint8Array(sharedMemory, 8);
  worker = new Worker(new URL('./python-worker.js', import.meta.url), { type: 'module' }); // Pyodide's loader refuses a classic worker
  worker.onerror = (event) => fail(new Error(event.message || 'Python could not start'));
  worker.onmessage = ({ data }) => handlers[data.type](data);
  worker.postMessage({ type: 'start', sharedMemory });
}

function restart() {
  killWorker();
  start();
}

export const pythonRunner = {
  id: 'python',
  label: 'Python',

  // Downloads Pyodide the first time (about 10 MB, then cached by the browser). There is no progress to report.
  load() {
    if (!ready) start();
    return ready;
  },

  // One run at a time. The UI disables Run until this settles.
  run(source, io) {
    return new Promise((resolve, reject) => {
      if (job) {
        reject(new Error('A program is already running'));
        return;
      }
      const thisJob = { io, resolve, reject };
      job = thisJob;
      this.load().then(() => {
        if (job === thisJob) worker.postMessage({ type: 'run', source });
      }, reject);
    });
  },

  // Ends even an infinite loop or a program waiting in input(), because the whole worker is thrown away.
  stop() {
    job?.resolve(stoppedResult);
    job = null;
    restart();
  },
};
