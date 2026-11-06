// The Java runner. See "Runner contract" in docs/ARCHITECTURE.md.

const workerUrl = '/runners/java/worker.js';
const stoppedResult = { exitCode: null, stopped: true };

let worker = null;
let ready = null; // Settles when the current worker can compile.
let rejectReady = null;
let job = null; // The run in progress: { io, resolve, reject }.
let progress = () => {};

// javac reports errors as "Main.java:3: error: ';' expected", once its path is removed.
function parseDiagnostics(output) {
  return [...output.matchAll(/^Main\.java:(\d+): error: (.*)$/gm)]
    .map(([, line, message]) => ({ line: Number(line), message }));
}

function fail(error) {
  rejectReady(error);
  job?.reject(error);
  job = null;
  worker.terminate();
  ready = null;
}

const handlers = {
  progress: ({ percent }) => progress(percent),
  print: ({ text, isError }) => (isError ? job?.io.onStderr(text) : job?.io.onStdout(text)),
  compiled: ({ output }) => {
    if (!job) return;
    const text = output.replaceAll('/str/Main.java', 'Main.java');
    if (text) job.io.onStderr(text);
    parseDiagnostics(text).forEach(job.io.onDiagnostic);
  },
  readLine: async () => {
    const asking = job;
    const line = await asking?.io.readInput();
    if (asking && asking === job) worker.postMessage({ type: 'input', line });
  },
  done: ({ exitCode }) => {
    job?.resolve({ exitCode, stopped: false });
    job = null;
  },
  failed: ({ message }) => fail(new Error(message)),
};

function start() {
  ready = new Promise((resolve, reject) => {
    rejectReady = reject;
    worker = new Worker(workerUrl);
    worker.onerror = (event) => fail(new Error(event.message || 'Java could not start'));
    worker.onmessage = ({ data }) => (data.type === 'ready' ? resolve() : handlers[data.type](data));
  });
  ready.catch(() => {}); // After a Stop, nothing may be waiting on this yet.
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
    worker?.terminate();
    start();
  },
};
