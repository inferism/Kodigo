import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2'; // editor.api leaves out snippets
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { editorLanguages } from './editor-languages.js';
import { guides } from './guide-map.js';
import { showGuide } from './guide-panel.js';
import { languages } from './languages.js';
import { createOutput } from './output.js';
import { runners } from './runner-map.js';
import { currentTheme, setupThemeToggle } from './theme.js';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

// shortcut: an unknown or missing ?lang= falls back to the first language; show an error page when more languages exist.
const id = new URLSearchParams(location.search).get('lang');
const language = languages.find((l) => l.id === id) ?? languages[0];

document.getElementById('language-label').textContent = language.label;

await editorLanguages[language.id]?.(); // highlighting has to be registered before the editor is created

// One editor theme per page theme. The background hex matches --bg in theme.css, so change both together.
monaco.editor.defineTheme('kodigo-dark', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#090d16' } });
monaco.editor.defineTheme('kodigo-light', { base: 'vs', inherit: true, rules: [], colors: { 'editor.background': '#f7f8fc' } });

const editor = monaco.editor.create(document.getElementById('editor'), {
  value: language.starter,
  language: language.monaco,
  theme: `kodigo-${currentTheme()}`,
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 15,
  // shortcut: chosen once when the page opens, so turning a phone sideways doesn't change it. On a narrow screen long lines wrap, because sideways scrolling is hard on a phone.
  wordWrap: matchMedia('(max-width: 47.99rem)').matches ? 'on' : 'off',
});

setupThemeToggle(document.getElementById('theme-toggle'), (theme) => monaco.editor.setTheme(`kodigo-${theme}`));

// Nothing is saved: reopening always shows the starter. So warn before a close or refresh would throw edits away.
// The browser shows its own generic wording, because pages can't set the text.
window.addEventListener('beforeunload', (event) => {
  if (editor.getValue() !== language.starter) event.preventDefault();
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
  const explanation = (guide.errors ?? []).find((e) => e.match.test(error.message))?.explanation;
  output.diagnostic({ ...error, explanation }, () => {
    const target = Math.min(error.line, model.getLineCount());
    editor.revealLineInCenter(target);
    editor.setPosition({ lineNumber: target, column: 1 });
    editor.focus();
  });
}

// The language's guide file: its buttons, its error explanations and, if it has one, placeImports.
// It's loaded once, long before the first click or run, and a failed load just leaves everything empty.
let guideFile;
const loadGuide = guides[language.id] && (() => (guideFile ??= guides[language.id]()));
let guide = {};
loadGuide?.().then((file) => { guide = file; }, () => {});

// Monaco's snippet controller indents each new line like the cursor's line and moves the cursor to $0.
// A button's imports are added by the language's own placeImports, which says where they go, and the editor
// applies that edit without knowing what an import is. A language without one ignores them.
// The snippet goes in first, so the cursor stays put when the import is added above it.
const insertSnippet = (snippet, imports = []) => {
  editor.focus();
  editor.getContribution('snippetController2')?.insert(snippet);
  const edit = imports.length && guide.placeImports?.(editor.getValue(), imports);
  if (!edit) return;
  editor.pushUndoStop();
  editor.executeEdits('kodigo-imports', [{ range: new monaco.Range(edit.row, edit.column, edit.row, edit.column), text: edit.text }]);
  editor.pushUndoStop();
};
showGuide(document.getElementById('guide'), loadGuide, insertSnippet); // not awaited: the guide never delays the editor or the runner

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

// Like a real console: lines typed before the program asks wait until it does.
let typedLines = [];
let giveLine = null;

function readInput() {
  if (typedLines.length) return Promise.resolve(typedLines.shift());
  status('Waiting for input…');
  output.focusInput();
  return new Promise((resolve) => { giveLine = resolve; });
}

function sendLine(line) {
  if (!giveLine) return typedLines.push(line);
  giveLine(line);
  giveLine = null;
  status('Running…');
}

async function run() {
  runButton.disabled = true;
  stopButton.hidden = false;
  output.clear();
  clearMarkers();
  const version = editor.getModel().getVersionId();
  status('Running…');
  typedLines = [];
  giveLine = null;
  output.showInput(sendLine);
  try {
    const { exitCode, stopped } = await runner.run(editor.getValue(), {
      onStdout: output.stdout,
      onStderr: output.stderr,
      onDiagnostic: (error) => showDiagnostic(error, version), // javac's own text also shows in the panel
      readInput,
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
    output.hideInput(); // lines typed but never read are dropped with it
    stopButton.hidden = true;
  }
}

runButton.onclick = () => (loadFailed ? loadRunner() : run());
stopButton.onclick = () => runner.stop();
loadRunner();
