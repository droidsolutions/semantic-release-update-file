# Contribution Guidelines

These are guidelines to help you if you want to contribute to this project. Below explained are some guidelines to follow to keep the project in the same style.

## Commit

This project uses [Commit Lint](https://commitlint.js.org/#/) to enforce a consistent commit message style. Every commit message must begin with a subject like fix, feat, chore, etc, and optional scope in brackets followed by a colon and the commit message. This message style is needed for automatic release (see below).

A typical commit could look like `git commit -m "feat: add special feature" -m "closes #1 and introduces special feature capability to the backend"` or `git commit -m "ci(github): configure github actions"`.

On `npm install` a tool named [Husky](https://github.com/typicode/husky) is installed which is used to distribute git hooks to enforce the commit lint policy or run ESLint on staged files (see below). This prevents you from accidentally making commits that don't apply to the style. To activate those run `npx husky install` the first time you ran `npm install` after cloing the repo.

## Style

This project uses [ESLint](https://eslint.org/) to enforce a certain code style and detect errors in the code. It is feasable to integrate it in your IDE, for example with extensions [like this one for VS Code](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

To enforce consistent code style [Prettier](https://prettier.io/) is used. This will reformat any TypeScript/JavaScript files.

Also [Husky](https://github.com/typicode/husky) is used to set up git hooks to run these tools before commits. Both tools will run as pre-commit hook on staged files. If any ESLint errors occur the commit is aborted and you need to fix them first.

## Release

This project uses (semantic-release)[https://github.com/semantic-release/semantic-release] to automatically determine a new version and update the project accordingly. This is integrated into the CI process and will generate and tag a new container image also.

The release version is determined by analyzing the commits since the last release, commits that start with `fix:` will trigger a patch, commits with `feat:` a minor and commits that contain `BREAKING CHANGE` will trigger a major release.