Run the following steps to validate and deploy plugins to GitHub Pages via a push to `main`.

1. Run `yarn typecheck`. If it fails, stop and show the TypeScript errors — do not continue.
2. Run `yarn test`. If it fails, stop and show the test failures — do not continue.
3. If both passed, tell the user the checks succeeded and ask for confirmation before pushing.
4. Once confirmed, run `git push origin main`.
5. Report that the deploy is triggered and provide this link to monitor progress: https://github.com/piwa87/arkadia-user-plugins/actions
