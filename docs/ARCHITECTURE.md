# Architecture

Kodigo is a static website. There is no backend and no database, and all user code runs inside the visitor's browser.

```text
Browser
├── UI: editor, output panel, guides
│     │
│     │  the shared runner contract
│     ▼
└── Runners: one per language
      ├── Java   -> CheerpJ (javac and a JVM in WebAssembly)
      ├── Python -> Pyodide (planned)
      └── C/C++  -> WASM toolchain (planned)

GitHub Pages only serves the static files. It never sees user code.
```

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

## Decisions

| Decision | Why |
|---|---|
| Run code in the browser | It's free, needs no server to secure, and gives abusers nothing to exploit. |
| Java first with CheerpJ | Java is the owner's chosen starting language, and CheerpJ looks like the best card-free way to run it. Unverified until Phase 0 passes. |
| GitHub Pages for hosting | Free with no card, and static hosting cannot produce a surprise bill. It needs a public repo on the free plan. |
| One runner per language | Languages can be added one at a time without touching the UI. |
| Monaco for the editor | It's free, it's the editor behind VS Code, and it saves building an editor. |

## Open questions

**To answer in Phase 0:**

- Does CheerpJ's license cover Kodigo? The understanding so far is that it's free for personal, non-commercial and open-source use, and paid for commercial use. Check the current terms, including how the runtime must be loaded.
- How well do `System.in` and `Scanner` work?
- How can a runaway program be stopped? A discardable Web Worker or iframe are the usual options, but CheerpJ may limit which ones work.
- Which Java version does it support?
- How large is the first download, and how long does compiling take?
- Does it need special HTTP headers that GitHub Pages can't set?

**To decide later:**

- Should guides be in English, Filipino, or both?
- Should guides live as Markdown files in this repo?
- Which code license should Kodigo use? Choose one that doesn't conflict with its dependencies.
