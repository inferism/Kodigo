// Throwaway spike: compile C/C++ with YoWASP clang and run the result with a tiny WASI shim.
// Input uses JSPI (WebAssembly.Suspending), so fd_read can wait for the page without SharedArrayBuffer.
const CLANG = 'https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/bundle.js';

const post = (type, data = {}) => postMessage({ type, ...data });
const decoder = new TextDecoder();
let clangReady = null;
let pendingInput = null;

function loadClang() {
  clangReady ??= import(CLANG).then(async ({ commands }) => {
    // Run once so the wasm and the headers are fetched and compiled before the first real run.
    const t = performance.now();
    try {
      await commands.clang(['clang', '--version'], {}, {
        stdout: () => {}, stderr: () => {},
        fetchProgress: ({ totalLength, doneLength }) => post('progress', { percent: Math.round((doneLength / totalLength) * 100) }),
      });
    } catch {}
    post('log', { text: `clang loaded in ${Math.round(performance.now() - t)} ms` });
    return commands;
  });
  return clangReady;
}

async function compile(lang, source) {
  const commands = await loadClang();
  const [driver, file] = lang === 'cpp' ? ['clang++', 'main.cpp'] : ['clang', 'main.c'];
  const errors = [];
  const t = performance.now();
  let out;
  try {
    out = await commands[driver]([file, '-O1', '-o', 'main.wasm', '-fno-exceptions'], { [file]: source }, {
      stdout: (b) => b && errors.push(decoder.decode(b)),
      stderr: (b) => b && errors.push(decoder.decode(b)),
    });
  } catch (e) {
    post('log', { text: `compile failed (exit ${e.code}) in ${Math.round(performance.now() - t)} ms` });
    return { stderr: errors.join('') || String(e) };
  }
  post('log', { text: `compiled in ${Math.round(performance.now() - t)} ms, ${out['main.wasm'].length} bytes` });
  return { wasm: out['main.wasm'], stderr: errors.join('') };
}

class Exit { constructor(code) { this.code = code; } }

function wasi(getMemory) {
  const view = () => new DataView(getMemory().buffer);
  const bytes = () => new Uint8Array(getMemory().buffer);
  let stdinBuf = new Uint8Array(0);
  const ok = 0, EBADF = 8;
  return {
    args_sizes_get: (argc, size) => { view().setUint32(argc, 1, true); view().setUint32(size, 5, true); return ok; },
    args_get: (argv, buf) => { view().setUint32(argv, buf, true); bytes().set([109, 97, 105, 110, 0], buf); return ok; },
    environ_sizes_get: (c, s) => { view().setUint32(c, 0, true); view().setUint32(s, 0, true); return ok; },
    environ_get: () => ok,
    clock_time_get: (id, prec, out) => { view().setBigUint64(out, BigInt(Math.round(performance.timeOrigin + performance.now())) * 1000000n, true); return ok; },
    random_get: (p, n) => { crypto.getRandomValues(bytes().subarray(p, p + n)); return ok; },
    fd_write: (fd, iovs, n, written) => {
      let total = 0;
      for (let i = 0; i < n; i++) {
        const ptr = view().getUint32(iovs + i * 8, true), len = view().getUint32(iovs + i * 8 + 4, true);
        post('out', { fd, text: decoder.decode(bytes().slice(ptr, ptr + len)) });
        total += len;
      }
      view().setUint32(written, total, true);
      return ok;
    },
    fd_read: new WebAssembly.Suspending(async (fd, iovs, n, read) => {
      if (fd !== 0) return EBADF;
      if (stdinBuf.length === 0) {
        post('readLine');
        const line = await new Promise((r) => { pendingInput = r; });
        stdinBuf = new TextEncoder().encode(line + '\n');
      }
      let total = 0;
      for (let i = 0; i < n && stdinBuf.length; i++) {
        const ptr = view().getUint32(iovs + i * 8, true), len = view().getUint32(iovs + i * 8 + 4, true);
        const take = stdinBuf.subarray(0, len);
        bytes().set(take, ptr);
        stdinBuf = stdinBuf.subarray(take.length);
        total += take.length;
      }
      view().setUint32(read, total, true);
      return ok;
    }),
    fd_fdstat_get: (fd, out) => { if (fd > 2) return EBADF; bytes().fill(0, out, out + 24); view().setUint8(out, 2); return ok; },
    fd_close: () => ok,
    fd_seek: () => 70, // ESPIPE
    fd_prestat_get: () => EBADF,
    fd_prestat_dir_name: () => EBADF,
    proc_exit: (code) => { throw new Exit(code); },
  };
}

async function execute(wasm) {
  let memory;
  const imports = new Proxy(wasi(() => memory), {
    get: (t, k) => t[k] ?? (() => { post('log', { text: `missing WASI call: ${String(k)}` }); return 52; }),
  });
  const { instance } = await WebAssembly.instantiate(wasm, { wasi_snapshot_preview1: imports });
  memory = instance.exports.memory;
  const start = WebAssembly.promising(instance.exports._start);
  try {
    await start();
    return 0;
  } catch (e) {
    if (e instanceof Exit) return e.code;
    post('out', { fd: 2, text: `\n${e}\n` });
    return 1;
  }
}

onmessage = async ({ data }) => {
  if (data.type === 'load') { await loadClang(); post('ready'); }
  if (data.type === 'input') pendingInput?.(data.line);
  if (data.type === 'run') {
    const { wasm, stderr } = await compile(data.lang, data.source);
    if (stderr) post('out', { fd: 2, text: stderr });
    const exitCode = wasm ? await execute(wasm) : 1;
    post('done', { exitCode });
  }
};
