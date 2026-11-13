// The JavaScript runner. See "Runner contract" in docs/ARCHITECTURE.md.
// The program runs in src/runners/javascript-worker.js, which sends these messages: ready, print (a batch of
// { text, isError }), diagnostic ({ line, message }), readLine and done ({ exitCode }). The page sends run and input.
import JavaScriptWorker from './javascript-worker.js?worker';

const stoppedResult = { exitCode: null, stopped: true };

let worker = null;
let ready = null; // Settles when the current worker can run code.
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
      const line = await asking.io.readInput();
      if (asking === job) worker.postMessage({ type: 'input', line });
    } catch (error) {
      if (asking === job) fail(error);
    }
  },
  done: ({ exitCode }) => {
    job?.resolve({ exitCode, stopped: false });
    job = null;
    restart(); // every run gets a clean worker, so leftover globals and timers can't affect the next one
  },
};

function start() {
  if (!readyWaiters) { // A Stop while still loading keeps the same promise, so whoever waits on it isn't stranded.
    ready = new Promise((resolve, reject) => { readyWaiters = { resolve, reject }; });
    ready.catch(() => {}); // Nothing may be waiting on a fresh worker yet.
  }
  worker = new JavaScriptWorker();
  worker.onerror = (event) => fail(new Error(event.message || 'JavaScript could not start'));
  worker.onmessage = ({ data }) => handlers[data.type](data);
}

function restart() {
  killWorker();
  start();
}

export const javascriptRunner = {
  id: 'javascript',
  label: 'JavaScript',

  // Nothing to download, so there's no progress to report. It only waits for the worker to start.
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

  // Ends even an infinite loop, because the whole worker is thrown away.
  stop() {
    job?.resolve(stoppedResult);
    job = null;
    restart();
  },
};
