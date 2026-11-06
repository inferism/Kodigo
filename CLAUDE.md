# Kodigo

A free online compiler with built-in guides, aimed at students. Users pick a language and build what they want with guide buttons: each button inserts a code snippet, such as a `for` loop, and has a dropdown arrow that explains it. Java comes first, then more languages one at a time. The name is Filipino for "code" and also "cheat sheet".

**Status:** Phase 0 passed, on localhost and on Vercel. Phase 1 is next. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Read when relevant

- [docs/ROADMAP.md](docs/ROADMAP.md): phases, current work, and what counts as done
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the app fits together, the runner contract, and decisions made
- [docs/WORKFLOW.md](docs/WORKFLOW.md): the steps for each task, and when Codex reviews
- [AGENTS.md](AGENTS.md): instructions for Codex, which shares these rules

## Hard constraints

1. **Everything is free.** The owner will not buy anything or enter card details. Never add a service, plan or dependency that needs a card, even if it has a free tier. Ask first if unsure.
2. **User code runs in the browser only.** No backend executes code. Do not send user code to any server. This keeps hosting free and removes the need for a server sandbox.
3. **Check licenses before depending on anything.** CheerpJ in particular has terms that differ for commercial use. See the open questions in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
4. **Secrets stay out of git and out of the client.** Kodigo should not need any secrets in v1. If a task seems to need one, stop and ask.

## Keep the repo safe to make public

The repo is private now, but the owner will make it public when Kodigo is finished. Treat it as public already. Commits, issues, PRs and comments will all become visible, and a deleted file stays in git history. Do nothing that could put the owner at risk.

**Never commit or post:**

- `.env` files, API keys, tokens, passwords or service account files
- Personal details, such as phone numbers, addresses, school IDs, or private emails beyond normal git authorship
- Real people's data in tests, seed data or logs
- Screenshots or logs that show private information
- Absolute local paths like `C:\Users\...`
- Copied code or content the license doesn't allow, including textbooks and paid course material
- Third-party files, such as JDK or CheerpJ files, unless their license allows redistribution

**Before every commit:**

- Check the list of staged files and the diff for anything above.
- Use `.gitignore` for `.env*`, `node_modules/`, `.vercel/`, build output and logs. Add it before the first code commit.

**Ask the owner first before:**

- Changing repo visibility or any GitHub or Vercel settings
- Adding analytics, trackers, or anything that collects visitor data
- Adding a GitHub Actions workflow that uses secrets
- Deleting a branch, tag or release, other than merged task branches as [docs/WORKFLOW.md](docs/WORKFLOW.md) describes

**If a secret or personal detail gets committed:** Stop and tell the owner right away. Don't hide it with a follow-up commit, because it stays in history. A leaked key must be replaced, even after it's removed.

**Before the repo goes public, confirm with the owner:**

- [ ] gitleaks finds nothing across the full git history
- [ ] Issues, PRs and comments have been checked for private details
- [ ] A license file is in place, and dependency licenses allow public use
- [ ] GitHub Actions settings are safe for PRs from forks
- [ ] Secret scanning and push protection are turned on

## Stack

- **Editor:** Monaco Editor
- **Java:** CheerpJ (a JVM compiled to WebAssembly), running real `javac`
- **UI:** Plain HTML, CSS and JS for the spike. A build tool and framework get decided after it passes.
- **Hosting:** Vercel free Hobby plan, deployed from the private GitHub repo
- **CI and tests:** GitHub Actions and Playwright

Treat anything marked unverified in the docs as a guess until it has been tested. Read the current docs for CheerpJ and Monaco instead of relying on memory.

## Architecture rule

Every language is a **runner** behind one shared contract, plus a **guide data file** for its buttons. The editor, output panel and guide buttons must not contain language-specific logic. Adding a language should mean adding a runner and a data file, not changing the UI.

## How to work

The owner has 10 to 20 hours a week, hits AI usage limits, and is still learning backend and DevOps. They plan systems well but can lose track of the code when too many files are generated.

- **Do one issue at a time.** Keep each change under about 300 lines where possible.
- **Build the smallest thing that works.** Avoid abstractions, dependencies and files the current issue doesn't need.
- **Explain every change in plain English:** what changed, why, and how the pieces connect. The owner must be able to explain the code before merging.
- **Stay in scope.** If you spot other work, note it. Don't do it now.
- **Save tokens.** Read only the files the task needs.
- **Always commit and push finished work without being asked.** Use the current branch, and check that no secrets are included first. Never force-push, rewrite history or merge unless asked.
- **Use regular merges, not squash merges,** so individual commits stay on the contribution graph.
- **Update the docs** when a decision changes or a roadmap item is finished.

## Testing

Run the code in a real browser before calling it done. Passing a build doesn't prove that Java compiled and ran. Say plainly what you tested and what you didn't.

Always check these when touching execution:

- A normal program with output
- A compile error, which should show the correct line number
- A program reading input with `Scanner`
- An infinite loop, which must be stoppable without freezing the page
