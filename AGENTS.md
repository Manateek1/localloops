# Instructions for AI coding agents

## Before changing files

- Read this file and any more specific `AGENTS.md` files that apply to the files you will touch.
- Inspect `git status`, the current branch, and the relevant project files before editing. Treat existing changes as teammate work unless Dillon says otherwise.
- Keep changes limited to the request. Preserve unrelated edits and untracked files. Never use a destructive reset, force push, or silent overwrite to make the checkout look clean.
- Keep credentials, tokens, private keys, and other secrets out of source, examples, logs, screenshots, and commits. Use `.env.local` for local values and keep it untracked.
- Keep demo integrations mocked unless Dillon specifically asks to connect a real service.

## Branches and pull requests

- Never make feature changes directly on `main` or push a feature directly to `main`.
- For new work, use a task-specific branch named `codex/<short-slug>` based on the latest available `main` branch. Refresh the shared remote tracking branch first if needed to make sure the base is current. If the matching task branch already exists, continue on it. Follow Dillon's direct instruction if he explicitly asks you to continue on a named existing branch.
- If the checkout contains unrelated or uncommitted work, do not switch branches, stash, reset, or carry that work into another branch blindly. Use an isolated worktree when available; otherwise ask before disturbing the checkout.
- When a request includes delivery or review, finish the scoped implementation and local verification before opening a **draft** pull request. Push only the task branch. Describe what changed, checks run, and any limits in the PR.
- Never merge a pull request or approve your own work. A person makes the GitHub approval and merge decision. If asked to review a PR, inspect its diff independently and report findings, risks, verification, and a recommendation. A requested separate review can inform the decision; it does not grant the agent merge authority.
- Do not change GitHub repository settings as part of ordinary code work. In particular, an `AGENTS.md` is guidance only; it does not protect `main`.

## Implementation and verification

- Follow the existing project structure and scripts. Explain which checks passed and which could not be run; never claim a check passed unless you ran it.
- For UI changes, verify the rendered result at relevant screen sizes and include screenshots in the pull request.
- Keep demo data and limitations clear. Do not imply that mocked authentication, AI, event search, notifications, or other integrations are live.
