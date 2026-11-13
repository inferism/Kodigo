// Maps a language id to its runner. Adding a language means adding a line here.
import { javaRunner } from './runners/java.js';
import { javascriptRunner } from './runners/javascript.js';
import { pythonRunner } from './runners/python.js';

export const runners = { java: javaRunner, javascript: javascriptRunner, python: pythonRunner };
