# Architecture

Kodigo is a static website. There is no backend and no database, and all user code runs inside the visitor's browser.

```text
Browser
├── UI: home page, editor, output panel, guide buttons
│     │
│     │  the shared runner contract
│     ▼
└── Runners: one per language
      ├── Java   -> CheerpJ (javac and a JVM in WebAssembly)
      ├── Python -> Pyodide (planned)
      └── C/C++  -> WASM toolchain (planned)

Vercel only serves the static files. It never sees user code.
```

## Pages

- **Home** (`index.html`): The title and short description, with the available languages below when you scroll. The languages come from the list in `src/languages.js`, one `{ id, label, blurb, href }` entry each, so adding a language doesn't change the page's code. Java is the only one for now.
- **Compiler** (`compiler/index.html`): The editor, output panel and guide buttons for the chosen language. The home page links to `/compiler/?lang=java`, where `lang` is the runner's `id`. `src/compiler.js` reads it and falls back to the first language when it's missing or unknown. The editor, the output panel, the Run and Stop buttons and the CheerpJ credit are in. The guide buttons are not built yet. `src/compiler.js` picks the runner from `src/runner-map.js` and the editor's highlighting from `src/editor-languages.js` (one line per language in each, so `compiler.js` itself names no language), starts loading it when the page opens, and shows the percent from `load(onProgress)` in the toolbar. Run is disabled until Java is ready and while a program runs. Stop shows only while a program runs. After a Stop, or after a run fails, the runner restarts itself, so the page calls `load()` again and Run waits for it. Compile errors show as javac's own text in the output panel, followed by one row per error with a "Line N" button. The runner's `onDiagnostic` gives `{ line, message }`, and the page uses it for the rows and for red marks in the editor, so the UI never parses javac's text. Clicking a button moves the cursor to that line and scrolls it into view. The marks clear on the next run or edit, and are skipped if the code changed after Run was clicked, because compiling takes a few seconds. The runner gives line numbers only, so the whole line is marked. A program that reads input fails with a clear message, because typing input is a Phase 2 item. The editor sits on top, with the output panel under it (about 30% of the height). `src/output.js` gives the panel `stdout(text)`, `stderr(text)` and `clear()`, which match the runner contract's `onStdout` and `onStderr`. It shows both streams in one ordered stream, with stderr in red, and always as plain text. It collects output and updates the page once per 16 ms, because checking the scroll position on every write made a 30,000-line burst freeze the tab. It keeps about the last 200,000 characters, so a program that prints forever can't grow the page without limit. Revisit that cap once Stop exists.
- **CheerpJ credit:** CheerpJ's license needs a visible "Built with CheerpJ" credit. It's in the home page footer, and the compiler page needs the same line.

## Runner contract

The UI talks to every language through this shape. The Java runner is in `src/runners/java.js`.

```ts
interface Runner {
  id: string;                  // "java"
  label: string;               // "Java"

  // Download what the runner needs, and resolve when it can run code. Safe to call again.
  // Rejects if the download fails, and calling it again retries.
  // The onProgress callback stays in use, so it also reports reloads after a stop().
  load(onProgress?: (percent: number) => void): Promise<void>;

  // Compile if needed, then run. It waits for load() if needed. It rejects if a run is
  // already active, if the runner fails, or if readInput fails. A compile error is a
  // normal result, not a rejection.
  run(source: string, io: {
    onStdout: (text: string) => void;
    onStderr: (text: string) => void;
    onDiagnostic: (error: { line: number; message: string }) => void;
    readInput: () => Promise<string>;
  }): Promise<{ exitCode: number | null; stopped: boolean }>;

  // Kill the running program. Must work on an infinite loop. A stopped run resolves
  // with { exitCode: null, stopped: true }. The runner restarts itself if it needs to,
  // and a load() still in progress resolves when the restarted runner is ready.
  stop(): void;
}
```

## Guide buttons

Each language has a data file listing its buttons. The UI reads that file, so adding a button means adding data, not code. This shape is a draft:

```json
{
  "id": "for-loop",
  "label": "for loop",
  "category": "Loops",
  "snippet": "for (int i = 0; i < 10; i++) {\n    \n}",
  "explanation": "Repeats the code inside the braces. Here, it runs 10 times."
}
```

Clicking the button inserts `snippet` at the cursor. The dropdown arrow shows `explanation`.

## Decisions

| Decision | Why |
|---|---|
| Run code in the browser | It's free, needs no server to secure, and gives abusers nothing to exploit. |
| Java first with CheerpJ | Java is the owner's chosen starting language, and CheerpJ runs it with no card. Tested on localhost and on a Vercel preview deployment. |
| Accept a 15 to 36 second first run | The owner accepted this on 2026-11-06, with later runs taking about 3 seconds. |
| Run CheerpJ in a Web Worker | It's the only tested way to stop a silent infinite loop without freezing the page. |
| Vercel deploys are done by the owner | The owner handles deployment. Claude prepares the code and says what to check. Vercel redeploys production by itself on every merge to `main`, which the owner confirmed on 2026-11-07 when the merge of PR 21 appeared as a Ready production deployment. |
| Vercel Hobby for hosting | It's free with no card, deploys from a private repo, and allows custom HTTP headers. Hobby is for non-commercial use, so monetizing would mean revisiting it. |
| Private repo for now | The owner's choice. Keep this in mind for CheerpJ's license, because a private repo can't rely on any open-source terms. |
| Guide panel on the right of the editor | The owner's choice, so the editor keeps most of the space. On a laptop it's a fixed width of about 14 to 18rem that can collapse, not a percentage, because 10% is too narrow for labels like `System.out.print` and a dropdown arrow. On a phone it becomes a drawer at the bottom. Phase 3 builds it, and the compiler page's layout already leaves room for it. |
| Guide buttons are data | New buttons and languages need no UI changes. |
| One runner per language | Languages can be added one at a time without touching the UI. |
| Monaco for the editor | It's free, it's the editor behind VS Code, and it saves building an editor. |
| Input is typed in the output panel | The owner wants it to work like a real Java console, not a separate box. Lines typed early wait until the program asks, and `test/runner.html` shows how. |
| Vite as the build tool | Monaco from npm needs a bundler for its editor worker. Vite does this with one import, is MIT licensed, needs no account, and Vercel detects it with no settings. Tested with Monaco and the CheerpJ worker together. |
| No UI framework, plain JS | The UI is a few panels that one small script can drive, and the runner contract is already plain callbacks. A framework would be more for the owner to learn and explain, with nothing to gain yet. Reconsider it if the Phase 3 guide panel gets hard to manage. |

## Build setup

Tested on 2026-11-06 with Vite 8.3.6 and Monaco 0.57.0, on the dev server and on a production build. Pin both versions.

- **Pages:** Use one HTML file per page, so the home page doesn't download Monaco. Vite needs each page listed in `build.rolldownOptions.input` in `vite.config.js`. Tested on 2026-11-07 with the home page and a throwaway `compiler/index.html` that imported Monaco with Java. The build made a separate JS and CSS bundle for each page, and the compiler page came out at `dist/compiler/index.html`. The home page's HTML and the three files it loads (about 1.3 kB of JS and 2.8 kB of CSS, plus a small shared polyfill) don't mention Monaco, and the browser's network log showed no Monaco request. `vite.config.js` now lists both pages, and a listed page that doesn't exist fails the build, so add a page's entry in the same change that creates it. The real compiler page (built 2026-11-07) gave the same result: the home page loads only its own files and a shared 0.9 kB `languages` chunk, with no Monaco request on the dev server or the production build.
- **Monaco imports:** Load only what a language needs. Importing `monaco-editor` itself pulls in every language.

  ```js
  import * as monaco from 'monaco-editor/editor/editor.api';
  import 'monaco-editor/languages/definitions/java/register';
  import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

  self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
  ```

  Older guides use `esm/vs/basic-languages`, which no longer has the Java files.
- **Size:** With Java only, Monaco adds about 2.7 MB of JS (714 kB gzipped), plus a 304 kB worker and 99 kB of CSS. The compiler page's production build matched: 2,705 kB of JS (695 kB gzipped), the 304 kB worker and 100 kB of CSS.
- **CheerpJ worker:** `worker.js`, `kodigo.jar` and `preload.json` live in `public/runners/java/`, so Vite copies them unchanged and the page starts the worker with `new Worker('/runners/java/worker.js')`. The worker needs `importScripts`, which module workers don't have, so don't import it through Vite.
- **Testing the runner:** Run `npm run dev` and open `/test/runner.html`. That page exists only on the dev server.
- **Licence notices:** The build strips the copyright text from the bundled code, and Monaco's MIT licence requires it in what we ship, so `vite.config.js` writes two files into `dist/`, served at `/third-party-licenses.txt` and `/third-party-notices-monaco.txt`. The first is Vite's own list of bundled packages (`build.license`), which only sees Monaco itself. The second is a small plugin that copies Monaco's `ThirdPartyNotices.txt` and DOMPurify's licence from `node_modules` at build time, because Monaco vendors its own copies of those libraries. We use DOMPurify under its Apache License 2.0 option. Found by Codex's phase-end review on 2026-11-07. Checked on a production build and `vite preview`: both files are served as plain text. After adding a dependency that gets bundled, check that its notice shows up. Not covered: CheerpJ, which loads from its CDN and isn't bundled, so its credit in the footer is what the Community licence asks for.
- **DOMPurify warning:** `npm audit` reports a critical issue in Monaco 0.57.0's DOMPurify 3.4.15, and Monaco has its own built-in copy, so an npm override wouldn't change it. The listed issues depend on `IN_PLACE`, `SAFE_FOR_TEMPLATES` or `PARSER_MEDIA_TYPE`, and a search of Monaco's sanitizer found none of them. Don't run `npm audit fix --force`: it installs Monaco 0.56.0, which has an older DOMPurify. Update when a Monaco release includes 3.4.17 or later, and don't pass untrusted Markdown to Monaco until then.

## Tests

Tested on 2026-11-07 with Playwright 1.65.0 (Apache-2.0, free, no account) in Chromium. Run `npx playwright install chromium` once, then `npm test`.

- **What it covers:** `test/execution.spec.js` checks that the editor highlights Java, then runs the four execution cases from CLAUDE.md against the production build: a normal program, a compile error (line number, red mark, and the Line button that jumps to it), a `Scanner` program (today's clean failure, with a pending `test.fixme` for real typed input until Phase 2), and an infinite loop that Stop ends while the page stays responsive, followed by a run that works. The loop program prints a marker first, and the test waits for it, so Stop is never pressed while the program is still compiling.
- **How it works:** `playwright.config.js` builds the site and serves it with `vite preview` on port 4174, one test at a time, with one retry and 2-minute timeouts. The tests share one page, so Java loads once. Code goes into the editor by pasting from the clipboard, because typing fights Monaco's auto-closing brackets, and the page has no test-only hooks.
- **Results:** The suite took 36 to 53 seconds. It passed 6 runs out of 6, 5 of them with retries off, all with CheerpJ's files already cached. A cold first run wasn't measured. Breaking the code on purpose (Stop doing nothing, the Line rows never added, the red marks never set) made the matching test fail each time.
- **Needs internet,** because CheerpJ loads from its CDN. A slow or stalled download can fail a run for reasons unrelated to our code, so rerun before suspecting a bug.
- **No GitHub Actions workflow yet,** so the suite only runs when someone runs `npm test`. Adding one is a separate task. It needs no secrets, but check the fork-PR settings first, since the repo will go public.
- **Still untested:** Firefox, Safari, phones, and the home page.

## CheerpJ license

Checked on 2026-11-06 against [cheerpj.com/licensing](https://cheerpj.com/licensing/) and [the licensing docs](https://cheerpj.com/docs/licensing), for CheerpJ 5.0. Those pages have no "last updated" date, so check them again before launch.

Kodigo fits the free Community tier, which covers educational use and software published by one person. No card or account is needed, and the repo can stay private. The tier has these conditions:

- **Load the runtime from the CheerpJ CDN** (`cjrtnc.leaningtech.com`). Self-hosting it, including copying it into this repo, is a paid add-on.
- **Show a "Built with CheerpJ" credit** in the app.
- **Expect a non-commercial licence message** on the CheerpJ display, because the free tier has no licence key.

Selling or charging for the software is commercial use, though a one-person company is still covered by Community. The pages don't say whether ads or donations count, so ask Leaning Technologies before adding either.

## Phase 0 findings

Tested on 2026-11-06 with CheerpJ 5.0 in headless Microsoft Edge on `localhost`. The owner then confirmed `Scanner`, Stop and compile errors by hand on a Vercel preview deployment, with no `vercel.json` or special headers. The spike's code became the Java runner, and the rest of `spike/` was removed, so see the git history for the original. CheerpJ's docs don't cover `javac`, stdin, stdout capture or stopping a program, so these are test results rather than documented behavior, and a CheerpJ update could change them. Pin the loader version.

**What works:**

- **Java version:** `cheerpjInit({ version: 21 })` runs Java 21.0.13. Java 21 has `javac` built in, so no `tools.jar` is needed.
- **Modern syntax:** Records, switch expressions, text blocks, sealed interfaces and pattern matching all compile and run.
- **Compile errors:** They reach the page with the correct line number.
- **Input and output:** `Scanner` reads live input, including after a prompt with no newline. stdout and stderr arrive separately.
- **Exit codes:** `System.exit(3)` returns 3, and an uncaught exception returns 1.
- **Stopping:** `terminate()` on the Web Worker kills even a silent `while (true)` loop. The next run needs a new worker.
- **HTTP headers:** None are needed. The Range request rule only applies to whoever serves the runtime, which is CheerpJ's CDN.
- **Licence message:** It didn't appear, because it shows on the CheerpJ display and Kodigo doesn't create one.

**How it fits together:**

- **CheerpJ must run in a Web Worker.** On the page's thread, or in an iframe, a silent loop freezes the page. A loop that prints stays responsive, which can hide this bug.
- **Workers have no `#console` element,** so output doesn't reach the page by default.
- **`KodigoRun.java` is a small Java wrapper that solves this.** It runs `javac` through `javax.tools`, replaces `System.in`, `out` and `err`, then starts the user's `Main`. Its native methods are written in JavaScript through the `natives` option of `cheerpjInit`.
- **`stop()` replaces the worker,** and the runner loads Java again on its own. The UI should treat that as a short reload.
- **Real load progress comes from `preloadProgress`.** With the default `status`, `cheerpjInit` finishes before the preload does, so `worker.js` waits for 100% before it reports ready. Adding `status: 'none'` makes `cheerpjInit` hang after 100%. The docs mention neither, so these are test results.

**Timings across 4 rounds of Hello World on the Worker version:**

| Step | Time |
|---|---|
| First page load, nothing cached | 1.9 to 6.9s |
| First run, nothing cached | 15 to 36s, and one of the 4 passed 90s |
| Next run on the same page | 2.8 to 2.9s |
| First run after Stop | 7.5 to 25s |
| Return visit: page load | 0.08s |
| Return visit: first run | 13 to 32s |

**Speedups added after those timings:** The spike now loads a precompiled `kodigo.jar`, uses `preloadResources` from `preload.json`, and compiles a small class in the background after startup. Rebuild the jar whenever `KodigoRun.java` changes. Each setup below ran 4 times with an empty cache. "Total" is the time from opening the page to the program finishing.

| Setup | Total for each run | Stalled past 90s |
|---|---|---|
| Original | 30, 94, 57, 34s | 0 |
| Precompiled jar | 17, 37s | 2 |
| Jar and preload | 14, 23, 13s | 1 |
| All three, Run clicked as soon as it's enabled | 18, 13, 36s | 1 |
| All three, Run clicked after warm-up ends | 13, 70, 12, 99s | 0 |

- **Warm-up is the main gain.** After it ends, Run took 3.3 to 4.5s in all 4 tests.
- **It doesn't make the download faster.** The warm-up itself took 9 to 95s, so a student who clicks Run early still waits.
- **These are small samples on a CDN whose speed varies,** so treat the jar and preload results as promising rather than proven.

**Speed ideas for later:** Keep one Java process running between compiles, test Java 17 and the `wasmGC` option, cache files with a service worker if the license allows it, keep a spare warmed worker for after Stop, and ask Leaning Technologies whether an open-source Kodigo could self-host for free.

**Known problems:**

- **Slow first runs:** In the runs that were logged, the delay came from slow downloads of `21/lib/modules` from the CDN, while the page stayed responsive. Runs past 90s still happen, and the ones in the speed test weren't logged, so their cause is unconfirmed. Phase 1 needs a clear loading state.
- **Background tabs:** Runs in a hidden Browser pane took minutes or never finished, so don't trust timing from a hidden tab.
- **Stack traces:** They show `Unknown Source` instead of line numbers, even with `-g`.
- **Stalled downloads:** `load()` has no timeout, so a download that stalls without failing leaves the percent stuck. A failed download does reject.
- **Warm-up after ready:** Warm-up can still be running when `load()` resolves, so an early Run can wait on it. How long this takes hasn't been measured in a visible tab.
- **Class names:** The wrapper assumes the class is called `Main`, and a user class called `KodigoRun` would clash with it.
- **Other browsers:** Firefox, Safari and phones weren't tested.

## Open questions

**To answer in Phase 0:**

- How large is the first download? It wasn't measured in bytes.

**To decide later:**

- Should guide explanations be in English, Filipino, or both?
- Which code license should Kodigo use? Choose one that doesn't conflict with its dependencies.
