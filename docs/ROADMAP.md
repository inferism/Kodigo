# Roadmap

Work through the phases in order, and turn each checkbox into one GitHub issue. Tick items off as they merge.

## Phase 0: Spike

**Goal:** Prove that Java can compile and run in the browser for free. Nothing else gets built until this passes. Spike code can be thrown away.

- [ ] Read CheerpJ's current license and docs, and record the findings in [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] One HTML page compiles and runs Hello World with real `javac`
- [ ] Output and compile errors reach the page
- [ ] A program using `Scanner` can read input
- [ ] An infinite loop can be stopped without freezing the tab
- [ ] Measure the first load and the compile time
- [ ] Confirm that modern syntax works, such as records and switch expressions
- [ ] Confirm that it works from GitHub Pages, not only on localhost

**Pass:** Hello World, compile errors and `Scanner` all work under a free license, with an acceptable load time.

**If it fails:** Stop and rethink with the owner. Don't add a paid service to get around it. The card-free alternatives are weaker, so check their current terms before proposing one.

## Phase 1: Working compiler

**Goal:** Someone can open the site, write Java, and run it.

- [ ] Choose the build tool and UI framework, if any are needed
- [ ] Monaco editor with Java highlighting
- [ ] Define the runner contract and build the Java runner
- [ ] Output panel with separate stdout and stderr
- [ ] Run button and loading progress for the first download
- [ ] Compile errors with clickable line numbers
- [ ] Deploy to GitHub Pages through Actions
- [ ] Playwright test covering the four execution cases in CLAUDE.md

## Phase 2: Usable every day

**Goal:** A student would choose this for their homework.

- [ ] Stop button
- [ ] Clear way to enter input for `Scanner` programs
- [ ] Save the current code in the browser
- [ ] Starter examples
- [ ] Shareable links that keep the code in the URL, with no backend
- [ ] Mobile layout and light and dark themes

## Phase 3: Guides

**Goal:** Deliver the part that makes Kodigo more than another compiler. Learners read a short guide and run its examples right there.

- [ ] Decide the guide format and language (see open questions in ARCHITECTURE.md)
- [ ] Guide page with an "Open in editor" button for each example
- [ ] First Java track: output, variables, input, conditions, loops, methods, arrays
- [ ] Beginner-friendly explanations of common compile errors

## Phase 4: More languages

Add one runner per phase item. The UI should not need language-specific changes.

- [ ] JavaScript, using a Web Worker
- [ ] Python, using Pyodide
- [ ] C and C++, using a WASM toolchain

## Not planned

- **Server-side execution:** It needs real sandboxing and hosting, and it conflicts with the free-only rule.
- **Accounts and logins:** They aren't needed until something requires saved data across devices.
- **Monetization:** It could change the CheerpJ license terms, so check those first.
