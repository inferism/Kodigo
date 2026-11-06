// CheerpJ runs in this worker so a tight loop can't freeze the page. Stop calls terminate().
importScripts('https://cjrtnc.leaningtech.com/5.0/loader.js');

const send = (type, data) => postMessage({ type, ...data });
// kodigo.jar is KodigoRun.java, precompiled. Rebuild it when that file changes.
const classpath = '/str/kodigo.jar:/files/';
let provideLine;
let warmup = Promise.resolve();

onmessage = async ({ data }) => {
  if (data.type === 'input') provideLine(data.line);
  if (data.type === 'run') send('done', { result: await compileAndRun(data.source) });
};

function compile(source) {
  cheerpOSAddStringFile('/str/Main.java', source);
  return cheerpjRunMain('KodigoRun', classpath, 'compile');
}

async function compileAndRun(source) {
  const t0 = performance.now();
  send('status', { text: 'Compiling…' });
  await warmup;
  const compiled = await compile(source);
  const t1 = performance.now();

  let exitCode = compiled;
  if (compiled === 0) {
    send('status', { text: 'Running…' });
    exitCode = await cheerpjRunMain('KodigoRun', classpath);
  }
  return { compiled, exitCode, compileMs: Math.round(t1 - t0), runMs: Math.round(performance.now() - t1) };
}

(async () => {
  const jar = await (await fetch('kodigo.jar')).arrayBuffer();
  // preload.json lists the runtime files a compile and run needs, from cjGetRuntimeResources().
  const preloadResources = await (await fetch('preload.json')).json();
  const t0 = performance.now();
  await cheerpjInit({
    version: 21,
    status: 'none',
    preloadResources,
    natives: {
      Java_KodigoRun_readLine: async () => {
        send('readLine');
        return new Promise((resolve) => { provideLine = resolve; });
      },
      Java_KodigoRun_write: async (lib, text, isError) => send('print', { text, className: isError ? 'stderr' : 'stdout' }),
    },
  });
  cheerpOSAddStringFile('/str/kodigo.jar', new Uint8Array(jar));
  send('ready', { ms: Math.round(performance.now() - t0) });

  // Warm up javac in the background so the user's first Run takes about 3 seconds.
  warmup = compile('public class Main {}');
})();
