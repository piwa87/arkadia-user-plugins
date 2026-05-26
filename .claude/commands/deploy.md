Run the following steps to validate and deploy plugins to GitHub Pages via a push to `main`.

1. Run `git status` to check for uncommitted changes. If there are any, commit them: stage all modified and untracked files, draft a commit message summarising the changes, show it to the user for confirmation, then commit.
2. Run `yarn typecheck`. If it fails, stop and show the TypeScript errors — do not continue.
3. Run `yarn test`. If it fails, stop and show the test failures — do not continue.
4. If both passed, tell the user the checks succeeded and ask for confirmation before pushing.
5. Once confirmed, run `git push origin main`.
6. Report that the deploy is triggered and provide this link to monitor progress: https://github.com/piwa87/arkadia-user-plugins/actions
