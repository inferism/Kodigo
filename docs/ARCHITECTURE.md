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

- **Home:** The title and short description, with the available languages below when you scroll. Java is the only one for now.
- **Compiler:** The editor, output panel and guide buttons for the chosen language.

## Runner contract

The UI talks to every language through this shape. It's a draft, and the Phase 0 spike may change it.

```ts
interface Runner {
  id: string;                  // "java"
  label: string;               // "Java"

  // Download what the runner needs. Runs once, and reports progress.
  load(onProgress: (percent: number) => void): Promise<void>;

  // Compile if needed, then run.
  run(source: string, io: {
    onStdout: (text: string) => void;
    onStderr: (text: string) => void;
    onDiagnostic: (error: { line: number; message: string }) => void;
    readInput: () => Promise<string>;
  }): Promise<{ exitCode: number }>;

  // Kill the running program. Must work on an infinite loop.
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
| Java first with CheerpJ | Java is the owner's chosen starting language, and CheerpJ runs it with no card. Tested on localhost. The Vercel test is still to come. |
| Accept a 15 to 36 second first run | The owner accepted this on 2026-11-06, with later runs taking about 3 seconds. |
| Run CheerpJ in a Web Worker | It's the only tested way to stop a silent infinite loop without freezing the page. |
| Vercel deploys are done by the owner | The owner handles deployment. Claude prepares the code and says what to check. |
| Vercel Hobby for hosting | It's free with no card, deploys from a private repo, and allows custom HTTP headers. Hobby is for non-commercial use, so monetizing would mean revisiting it. |
| Private repo for now | The owner's choice. Keep this in mind for CheerpJ's license, because a private repo can't rely on any open-source terms. |
| Guide buttons are data | New buttons and languages need no UI changes. |
| One runner per language | Languages can be added one at a time without touching the UI. |
| Monaco for the editor | It's free, it's the editor behind VS Code, and it saves building an editor. |

## CheerpJ license

Checked on 2026-11-06 against [cheerpj.com/licensing](https://cheerpj.com/licensing/) and [the licensing docs](https://cheerpj.com/docs/licensing), for CheerpJ 5.0. Those pages have no "last updated" date, so check them again before launch.

Kodigo fits the free Community tier, which covers educational use and software published by one person. No card or account is needed, and the repo can stay private. The tier has these conditions:

- **Load the runtime from the CheerpJ CDN** (`cjrtnc.leaningtech.com`). Self-hosting it, including copying it into this repo, is a paid add-on.
- **Show a "Built with CheerpJ" credit** in the app.
- **Expect a non-commercial licence message** on the CheerpJ display, because the free tier has no licence key.

Selling or charging for the software is commercial use, though a one-person company is still covered by Community. The pages don't say whether ads or donations count, so ask Leaning Technologies before adding either.

## Phase 0 findings

Tested on 2026-11-06 with CheerpJ 5.0 in headless Microsoft Edge on `localhost`. The code is in `spike/`. CheerpJ's docs don't cover `javac`, stdin, stdout capture or stopping a program, so these are test results rather than documented behavior, and a CheerpJ update could change them. Pin the loader version.

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
- **The draft runner contract still fits,** with `stop()` replacing the worker. `load()` has to run again after a stop, so the UI should treat that as a short reload.

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
- **Class names:** The wrapper assumes the class is called `Main`, and a user class called `KodigoRun` would clash with it.
- **Other browsers:** Firefox, Safari and phones weren't tested.

## Open questions

**To answer in Phase 0:**

- Does it work from a Vercel deployment? The owner is testing this. See [Phase 0 findings](#phase-0-findings).
- How large is the first download? It wasn't measured in bytes.

**To decide later:**

- Should guide explanations be in English, Filipino, or both?
- Which code license should Kodigo use? Choose one that doesn't conflict with its dependencies.
