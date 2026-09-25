## Git and GitHub workflow

- Keep `main` as the integration branch; create short-lived branches from an updated `main` and merge them back through pull requests.
- When switching to `main` and pulling from `origin`, delete merged local feature branches and prune their stale `origin/*` tracking refs.
- Name branches with a type and short kebab-case description, for example `feat/editor-toolbar` or `fix/selection-loss`.
- Use Conventional Commit messages for commits, such as `feat: add editor toolbar` or `fix: preserve selection after insertion`.
- Use rebase-and-merge method
- Don't use phase wording inside PRs, branch names or commits, Phases and steps are part of internal emend development plan
