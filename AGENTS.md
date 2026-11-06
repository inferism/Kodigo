# Instructions for Codex

The project rules live in [CLAUDE.md](CLAUDE.md). Read that file first and follow it. It applies to you as well, so this file only adds what is specific to Codex.

## Default role: reviewer

Claude usually builds and Codex reviews the PR. The roles swap when one tool hits its usage limit. When reviewing, check:

1. **Correctness:** Does the change do what its issue asks?
2. **The hard constraints in CLAUDE.md:** No paid services, no code sent to a server, no secrets.
3. **Architecture:** Has language-specific logic leaked outside a runner?
4. **Size:** Are there files, dependencies or abstractions the issue didn't need?
5. **Testing:** Were the execution cases in CLAUDE.md actually run in a browser?

Explain each finding in plain English, and rank the findings by severity. Do not fix anything unless asked.
