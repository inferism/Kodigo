// CheerpJ runs in this worker so a tight loop can't freeze the page. Stop calls terminate().
importScripts('https://cjrtnc.leaningtech.com/5.0/loader.js');

const send = (type, data) => postMessage({ type, ...data });
const OUTPUT = '/files/';
let provideLine;
let wrapperReady = false;

onmessage = async ({ data }) => {
  if (data.type === 'input') provideLine(data.line);
  if (data.type === 'run') send('done', { result: await compileAndRun(data.source) });
};

async function compileAndRun(source) {
  cheerpOSAddStringFile('/str/Main.java', source);

  send('status', { text: 'Compiling…' });
  const t0 = performance.now();
  // The wrapper can't report its own compile errors, but it is known to compile.
  if (!wrapperReady) {
    await cheerpjRunMain('com.sun.tools.javac.Main', OUTPUT, '/str/KodigoRun.java', '-d', OUTPUT);
    wrapperReady = true;
  }
  const compiled = await cheerpjRunMain('KodigoRun', OUTPUT, 'compile');
  const t1 = performance.now();

  let exitCode = compiled;
  if (compiled === 0) {
    send('status', { text: 'Running…' });
    exitCode = await cheerpjRunMain('KodigoRun', OUTPUT);
  }
  return { compiled, exitCode, compileMs: Math.round(t1 - t0), runMs: Math.round(performance.now() - t1) };
}

(async () => {
  const wrapper = await (await fetch('KodigoRun.java')).text();
  const t0 = performance.now();
  await cheerpjInit({
    version: Number(new URLSearchParams(location.search).get('java') ?? 21),
    status: 'none',
    natives: {
      Java_KodigoRun_readLine: async () => {
        send('readLine');
        return new Promise((resolve) => { provideLine = resolve; });
      },
      Java_KodigoRun_write: async (lib, text, isError) => send('print', { text, className: isError ? 'stderr' : 'stdout' }),
    },
  });
  cheerpOSAddStringFile('/str/KodigoRun.java', wrapper);
  send('ready', { ms: Math.round(performance.now() - t0) });
})();
