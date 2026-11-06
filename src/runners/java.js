// The Java runner. See "Runner contract" in docs/ARCHITECTURE.md.

const workerUrl = '/runners/java/worker.js';
const stoppedResult = { exitCode: null, stopped: true };

let worker = null;
let ready = null; // Settles when a worker can compile. A Stop during loading keeps it, so waiters aren't stranded.
let readyWaiters = null; // { resolve, reject } while ready is pending.
let job = null; // The run in progress: { io, resolve, reject }.
let progress = () => {};

// javac reports errors as "Hello.java:3: error: ';' expected".
function parseDiagnostics(output) {
  return [...output.matchAll(/^.+?\.java:(\d+): error: (.*)$/gm)]
    .map(([, line, message]) => ({ line: Number(line), message }));
}

// Clears the handlers too, so messages already on their way from this worker are dropped.
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
  progress: ({ percent }) => progress(percent),
  print: ({ text, isError }) => (isError ? job?.io.onStderr(text) : job?.io.onStdout(text)),
  compiled: ({ output }) => {
    if (!job) return;
    if (output) job.io.onStderr(output);
    parseDiagnostics(output).forEach(job.io.onDiagnostic);
  },
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
  if (!readyWaiters) {
    ready = new Promise((resolve, reject) => { readyWaiters = { resolve, reject }; });
    ready.catch(() => {}); // After a Stop, nothing may be waiting on this yet.
  }
  worker = new Worker(workerUrl);
  worker.onerror = (event) => fail(new Error(event.message || 'Java could not start'));
  worker.onmessage = ({ data }) => handlers[data.type](data);
}

export const javaRunner = {
  id: 'java',
  label: 'Java',

  load(onProgress) {
    if (onProgress) progress = onProgress;
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

  // Java has to load again after this, so the next run waits. load()'s progress callback reports it.
  stop() {
    job?.resolve(stoppedResult);
    job = null;
    killWorker();
    start();
  },
};
