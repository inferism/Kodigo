// Compiles C or C++ with clang (YoWASP's build, loaded from jsDelivr) and runs the result. See src/runners/clang.js.
// Messages to the page: progress ({ percent }), ready, print (a batch of { text, isError }), diagnostic ({ line, message }),
// readLine and done ({ exitCode }). The page sends load, run ({ lang, source }) and input ({ line }).
const CLANG_URL = 'https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20542-10/gen/bundle.js';
// YoWASP's libc++ is built without exceptions, so C++ needs -fno-exceptions or even hello world fails to link.
// `try` and `throw` then give a compile error.
const files = { c: ['clang', 'main.c', 'kodigo.c', []], cpp: ['clang++', 'main.cpp', 'kodigo.cpp', ['-fno-exceptions']] };

// Compiled with every program. It turns off stdout's buffer, so `printf("Name: ")` with no newline shows before
// scanf waits. A desktop terminal flushes it before reading, but this C library doesn't. cout uses stdout too.
// The worker still sends output in batches, so this doesn't flood the page.
const UNBUFFER = '#include <stdio.h>\n__attribute__((constructor)) static void kodigo_unbuffer(void) { setvbuf(stdout, NULL, _IONBF, 0); }\n';

const post = (type, data = {}) => postMessage({ type, ...data });
const decoder = new TextDecoder();
const encoder = new TextEncoder();
let clang = null;
let giveLine = null; // Set while the program waits for a line of input.

async function load() {
  const { commands } = await import(/* @vite-ignore */ CLANG_URL);
  // `--version` makes clang fetch and compile all its files now, so the first Run isn't slow.
  await commands.clang(['--version'], {}, {
    stdout: () => {},
    stderr: () => {},
    fetchProgress: ({ totalLength, doneLength }) => post('progress', { percent: Math.floor((doneLength / totalLength) * 100) }),
  });
  clang = commands;
  post('ready');
}

// The program never yields while it runs, so a timer can't send output later: whatever a write doesn't send waits
// until the next write. So each write is sent at once, up to 20 messages per 50 ms. A program printing faster than
// that has its output merged into batches, because one message per line froze the page when a loop printed forever.
// Known limit: after such a burst, the last 50 ms of output can wait until the program writes again or ends.
let batch = [];
let batchSize = 0;
let windowStart = 0;
let sentInWindow = 0;

function sendSoon() {
  const now = performance.now();
  if (now - windowStart > 50) {
    windowStart = now;
    sentInWindow = 0;
  }
  if (sentInWindow < 20) {
    sentInWindow++;
    flush();
  }
}

function print(text, isError) {
  if (!text) return;
  const last = batch[batch.length - 1];
  if (last?.isError === isError) last.text += text;
  else batch.push({ text, isError });
  batchSize += text.length;
  if (batch.length > 1000) batchSize -= batch.shift().text.length; // alternating stdout and stderr can't be merged
  while (batchSize > 200_000 && batch.length) { // keep only the newest text, like the output panel does
    const extra = batchSize - 200_000;
    if (batch[0].text.length > extra) { batch[0].text = batch[0].text.slice(extra); batchSize -= extra; }
    else batchSize -= batch.shift().text.length;
  }
}

function flush() {
  if (batch.length) post('print', { items: batch });
  batch = [];
  batchSize = 0;
}

async function compile(lang, source) {
  const [driver, file, extra, flags] = files[lang];
  let messages = '';
  const collect = (bytes) => { if (bytes) messages += decoder.decode(bytes, { stream: true }); };
  let wasm = null;
  try {
    const out = await clang[driver]([file, extra, '-O1', ...flags, '-o', 'main.wasm'], { [file]: source, [extra]: UNBUFFER }, { stdout: collect, stderr: collect });
    wasm = out['main.wasm'];
  } catch (error) {
    if (!('code' in error)) throw error; // clang itself broke, not the program
  }
  print(messages, true);
  flush(); // before the program starts, which may never write anything
  // clang writes `main.c:3:14: error: expected ';'`. Only errors get a Line button, not warnings.
  for (const [, line, message] of messages.matchAll(/^main\.c(?:pp)?:(\d+):\d+: (?:fatal )?error: (.*)$/gm)) {
    post('diagnostic', { line: Number(line), message });
  }
  return wasm;
}

class Exit { constructor(code) { this.code = code; } }

// The few WASI calls a student's program makes: output, input, the clock, random numbers and exit.
// JSPI (WebAssembly.Suspending) lets reading input wait for the page without SharedArrayBuffer.
const canWait = typeof WebAssembly.Suspending === 'function';

function wasi(getMemory) {
  const view = () => new DataView(getMemory().buffer);
  const bytes = () => new Uint8Array(getMemory().buffer);
  const iovecs = (iovs, count) => Array.from({ length: count }, (_, i) => [view().getUint32(iovs + i * 8, true), view().getUint32(iovs + i * 8 + 4, true)]);
  let unread = new Uint8Array(0); // the rest of the last line typed
  const EBADF = 8;

  async function fdRead(fd, iovs, count, readPtr) {
    if (fd !== 0) return EBADF;
    if (!unread.length) {
      if (!canWait) {
        print('\nReading input needs Chrome or Edge for now. This browser can run C and C++, but not read input.\n', true);
        view().setUint32(readPtr, 0, true); // 0 bytes means the input has ended
        return 0;
      }
      flush(); // so the prompt shows before the page waits
      post('readLine');
      unread = encoder.encode((await new Promise((resolve) => { giveLine = resolve; })) + '\n');
    }
    let total = 0;
    for (const [ptr, len] of iovecs(iovs, count)) {
      const part = unread.subarray(0, len);
      bytes().set(part, ptr);
      unread = unread.subarray(part.length);
      total += part.length;
    }
    view().setUint32(readPtr, total, true);
    return 0;
  }

  return {
    fd_read: canWait ? new WebAssembly.Suspending(fdRead) : fdRead,
    fd_write(fd, iovs, count, writtenPtr) {
      if (fd !== 1 && fd !== 2) return EBADF;
      let total = 0;
      for (const [ptr, len] of iovecs(iovs, count)) {
        print(decoder.decode(bytes().subarray(ptr, ptr + len)), fd === 2);
        total += len;
      }
      view().setUint32(writtenPtr, total, true);
      sendSoon();
      return 0;
    },
    fd_fdstat_get(fd, out) { // stdin, stdout and stderr are terminals (character devices); nothing else is open
      if (fd > 2) return EBADF;
      bytes().fill(0, out, out + 24);
      view().setUint8(out, 2);
      return 0;
    },
    fd_close: () => 0,
    fd_seek: () => 70, // ESPIPE: a terminal can't seek
    fd_prestat_get: () => EBADF, // no folders are shared with the program
    fd_prestat_dir_name: () => EBADF,
    args_sizes_get(argc, size) { view().setUint32(argc, 1, true); view().setUint32(size, 5, true); return 0; },
    args_get(argv, buf) { view().setUint32(argv, buf, true); bytes().set(encoder.encode('main\0'), buf); return 0; },
    environ_sizes_get(count, size) { view().setUint32(count, 0, true); view().setUint32(size, 0, true); return 0; },
    environ_get: () => 0,
    clock_time_get(id, precision, out) {
      const ms = id === 0 ? Date.now() : performance.now(); // 0 is the wall clock, others count from the start
      view().setBigUint64(out, BigInt(Math.round(ms * 1000)) * 1000n, true);
      return 0;
    },
    random_get(ptr, len) {
      for (let i = 0; i < len; i += 65536) crypto.getRandomValues(bytes().subarray(ptr + i, ptr + Math.min(len, i + 65536)));
      return 0;
    },
    proc_exit(code) { throw new Exit(code); },
    sched_yield: () => 0,
  };
}

async function execute(wasm) {
  let memory;
  const calls = wasi(() => memory);
  // A call we didn't write fails with ENOSYS (52) instead of stopping the program from loading.
  const imports = new Proxy(calls, { get: (target, name) => target[name] ?? (() => 52) });
  const { instance } = await WebAssembly.instantiate(wasm, { wasi_snapshot_preview1: imports });
  memory = instance.exports.memory;
  const start = canWait ? WebAssembly.promising(instance.exports._start) : instance.exports._start;
  try {
    await start();
    return 0;
  } catch (error) {
    if (error instanceof Exit) return error.code;
    // A trap, such as dividing by zero or reading outside memory. The browser's message is the best we have.
    print(`\nThe program crashed: ${error.message}\n`, true);
    return 1;
  }
}

// A promise that fails in a worker doesn't reach the page's onerror, so failures are sent as a message.
const fail = (error) => post('failed', { message: error?.message || String(error) });

onmessage = async ({ data }) => {
  if (data.type === 'load') load().catch(fail);
  if (data.type === 'input') { giveLine?.(data.line); giveLine = null; }
  if (data.type === 'run') {
    try {
      const wasm = await compile(data.lang, data.source);
      const exitCode = wasm ? await execute(wasm) : 1;
      flush();
      post('done', { exitCode });
    } catch (error) {
      fail(error);
    }
  }
};
