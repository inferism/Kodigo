// The C and C++ runners. See "Runner contract" in docs/ARCHITECTURE.md.
// Both use src/runners/clang-worker.js, which compiles with clang and runs the program. Only the file type differs.
// The worker stays between runs, because loading clang again takes a couple of seconds, and every run starts the
// program fresh anyway. Stop, or a failure, throws the worker away and starts a new one.
import ClangWorker from './clang-worker.js?worker';

const stoppedResult = { exitCode: null, stopped: true };

function createClangRunner(id, label) {
  let worker = null;
  let ready = null; // Settles when the current worker has loaded clang.
  let readyWaiters = null; // { resolve, reject } while ready is pending.
  let job = null; // The run in progress: { io, resolve, reject }.
  let reportProgress = () => {};

  function killWorker() {
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    worker = null;
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
    progress: ({ percent }) => reportProgress(percent),
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
    },
    failed: ({ message }) => fail(new Error(message)),
  };

  function start() {
    if (!readyWaiters) { // A Stop while still loading keeps the same promise, so whoever waits on it isn't stranded.
      ready = new Promise((resolve, reject) => { readyWaiters = { resolve, reject }; });
      ready.catch(() => {}); // Nothing may be waiting on a fresh worker yet.
    }
    worker = new ClangWorker();
    worker.onerror = (event) => fail(new Error(event.message || `${label} could not start`));
    worker.onmessage = ({ data }) => handlers[data.type](data);
    worker.postMessage({ type: 'load' });
  }

  return {
    id,
    label,

    // Downloads clang (about 18 MB the first time, then the browser caches it) and reports the percent.
    load(onProgress) {
      if (onProgress) reportProgress = onProgress;
      if (!ready) start();
      return ready;
    },

    // One run at a time. The UI disables Run until this settles. A compile error is a normal result with exit code 1.
    run(source, io) {
      return new Promise((resolve, reject) => {
        if (job) {
          reject(new Error('A program is already running'));
          return;
        }
        const thisJob = { io, resolve, reject };
        job = thisJob;
        this.load().then(() => {
          if (job === thisJob) worker.postMessage({ type: 'run', lang: id, source });
        }, reject);
      });
    },

    // Ends even an infinite loop, because the whole worker is thrown away.
    stop() {
      job?.resolve(stoppedResult);
      job = null;
      killWorker();
      start();
    },
  };
}

export const cRunner = createClangRunner('c', 'C');
export const cppRunner = createClangRunner('cpp', 'C++');
