// Maps a language id to its runner. Adding a language means adding a line here.
import { javaRunner } from './runners/java.js';
import { javascriptRunner } from './runners/javascript.js';
import { cRunner, cppRunner } from './runners/clang.js';

export const runners = { java: javaRunner, javascript: javascriptRunner, c: cRunner, cpp: cppRunner };
