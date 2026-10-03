# Contributing to GreetMe

You do not need to know how to code to suggest an improvement. The team uses a simple path so changes can be tried and reviewed before they reach `main`:

**Issue → AI feature branch → draft pull request → teammate review → human merge**

## Request a feature

1. Open the GreetMe repository on GitHub and select **Issues → New issue → Feature request**.
2. Describe the problem in everyday language. Say who it affects, what a better result would look like, and give one or two examples of how you would use it. Add a screenshot if one helps.
3. Submit the issue. A teammate can clarify the request before implementation starts.

You can also ask Dillon or a teammate to help turn a spoken idea into an issue. Focus on what a person should be able to do; you do not need to suggest code or technical details.

## From idea to `main`

1. An AI coding agent reads the issue and repository instructions, then works on a task branch named `codex/<short-slug>`. It must not make feature changes directly on `main`.
2. The agent finishes the requested change and reports the local checks it ran. For a screen change, it includes screenshots and steps to try it.
3. When the request includes delivery, the agent opens a **draft pull request** and shares its link. A draft means the work is ready for feedback, not approved to merge.
4. A teammate opens the pull request, reads the plain-language summary, checks **Files changed**, tries the preview if one is available, and leaves comments or requests changes. If another review is requested, that reviewer should inspect the diff independently.
5. After a person is satisfied with the changes and GitHub's repository rules are met, a person approves and merges the pull request. Only approved pull requests go into `main`.

AI agents do not approve their own pull requests or merge them. A green check means an automated check passed; it is not the same as a teammate's approval.

## Find a preview and checks

Open the pull request on GitHub. Its **Conversation** tab has the summary and the Vercel preview link. Select **Checks** (or the checks section near the bottom of the conversation) to see the deployment status. Open the preview to try the change. If a check is red, read its message and ask the contributor to fix or explain it.

Vercel creates a preview deployment for pull request branches. The contributor should include screenshots for UI changes and list the local command they ran. The app can also be run locally with `npm install` and `npm run dev`; the terminal prints a local address, usually `http://localhost:5173`.

## Protect `main`

Branch protection is a separate GitHub repository setting. Writing an `AGENTS.md` does **not** block direct pushes or merges to `main` by itself. A repository admin should configure a branch protection rule or ruleset for `main` that:

- requires changes to arrive through a pull request;
- requires one approval from a different teammate;
- requires review conversations to be resolved; and
- prevents force pushes and branch deletion.

Those settings have not been changed as part of this documentation update.
