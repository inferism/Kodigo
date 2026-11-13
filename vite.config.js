import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

// Monaco carries its own copies of other libraries, which Vite's licence file can't see. Their notices go in one more file.
// DOMPurify is dual licensed, and we use it under the Apache License 2.0 (its LICENSE file in node_modules is that text).
const monacoNotices = {
  name: 'monaco-notices',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'third-party-notices-monaco.txt',
      source: [
        'Notices for libraries included inside monaco-editor.\n',
        '=== monaco-editor: ThirdPartyNotices.txt ===\n',
        read('./node_modules/monaco-editor/ThirdPartyNotices.txt'),
        '\n=== DOMPurify, (c) Cure53 and other contributors, used under the Apache License 2.0 ===\n',
        read('./node_modules/dompurify/LICENSE'),
      ].join('\n'),
    });
  },
};

// acorn parses JavaScript in the JavaScript runner's worker, and Vite's licence file doesn't see worker bundles.
// Its MIT licence needs its notice in what we ship, so it gets its own file.
const acornNotice = {
  name: 'acorn-notice',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'third-party-notices-acorn.txt', source: read('./node_modules/acorn/LICENSE') });
  },
};

// Python's input() waits on shared memory, which the browser only allows on a "cross-origin isolated" page. That
// needs two headers, and they would stop CheerpJ's CDN files loading on the Java page, so vercel.json sends them
// only for /compiler/?lang=python. The workers' own files need the embedder header too (the page can't use a
// worker that doesn't have it). This does the same for the dev server and for `vite preview`, which the tests use.
// Keep it in step with vercel.json.
const pythonIsolation = {
  name: 'python-isolation',
  configureServer: addIsolation,
  configurePreviewServer: addIsolation,
};

function addIsolation(server) {
  server.middlewares.use((request, response, next) => {
    const url = new URL(request.url, 'http://localhost');
    const isPage = url.pathname.endsWith('/') || url.pathname.endsWith('.html');
    if (isPage && /^\/compiler\//.test(url.pathname) && url.searchParams.get('lang') === 'python') {
      response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    } else if (!isPage) {
      response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // scripts and workers
    }
    next();
  });
}

export default defineConfig({
  plugins: [monacoNotices, acornNotice, pythonIsolation],
  build: {
    // The build strips Monaco's copyright notices, and its MIT licence requires them in what we ship. This writes them out.
    license: { fileName: 'third-party-licenses.txt' },
    rolldownOptions: {
      // One entry per page, so each page only bundles what it imports.
      // Add each new page here.
      input: { main: 'index.html', compiler: 'compiler/index.html' },
    },
  },
});
