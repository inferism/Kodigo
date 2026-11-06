# Workflow

Follow this loop for each roadmap checkbox. One or two tasks per session is a good pace. The phases in [ROADMAP.md](ROADMAP.md) say which Claude model to use.

## The loop

1. **Pick one task.** Take the next roadmap checkbox and make it a GitHub issue.
2. **Start fresh.** Open a new chat and create a branch, such as `feature/home-page`.
3. **Plan first.** Ask Claude to explain its approach before writing code. Correct it here, while that's cheap.
4. **Build and test.** Run it in your browser yourself. If it touches running code, check the four cases in [CLAUDE.md](../CLAUDE.md).
5. **Open a PR.** Have Claude open a PR with a plain-English walkthrough.
6. **Review with Codex.** See the next section.
7. **Understand it.** Read the diff. If you can't explain a part, ask before merging.
8. **Merge.** Use a regular merge, not squash. Then tick the roadmap box and delete the branch.

## When Codex reviews

**Review every PR that changes code,** after you've tested it and before you merge. Reviewing untested code wastes your usage limit on problems you'd have found yourself.

1. Point Codex at the PR. It already has its review checklist in [AGENTS.md](../AGENTS.md).
2. Send real problems back to Claude in the same chat, and ignore nitpicks.
3. Review again if the fixes were large. Skip that if they were a line or two.

**Skip Codex for:**

- Docs-only changes and typo fixes
- Throwaway spike code, including Phase 0

**Do a bigger review:**

- At the end of each phase, ask Codex to review the whole codebase for anything that drifted from [CLAUDE.md](../CLAUDE.md).
- Before making the repo public, have it check the git history for secrets.

## When you hit a usage limit

- **Claude runs out:** Let Codex build small tasks, and have Claude review them later.
- **Codex runs out:** Merge only if the PR is small and you understand it. Otherwise, wait.
- **Both run out:** Read code, write the next issues, or test the site by hand.
