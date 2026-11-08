import * as monaco from 'monaco-editor/editor/editor.api';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { editorLanguages } from './editor-languages.js';
import { languages } from './languages.js';
import { createOutput } from './output.js';
import { runners } from './runner-map.js';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

// shortcut: an unknown or missing ?lang= falls back to the first language; show an error page when more languages exist.
const id = new URLSearchParams(location.search).get('lang');
const language = languages.find((l) => l.id === id) ?? languages[0];

document.getElementById('language-label').textContent = language.label;

await editorLanguages[language.id]?.(); // highlighting has to be registered before the editor is created

monaco.editor.defineTheme('kodigo', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: { 'editor.background': '#0b0e17' }, // matches --bg in compiler.css
});

const editor = monaco.editor.create(document.getElementById('editor'), {
  value: language.starter,
  language: language.monaco,
  theme: 'kodigo',
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 15,
});

// Red marks in the editor for compile errors. They go away on the next run or edit, so they never point at stale lines.
let markers = [];
const setMarkers = () => monaco.editor.setModelMarkers(editor.getModel(), 'kodigo', markers);
const clearMarkers = () => { markers = []; setMarkers(); };
editor.onDidChangeModelContent(clearMarkers);

// version is the editor's version when Run was clicked. Compiling takes a few seconds, so the code may
// have changed since, and old errors must not be drawn on the new code.
function showDiagnostic(error, version) {
  const model = editor.getModel();
  const line = Math.min(error.line, model.getLineCount());
  if (model.getVersionId() === version) {
    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: error.message,
      startLineNumber: line,
      startColumn: 1, // the runner only gives line numbers, so the whole line is marked
      endLineNumber: line,
      endColumn: model.getLineMaxColumn(line),
    });
    setMarkers();
  }
  output.diagnostic(error, () => {
    const target = Math.min(error.line, model.getLineCount());
    editor.revealLineInCenter(target);
    editor.setPosition({ lineNumber: target, column: 1 });
    editor.focus();
  });
}

const output = createOutput(document.getElementById('output'));
document.getElementById('clear-output').onclick = output.clear;

const runner = runners[language.id];
const $ = (id) => document.getElementById(id);
const runButton = $('run');
const stopButton = $('stop');
const bar = $('load-progress');
let loadFailed = false;

function status(text) {
  $('status').textContent = text;
}

// Starts or retries loading. Also used after Stop or a failed run, because the runner restarts itself.
function loadRunner() {
  loadFailed = false;
  runButton.disabled = true;
  runButton.textContent = 'Run';
  status(`Loading ${language.label}…`);
  const onProgress = (percent) => {
    bar.hidden = false;
    bar.value = percent;
    status(`Loading ${language.label}… ${percent}%`);
  };
  return runner.load(onProgress).then(
    () => {
      bar.hidden = true;
      runButton.disabled = false;
      status('Ready');
    },
    (error) => {
      bar.hidden = true;
      loadFailed = true;
      runButton.disabled = false;
      runButton.textContent = 'Try again';
      status(`Couldn't load ${language.label}: ${error.message}`);
    },
  );
}

async function run() {
  runButton.disabled = true;
  stopButton.hidden = false;
  output.clear();
  clearMarkers();
  const version = editor.getModel().getVersionId();
  status('Running…');
  try {
    const { exitCode, stopped } = await runner.run(editor.getValue(), {
      onStdout: output.stdout,
      onStderr: output.stderr,
      onDiagnostic: (error) => showDiagnostic(error, version), // javac's own text also shows in the panel
      // Typing input into the panel is a later item. Failing is better than waiting forever.
      readInput: () => Promise.reject(new Error("This program asks for input, which isn't supported yet.")),
    });
    if (stopped) {
      output.stderr('\nStopped.\n');
      loadRunner(); // Java restarts after a Stop.
    } else {
      runButton.disabled = false;
      status(`Finished, exit code ${exitCode}`);
    }
  } catch (error) {
    output.stderr(`\n${error.message}\n`);
    loadRunner(); // The runner restarts itself after a failure.
  } finally {
    stopButton.hidden = true;
  }
}

runButton.onclick = () => (loadFailed ? loadRunner() : run());
stopButton.onclick = () => runner.stop();
loadRunner();
