import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/java/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { languages } from './languages.js';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

// shortcut: an unknown or missing ?lang= falls back to the first language; show an error page when more languages exist.
const id = new URLSearchParams(location.search).get('lang');
const language = languages.find((l) => l.id === id) ?? languages[0];

document.getElementById('language-label').textContent = language.label;

monaco.editor.defineTheme('kodigo', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: { 'editor.background': '#0b0e17' }, // matches --bg in compiler.css
});

monaco.editor.create(document.getElementById('editor'), {
  value: language.starter,
  language: language.monaco,
  theme: 'kodigo',
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 15,
});
