## Git and GitHub workflow

- Keep `main` as the integration branch; create short-lived branches from an updated `main` and merge them back through pull requests.
- When switching to `main` and pulling from `origin`, delete merged local feature branches and prune their stale `origin/*` tracking refs.
- Name branches with a type and short kebab-case description, for example `feat/editor-toolbar` or `fix/selection-loss`.
- Use Conventional Commit messages for commits, such as `feat: add editor toolbar` or `fix: preserve selection after insertion`.
- Use rebase-and-merge method
- Don't use phase wording inside PRs, branch names or commits, Phases and steps are part of internal emend development plan
- PR title should be a concise, human-readable summary of the change in one line, without any reference to issue numbers or commit hashes.
- PR description sould also be simple bullet points on what is done in it. Apart from this bullet points only more thing can be added which is which issue it closes if there is one. Don't add any bloated information.
- Create github issue which will be closed by the PR that you are creating, and follow the same guidelines as PRs.
- Add as much metadata information you can add for the PR and issue like type, labels, Develpment etc.
