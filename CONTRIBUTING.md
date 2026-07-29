# Contributing to StellarRaise Frontend

Thank you for your interest in contributing to StellarRaise! Please read this guide fully before opening a branch or submitting a pull request — it will save you (and the reviewers) a lot of back-and-forth.

---

## Table of Contents

1. [The Wave Program](#the-wave-program)
2. [Getting Started](#getting-started)
3. [Commit Convention (Conventional Commits)](#commit-convention-conventional-commits)
4. [Branch Naming](#branch-naming)
5. [Pull Request Guidelines](#pull-request-guidelines)
6. [CI Checks](#ci-checks)
7. [Versioning and Changelog](#versioning-and-changelog)

---

## The Wave Program

StellarRaise runs **The Wave Program** — a structured contributor workflow tied directly to the Issues board.

- Browse open, labelled issues at the [Issues board](https://github.com/Crowdfunding-DApp/StellarRaise-frontend/issues).
- Issues are tagged (`bug`, `feature`, `soroban`, `good-first-issue`, etc.) — pick one that matches your skill level.
- Read the [Wave Program Strategy Document](./wave-program-strategy.md) before claiming an issue.
- Leave a comment on the issue to indicate you are working on it before you open a branch.

---

## Getting Started

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/StellarRaise-frontend.git
cd StellarRaise-frontend

# 2. Install dependencies (Node.js v20+ required)
npm install

# 3. Start the development server
npm run dev
```

Husky will install git hooks automatically on `npm install` via the `prepare` script. These hooks run **commitlint** locally before every commit so you catch convention errors before pushing.

---

## Commit Convention (Conventional Commits)

**This project enforces [Conventional Commits](https://www.conventionalcommits.org/) from the cutover commit introduced in PR #73 onward.** Every commit on a feature branch — and every squash-merge commit message — must follow this format or CI will fail.

### Format

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                                        |
| :--------- | :----------------------------------------------------------------- |
| `feat`     | A new user-facing feature                                          |
| `fix`      | A bug fix                                                          |
| `docs`     | Documentation changes only                                         |
| `style`    | Formatting, whitespace — no logic change                           |
| `refactor` | Code restructuring with no feature addition or bug fix             |
| `perf`     | A change that improves performance                                 |
| `test`     | Adding or updating tests                                           |
| `build`    | Build system or dependency changes (`package.json`, configs)       |
| `ci`       | CI configuration changes (`.github/workflows/`)                    |
| `chore`    | Maintenance tasks that don't touch src or tests                    |
| `revert`   | Reverts a previous commit                                          |

### Breaking Changes

If your commit introduces a **breaking change**, append a `!` after the type/scope **and** add a `BREAKING CHANGE:` footer:

```
feat!: remove deprecated pledge API endpoint

BREAKING CHANGE: The `/api/pledge/v1` endpoint has been removed. Use `/api/pledge/v2` instead.
```

### Rules

- The header line must be **100 characters or fewer**.
- The description must be **lowercase** (no Title Case or ALL CAPS).
- Do not end the subject line with a period.
- Use the **imperative mood**: "add feature" not "added feature".

### Examples

```bash
# Good
feat(pledge): add XLM amount validation before submission
fix(navbar): correct mobile menu z-index overlap
docs(readme): update getting started section for Node 20
ci: add commitlint workflow for PRs
chore: bump eslint-config-next to 16.1.6

# Bad — will be rejected by commitlint
Added new button                   # no type
FEAT: Add new button               # uppercase type
feat: Added new button.            # past tense + trailing period
feat(pledge): this description is way too long and exceeds the one-hundred character hard limit set by the project convention
```

---

## Branch Naming

Use a short, descriptive kebab-case branch name that includes the issue number:

```
<type>/short-description-#<issue-number>
```

Examples:

```
feat/pledge-validation-#12
fix/navbar-mobile-zindex-#5
docs/contributing-guide-#73
ci/semantic-release-#73
```

---

## Pull Request Guidelines

- **One issue per PR.** Do not bundle unrelated changes.
- **Title your PR** using the same Conventional Commits format as a commit subject (e.g. `feat(pledge): add XLM amount validation`). This becomes the squash-merge commit message, so it must also pass commitlint.
- **Fill in the PR template** completely — include the issue it closes, what changed, and how to test it.
- **Keep diffs focused.** Avoid unrelated refactors or whitespace changes that make reviewing harder.
- Request review from at least one maintainer before merging.

---

## CI Checks

Every pull request targeting `main` runs the following checks automatically:

| Check              | Workflow file                          | What it does                                          |
| :----------------- | :------------------------------------- | :---------------------------------------------------- |
| **Lint**           | (existing ESLint step)                 | Runs `npm run lint` against all staged files          |
| **Commit Lint**    | `.github/workflows/commitlint.yml`     | Validates every commit in the PR against the convention |
| **Build**          | (existing build step)                  | Ensures `next build` succeeds                         |

All checks must pass before a PR can be merged. If the commitlint check fails, amend or rebase your commits to fix the messages — do not add a "fix commit message" commit on top.

---

## Versioning and Changelog

StellarRaise uses **[semantic-release](https://semantic-release.gitbook.io/)** to automate version bumps and changelog generation.

- On every merge to `main`, semantic-release analyzes the commit history since the last release.
- It determines the next version number based on commit types:
  - `fix` → **patch** release (e.g. `1.0.1`)
  - `feat` → **minor** release (e.g. `1.1.0`)
  - `BREAKING CHANGE` footer or `!` type → **major** release (e.g. `2.0.0`)
- It updates `CHANGELOG.md`, bumps `package.json`, creates a GitHub Release, and tags the commit — all automatically.

**You do not need to manually update `CHANGELOG.md` or `package.json` version.** Just follow the commit convention and the tooling handles the rest.

> **Historical note:** Commits before PR #73 did not follow Conventional Commits. The automated changelog starts from that cutover point. Earlier history is visible in the git log.
