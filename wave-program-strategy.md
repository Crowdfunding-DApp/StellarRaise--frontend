# The Wave Program: Contributing to StellarRaise

Welcome to **StellarRaise**! As part of the **Wave Program**, we run structured sprint cycles where maintainers create strictly scoped, actionable issues that contributors can claim, solve, and get rewarded for.

This document outlines the strategy for how we structure work and the types of issues you can expect to find on our board. It serves as a guide for both maintainers creating issues and contributors looking for their next task.

---

## 🌊 How the Wave Program Works

1. **Sprint Scoping:** At the beginning of each cycle, maintainers triage internal tasks and community feedback into well-defined GitHub issues.
2. **Issue Labeling:** Issues are heavily labeled by *type*, *difficulty*, and *domain* (e.g., `good-first-issue`, `frontend`, `soroban-integration`).
3. **Claiming Work:** Contributors find an open issue and assign themselves by commenting, "I'd like to work on this!"
4. **Implementation:** Contributors submit their PR directly addressing the issue. Maintainers review, approve, and merge.
5. **Reward:** Successful contribution points are logged for the cycle.

---

## 🎯 Types of Work We Post

To ensure clear boundaries and successful implementations, we categorize our issues into the following primary buckets:

### 1. 🐛 Bug Fixes (`type: bug`)
These issues address unintended behavior or visual glitches in the existing platform. They are often highly specific and excellent for learning the codebase.
**Examples:**
- *Fix countdown timer displaying negative values when deadline passes.*
- *Prevent pledge modal from closing when clicking inside the input field.*
- *Fix incorrect truncation of Freighter wallet addresses on mobile viewports.*

### 2. ✨ New Features (`type: feature`)
Scoping new functionality. Features are usually broken down into sub-tasks unless they are atomic. They range from pure frontend UI to complex contract interactions.
**Examples:**
- *Implement user profile page to track historically backed campaigns.*
- *Add "Categories" tags and filtering UI to the Campaign Dashboard.*
- *Integrate XBull wallet as an alternative connection provider.*

### 3. 🧠 Smart Contract & Stellar Integration (`type: soroban`, `type: stellar`)
Tasks specifically focused on bridging the Next.js frontend with the Soroban smart contracts or Stellar Horizons API. These require some knowledge of the Stellar ecosystem.
**Examples:**
- *Implement `pledge` transaction signing logic fetching data from the mock Soroban contract.*
- *Fetch real-time XLM conversion rates to display USD equivalent values.*
- *Decode and handle specific Soroban contract error messages gracefully in the UI.*

### 4. 🚀 Performance & Refactoring (`type: optimization`, `type: refactor`)
Issues aimed at improving the speed, maintainability, or accessibility of the codebase without changing the outward user experience.
**Examples:**
- *Migrate all `<img>` tags to Next.js `<Image />` component for automatic optimization.*
- *Abstract repetitive Tailwind card classes into a reusable UI component.*
- *Implement infinite scrolling/pagination for the Campaign Dashboard.*

### 5. 📚 Documentation (`type: docs`)
Critical tasks that help onboard future contributors and explain complex logic. These are perfect entry points for developers new to open source.
**Examples:**
- *Document the `WalletContext` flow and how to implement new providers.*
- *Add inline JSDoc comments to all utility functions in `src/lib/utils.ts`.*
- *Write a comprehensive "Getting Started" guide for local Soroban compilation.*

### 6. 🧪 Testing (`type: tests`)
Issues designed to increase our code coverage and ensure robust deployment.
**Examples:**
- *Write React Testing Library unit tests for the `ProgressBar` component.*
- *Create E2E tests using Cypress for the complete "Connect Wallet to Pledge" flow.*

---

## 🏷️ Difficulty Tags

Maintainers will always attach one of the following tags to help you gauge the effort required:

- **`good-first-issue`**: Tiny scope, isolated impact. Perfect if this is your first time touching Next.js or our repo.
- **`difficulty: medium`**: Requires understanding of multiple components interacting, or basic Stellar/Freighter knowledge.
- **`difficulty: hard`**: Complex architectural changes, deep Soroban contract interactions, or significant performance overhauls. 

*Ready to ride the wave? Check out the [Issues board](https://github.com/Crowdfunding-DApp/StellarRaise-Interface/issues) and filter by labels to get started!*
