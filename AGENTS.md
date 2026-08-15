## Git and GitHub workflow

- Keep `main` as the integration branch; create short-lived branches from an updated `main` and merge them back through pull requests.
- Name branches with a type, issue number, and short kebab-case description, for example `feat/12-editor-toolbar` or `fix/18-selection-loss`.
- Use Conventional Commit messages for commits, such as `feat: add editor toolbar` or `fix: preserve selection after insertion`.
- Use rebase-and-merge method
- Use GitHub stacked pull requests only when a larger change must be split into dependent pull requests
- Don't use phase wording inside PRs, branch names or commits, Phases and steps are part of internal emend development plan
