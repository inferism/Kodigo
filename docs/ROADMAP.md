# Roadmap

Work through the phases in order, and turn each checkbox into one GitHub issue. Tick items off as they merge. [WORKFLOW.md](WORKFLOW.md) covers how to do each task.

**Choosing a model:** Default to Sonnet 5.5, which is cheaper on your usage limit. Use Opus 5.5 for tasks with unknowns or design decisions. If Sonnet fails at something twice, switch to Opus.

## Phase 0: Spike

**Goal:** Prove that Java can compile and run in the browser for free. Nothing else gets built until this passes. Spike code can be thrown away.

**Model:** Opus 5.5 for all of this phase. It's full of unknowns.

- [x] Read CheerpJ's current license and docs, and record the findings in [ARCHITECTURE.md](ARCHITECTURE.md)
- [x] One HTML page compiles and runs Hello World with real `javac`
- [x] Output and compile errors reach the page
- [x] A program using `Scanner` can read input
- [x] An infinite loop can be stopped without freezing the tab
- [x] Measure the first load and the compile time
- [x] Confirm that modern syntax works, such as records and switch expressions
- [x] Confirm that it works from a Vercel deployment, not only on localhost

**Pass:** Hello World, compile errors and `Scanner` all work under a free license, with an acceptable load time.

**If it fails:** Stop and rethink with the owner. Don't add a paid service to get around it. The card-free alternatives are weaker, so check their current terms before proposing one.

## Phase 1: Working compiler

**Goal:** Someone can open the site, pick Java, write code, and run it.

**Model:** Sonnet 5.5, except Opus 5.5 for choosing the build tool and for the runner contract and Java runner. Those decisions shape everything after them.

- [x] Choose the build tool and UI framework, if any are needed
- [x] Home page with the title and short description, and a language section below it when you scroll (Java only for now)
- [x] Monaco editor with Java highlighting
- [x] Define the runner contract and build the Java runner
- [x] Output panel with separate stdout and stderr
- [x] Run button and loading progress for the first download
- [x] Compile errors with clickable line numbers
- [x] Deploy to Vercel from the private repo
- [x] Playwright test covering the four execution cases in CLAUDE.md

## Phase 2: Usable every day

**Goal:** A student would choose this for their homework.

**Model:** Sonnet 5.5, except Opus 5.5 for the stop button and `Scanner` input. Both depend on how CheerpJ behaves.

- [x] Stop button
- [ ] Type `Scanner` input directly in the output panel, like a real console, with no separate input box
- [ ] Save the current code in the browser
- [ ] Starter examples
- [ ] Shareable links that keep the code in the URL, with no backend
- [ ] Mobile layout and light and dark themes

## Phase 3: Guide buttons

**Goal:** Deliver the part that makes Kodigo more than another compiler. Users build their project by clicking buttons that insert code, and they can open each button to learn what the code does.

**Model:** Sonnet 5.5 for all of this phase, except Opus 5.5 for defining the guide data format, since every language will reuse it.

- [ ] Define the guide data format
- [ ] Guide panel that shows the buttons for the current language
- [ ] Clicking a button inserts its snippet at the cursor
- [ ] Dropdown arrow on each button that explains the snippet
- [ ] First Java set: `System.out.print`, variables, `Scanner`, `if`, `for`, `while`, methods, arrays
- [ ] Beginner-friendly explanations of common compile errors

## Phase 4: More languages

Add one runner and one guide data file per item. The UI should not need language-specific changes.

**Model:** Sonnet 5.5 for JavaScript and Python. Opus 5.5 for C and C++, because the toolchain setup is harder.

- [ ] JavaScript, using a Web Worker
- [ ] Python, using Pyodide
- [ ] C and C++, using a WASM toolchain

## Not planned

- **Server-side execution:** It needs real sandboxing and hosting, and it conflicts with the free-only rule.
- **Accounts and logins:** They aren't needed until something requires saved data across devices.
- **Monetization:** It could change the CheerpJ license terms, so check those first.
