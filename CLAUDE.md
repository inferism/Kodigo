# Kodigo

A free online compiler with built-in guides, aimed at students. Java comes first, then more languages one at a time. The name is Filipino for "code" and also "cheat sheet".

**Status:** Pre-code. The next step is the Phase 0 spike in [docs/ROADMAP.md](docs/ROADMAP.md).

## Read when relevant

- [docs/ROADMAP.md](docs/ROADMAP.md): phases, current work, and what counts as done
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the app fits together, the runner contract, and decisions made
- [AGENTS.md](AGENTS.md): instructions for Codex, which shares these rules

## Hard constraints

1. **Everything is free.** The owner will not buy anything or enter card details. Never add a service, plan or dependency that needs a card, even if it has a free tier. Ask first if unsure.
2. **User code runs in the browser only.** No backend executes code. Do not send user code to any server. This keeps hosting free and removes the need for a server sandbox.
3. **Check licenses before depending on anything.** CheerpJ in particular has terms that differ for commercial use. See the open questions in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
4. **Secrets stay out of git and out of the client.** Kodigo should not need any secrets in v1. If a task seems to need one, stop and ask.

## Stack

- **Editor:** Monaco Editor
- **Java:** CheerpJ (a JVM compiled to WebAssembly), running real `javac`
- **UI:** Plain HTML, CSS and JS for the spike. A build tool and framework get decided after it passes.
- **Hosting:** GitHub Pages
- **CI and tests:** GitHub Actions and Playwright

Treat anything marked unverified in the docs as a guess until it has been tested. Read the current docs for CheerpJ and Monaco instead of relying on memory.

## Architecture rule

Every language is a **runner** behind one shared contract. The editor, output panel and guides must not contain language-specific logic. Adding a language should mean adding a runner, not changing the UI.

## How to work

The owner has 10 to 20 hours a week, hits AI usage limits, and is still learning backend and DevOps. They plan systems well but can lose track of the code when too many files are generated.

- **Do one issue at a time.** Keep each change under about 300 lines where possible.
- **Build the smallest thing that works.** Avoid abstractions, dependencies and files the current issue doesn't need.
- **Explain every change in plain English:** what changed, why, and how the pieces connect. The owner must be able to explain the code before merging.
- **Stay in scope.** If you spot other work, note it. Don't do it now.
- **Save tokens.** Read only the files the task needs.
- **Don't commit or push unless asked.** The owner decides which branch work goes on.
- **Use regular merges, not squash merges,** so individual commits stay on the contribution graph.
- **Update the docs** when a decision changes or a roadmap item is finished.

## Testing

Run the code in a real browser before calling it done. Passing a build doesn't prove that Java compiled and ran. Say plainly what you tested and what you didn't.

Always check these when touching execution:

- A normal program with output
- A compile error, which should show the correct line number
- A program reading input with `Scanner`
- An infinite loop, which must be stoppable without freezing the page
