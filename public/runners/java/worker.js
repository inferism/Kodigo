// CheerpJ runs in this worker so a tight loop can't freeze the page. Stopping terminates the worker.
// src/runners/java.js is the only file that talks to it.
importScripts('https://cjrtnc.leaningtech.com/5.0/loader.js');

const send = (type, data) => postMessage({ type, ...data });
// kodigo.jar is src/runners/KodigoRun.java, precompiled. Rebuild it when that file changes.
// /files/ is shared by every tab, so this worker compiles into a folder of its own.
const id = crypto.randomUUID();
const classDir = `/files/kodigo/${id}/`;
// This lock is held for the worker's whole life, even while the computer sleeps. The browser releases it
// when the tab closes or the worker stops, which tells other tabs the folder can be deleted.
const lockPrefix = 'kodigo-classes-';
const lockHeld = new Promise((resolve) => {
  navigator.locks.request(lockPrefix + id, () => { resolve(); return new Promise(() => {}); });
});
const classpath = `/str/kodigo.jar:${classDir}`;
const wrapper = 'kodigo.KodigoRun';
let candidates = ''; // Classes that might hold main, from the last compile. KodigoRun picks one.
let provideLine;
let preloaded;
const preload = new Promise((resolve) => { preloaded = resolve; });
let warmup = Promise.resolve();
let compilerOutput = null; // A string while javac runs, so its text can be read for errors.

// A failed async step here would otherwise never reach the page.
onunhandledrejection = ({ reason }) => send('failed', { message: String(reason) });

onmessage = async ({ data }) => {
  if (data.type === 'input') provideLine(data.line);
  if (data.type === 'run') send('done', { exitCode: await compileAndRun(data.source) });
};

// The ids of folders whose worker is still alive, in any tab.
async function liveIds() {
  const { held } = await navigator.locks.query();
  return held.filter(({ name }) => name.startsWith(lockPrefix)).map(({ name }) => name.slice(lockPrefix.length)).join(',');
}

async function compile(source) {
  compilerOutput = '';
  const exitCode = await cheerpjRunMain(wrapper, classpath, 'compile', classDir, await liveIds(), source);
  const output = compilerOutput;
  compilerOutput = null;
  return { exitCode, output };
}

async function compileAndRun(source) {
  await warmup;
  const { exitCode, output } = await compile(source);
  send('compiled', { output });
  return exitCode === 0 ? cheerpjRunMain(wrapper, classpath, 'run', candidates) : exitCode;
}

(async () => {
  await lockHeld; // Before any compile, so no other tab can see this folder without its lock.
  const jar = await (await fetch('kodigo.jar')).arrayBuffer();
  // preload.json lists the runtime files a compile and run needs, from cjGetRuntimeResources().
  const preloadResources = await (await fetch('preload.json')).json();
  await cheerpjInit({
    version: 21,
    preloadResources,
    // Don't add status: 'none'. With preloadProgress, cheerpjInit then never finishes.
    preloadProgress: (done, total) => {
      send('progress', { percent: Math.round((done * 100) / total) });
      if (done === total) preloaded();
    },
    natives: {
      Java_kodigo_KodigoRun_setCandidates: async (lib, classNames) => { candidates = classNames; },
      Java_kodigo_KodigoRun_readLine: async () => {
        send('readLine');
        return new Promise((resolve) => { provideLine = resolve; });
      },
      Java_kodigo_KodigoRun_write: async (lib, text, isError) => {
        if (compilerOutput !== null) compilerOutput += text;
        else send('print', { text, isError });
      },
    },
  });
  cheerpOSAddStringFile('/str/kodigo.jar', new Uint8Array(jar));

  // Warm up javac in the background so the user's first Run takes about 3 seconds.
  warmup = compile('public class Main {}');

  // cheerpjInit finishes before the preload does, so wait for 100% to be truly ready.
  await preload;
  send('ready');
})();
