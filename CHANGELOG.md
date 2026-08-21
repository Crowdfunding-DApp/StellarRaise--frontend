# Changelog

All notable changes to **StellarRaise Frontend** will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

# 1.0.0 (2026-08-21)


### Bug Fixes

* **ci:** downgrade Lighthouse accessibility gate to warn ([32b67da](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/32b67da5b05d36c7056d0b31b095afa66fff8468))
* **ci:** skip husky hooks for the semantic-release commit ([3025865](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/30258659abb33259a64144a74fb2f46cfb484841))
* **ci:** stop lighthouse-ci-action's own artifact upload from failing the job ([e79d45d](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/e79d45dbc78eb3e78d23e0c23b464ef07ef200d9))
* correct repo slug in CONTRIBUTING.md and wire RefundModal state in page.tsx ([2ce9cbc](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/2ce9cbcc5372b50c4d1ebc2991f2dbbd202e2765))
* disable GPU for Lighthouse Chrome to fix flaky accessibility category ([0511e8d](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/0511e8d8e16e59cf212b10d5720981d4a6bd14b6))
* merge main into i18n branch, resolve conflicts, and repair broken build ([9038c80](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/9038c80dc8e8c9892bb6f2c928070a737082b8a6))
* raise LCP budget to match actual CI runner performance ([a52cb6b](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/a52cb6b80dde45365ad08a37ac98f5efe3fbbf48))
* regenerate lockfile with Node 20 to match CI's runtime ([8985b5b](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/8985b5b22d2434b834321d086182b6dce0d37bf0))
* repair invalid lighthouserc.json assertion config ([4842969](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/4842969b0742170c59a2f639fc918fea2f5738f0))
* reset PledgeModal state when reopened for a different campaign ([faa2a89](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/faa2a89c1b1d4d1d804c396ba43530672f3fc5ce)), closes [#2](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/2)
* resolve ESLint errors to pass CI ([5d30d27](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/5d30d2748ea55ffcfb7370183acc2a0b863f63e6))
* resolve ESLint errors to pass CI ([ec9aa07](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/ec9aa0711a5973145d2392c7c28f40355788f6eb))
* restore refund modal wiring in page.tsx ([75ef764](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/75ef764b305b60f6aef9ca7796d504daf05915e4))
* split root layout into an (app) route group ([b374a38](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/b374a38fccc7db7ad465e530ef0b01aa79036e72))
* WCAG 2.1 AA audit — contrast, dialog semantics, and label completeness ([89b6f8d](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/89b6f8d31faa34d57fc17231fe089641bce27fca))


### Features

* add full light/dark theme system with FOUC prevention ([2f8826a](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/2f8826a249bd0553abd10451f78d137028b602d3))
* add mobile wallet connection via QR/deep-link fallback ([3bcf7c7](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/3bcf7c76dc4e821476b7bdd7a6915f3542c951a4))
* add owner-gated withdrawal flow for funded campaigns ([6b9d597](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/6b9d597d1fab807fbd8fabf209055a61e2f9985c))
* add pluggable, off-by-default KYC gate to pledge flow ([e5e51ed](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/e5e51ed466d7259f07a4aa260c07e23ab3328318))
* add real-time pledge activity feed (issue [#66](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/66)) ([d4799f5](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/d4799f59229edffef689ad71f9e2284ff57f715b))
* **admin:** add moderation console for campaign review and suspension ([14b0fdc](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/14b0fdc12bcf2f2ecb61a236ebe548d247cc9efd))
* **ci:** add conventional commits, commitlint, husky, and semantic-release ([#73](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/73)) ([4c797ee](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/4c797eed7f8297c89a598af89978f8589d206ea5))
* creator analytics dashboard (Issue [#77](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/77)) ([2b151c1](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/2b151c126f7174fb57b63ad3108edb80c5d4a670)), closes [#4](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/4)
* implement Claim Refund flow for failed campaigns ([#4](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/4)) ([d2615e8](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/d2615e8ed86ec91ca2c56f714f3d3d6dea21af48))
* implement config-driven feature-flag system ([3f3649a](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/3f3649ae4da9c9e31015c4beef5f3747cb731475))
* implement config-driven feature-flag system (Issue 49 indexer migration) ([d09e517](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/d09e51772c87e5f6d92e3d8d1f1da0cf76e07c7c))
* implement performance budget and Lighthouse CI integration (issue [#57](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/57)) ([b3789da](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/b3789dafe789bedd2c3cffdd39f9e1201dc56e71))
* implement virtualized campaign grid for performance optimization ([ddc0055](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/ddc00554d1c3b8bc278dedfc69bc00688ce74638)), closes [#52](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/52)
* improve Navbar accessibility and mobile responsiveness ([#5](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/5)) ([1732c8b](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/1732c8b58e968048f5f4b8ec12c5ce77f0e1dc65))
* introduce i18n with next-intl, RTL support, and locale-aware formatting ([93c76ce](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/93c76cee0923a4b2fa062fd93eb75d8bc60f9e4f))
* **notifications:** opt-in email + extensible notification infrastructure ([84da321](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/84da3210ac4473c4e5ca5a6ac7213320d3d71676)), closes [#78](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/78) [#78](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/issues/78)


### Performance Improvements

* dynamic-import stellar-sdk to cut it from the initial JS payload ([3888a5d](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commit/3888a5d24313330badc8532eabb67ebf25b89376))

# Changelog

All notable changes to **StellarRaise Frontend** will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/) and
[Conventional Commits](https://www.conventionalcommits.org/).

> **Note:** Automated changelog generation begins from the cutover commit
> introduced in this PR. Earlier history follows a non-conventional commit
> style and is not reflected here. See the [git log](https://github.com/Crowdfunding-DApp/StellarRaise--frontend/commits/main)
> for the full project history.

<!-- SEMANTIC-RELEASE-MANAGED — do not edit this file manually below this line -->
