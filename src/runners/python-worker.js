// Runs Python (Pyodide, which is CPython compiled to WebAssembly) inside a Web Worker, so an infinite loop
// can never freeze the page. The page side is src/runners/python.js, which lists the messages between them.
// The page throws this worker away after every run and starts a new one, so nothing a program did can reach the
// next one: not variables, not a replaced sys.stdout, not a half-read line of input, not an imported module.
import { createOutput } from './output-batch.js';

// Pyodide is loaded from jsDelivr, a free CDN, so it is not part of our files. The version is pinned.
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

const { write, flush } = createOutput((items) => postMessage({ type: 'print', items }));

// Python's own input() and sys.stdin read through Pyodide's stdin handler (setStdin below), which is this function.
// It has to wait for the page, and a worker can only wait for another thread with Atomics.wait on shared
// memory. The page writes the typed line into `bytes` and flips the flag in `control`. Shared memory needs
// the page to be cross-origin isolated, which vercel.json and vite.config.js turn on for the Python page.
let control;
let bytes;
self.kodigoReadLine = () => {
  flush(); // so a prompt without a newline shows before the wait
  Atomics.store(control, 0, 0);
  postMessage({ type: 'readLine' });
  Atomics.wait(control, 0, 0);
  return new TextDecoder().decode(bytes.slice(0, Atomics.load(control, 1))); // slice copies out of shared memory
};

// Python's side. kodigo_run compiles first, so a syntax error has its own line, then runs the program with its
// own empty namespace. It returns JSON: [exit code, line of the error in the program or null, error message or null].
const PRELUDE = `
import json, sys, traceback

def kodigo_run(source):
    # Only a mistake in the program's own text is reported here. A SyntaxError raised while the program runs,
    # such as from eval("1 +"), is an ordinary error below, so it points at the line that called eval.
    try:
        code = compile(source, 'main.py', 'exec')
    except SyntaxError as error:
        traceback.print_exception(type(error), error, None)
        sys.stderr.flush()
        return json.dumps([1, error.lineno, type(error).__name__ + ': ' + str(error.msg)])
    exit_code, line, message = 0, None, None
    try:
        exec(code, {'__name__': '__main__'})
    except SystemExit as error:
        if isinstance(error.code, int):
            exit_code = error.code
        elif error.code is not None:
            print(error.code, file=sys.stderr)
            exit_code = 1
    except BaseException as error:
        # Without this frame, the traceback starts at the student's code instead of at this function.
        tb = error.__traceback__.tb_next
        traceback.print_exception(type(error), error, tb)
        frames = [f for f in traceback.extract_tb(tb) if f.filename == 'main.py']
        line = frames[-1].lineno if frames else None
        message = type(error).__name__ + ': ' + str(error)
        exit_code = 1
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
    return json.dumps([exit_code, line, message])
`;

let pyodide;

// A stream's bytes can end in the middle of a character, so each stream keeps its own decoder.
const sink = (isError) => {
  const decoder = new TextDecoder();
  return { write: (buffer) => { write(decoder.decode(buffer, { stream: true }), isError); return buffer.length; }, isatty: true };
};

async function start(sharedMemory) {
  control = new Int32Array(sharedMemory, 0, 2);
  bytes = new Uint8Array(sharedMemory, 8);
  try {
    const { loadPyodide } = await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`);
    pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
    pyodide.setStdout(sink(false));
    pyodide.setStderr(sink(true));
    pyodide.setStdin({ stdin: self.kodigoReadLine });
    pyodide.runPython(PRELUDE);
    postMessage({ type: 'ready' });
  } catch (error) {
    postMessage({ type: 'failed', message: `Python could not load: ${error.message}` });
  }
}

function run(source) {
  try {
    const [exitCode, line, message] = JSON.parse(pyodide.globals.get('kodigo_run')(source));
    flush();
    if (line) postMessage({ type: 'diagnostic', line, message });
    postMessage({ type: 'done', exitCode });
  } catch (error) {
    postMessage({ type: 'failed', message: `Python stopped working: ${error.message}` });
  }
}

onmessage = ({ data }) => {
  if (data.type === 'start') start(data.sharedMemory);
  else if (data.type === 'run') run(data.source);
};
