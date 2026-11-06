// CheerpJ runs in this worker so a tight loop can't freeze the page. Stop calls terminate().
importScripts('https://cjrtnc.leaningtech.com/5.0/loader.js');

const send = (type, data) => postMessage({ type, ...data });
const flags = new URLSearchParams(location.search);
const OUTPUT = '/files/';
const useJar = flags.has('jar');
const classpath = useJar ? `/str/kodigo.jar:${OUTPUT}` : OUTPUT;
const javacFlags = flags.has('proc') ? ['-proc:none'] : [];
let provideLine;
let wrapperReady = useJar;
let warmup = Promise.resolve();

onmessage = async ({ data }) => {
  if (data.type === 'input') provideLine(data.line);
  if (data.type === 'run') send('done', { result: await compileAndRun(data.source) });
};

async function compile(source) {
  cheerpOSAddStringFile('/str/Main.java', source);
  // The wrapper can't report its own compile errors, but it is known to compile.
  if (!wrapperReady) {
    await cheerpjRunMain('com.sun.tools.javac.Main', OUTPUT, '/str/KodigoRun.java', '-d', OUTPUT);
    wrapperReady = true;
  }
  return cheerpjRunMain('KodigoRun', classpath, 'compile', ...javacFlags);
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
  if (flags.has('dump')) send('resources', { list: cjGetRuntimeResources() });
  return { compiled, exitCode, compileMs: Math.round(t1 - t0), runMs: Math.round(performance.now() - t1) };
}

(async () => {
  const wrapper = await (await fetch('KodigoRun.java')).text();
  const jar = useJar && await (await fetch('kodigo.jar')).arrayBuffer();
  const preloadResources = flags.has('preload') ? await (await fetch('preload.json')).json() : undefined;
  const t0 = performance.now();
  await cheerpjInit({
    version: Number(flags.get('java') ?? 21),
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
  cheerpOSAddStringFile('/str/KodigoRun.java', wrapper);
  if (jar) cheerpOSAddStringFile('/str/kodigo.jar', new Uint8Array(jar));
  send('ready', { ms: Math.round(performance.now() - t0) });
  if (flags.has('warm')) {
    const t1 = performance.now();
    warmup = compile('public class Main {}');
    await warmup;
    send('warmed', { ms: Math.round(performance.now() - t1) });
  }
})();
