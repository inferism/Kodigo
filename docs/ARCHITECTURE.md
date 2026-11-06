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
| Java first with CheerpJ | Java is the owner's chosen starting language, and CheerpJ looks like the best card-free way to run it. Unverified until Phase 0 passes. |
| Vercel Hobby for hosting | It's free with no card, deploys from a private repo, and allows custom HTTP headers. Hobby is for non-commercial use, so monetizing would mean revisiting it. |
| Private repo for now | The owner's choice. Keep this in mind for CheerpJ's license, because a private repo can't rely on any open-source terms. |
| Guide buttons are data | New buttons and languages need no UI changes. |
| One runner per language | Languages can be added one at a time without touching the UI. |
| Monaco for the editor | It's free, it's the editor behind VS Code, and it saves building an editor. |

## Open questions

**To answer in Phase 0:**

- Does CheerpJ's license cover Kodigo? The understanding so far is that it's free for personal, non-commercial and open-source use, and paid for commercial use. Check the current terms, including how the runtime must be loaded.
- How well do `System.in` and `Scanner` work?
- How can a runaway program be stopped? A discardable Web Worker or iframe are the usual options, but CheerpJ may limit which ones work.
- Which Java version does it support?
- How large is the first download, and how long does compiling take?
- Does it need special HTTP headers? If so, set them in Vercel's config.

**To decide later:**

- Should guide explanations be in English, Filipino, or both?
- Which code license should Kodigo use? Choose one that doesn't conflict with its dependencies.
