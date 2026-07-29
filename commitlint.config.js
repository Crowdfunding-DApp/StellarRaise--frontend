/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the conventional types
    "type-enum": [
      2,
      "always",
      [
        "feat",     // A new feature
        "fix",      // A bug fix
        "docs",     // Documentation only changes
        "style",    // Changes that do not affect the meaning of the code (formatting, etc.)
        "refactor", // A code change that neither fixes a bug nor adds a feature
        "perf",     // A code change that improves performance
        "test",     // Adding missing tests or correcting existing tests
        "build",    // Changes that affect the build system or external dependencies
        "ci",       // Changes to our CI configuration files and scripts
        "chore",    // Other changes that don't modify src or test files
        "revert",   // Reverts a previous commit
      ],
    ],
    // Subject must not be empty
    "subject-empty": [2, "never"],
    // Type must not be empty
    "type-empty": [2, "never"],
    // Subject case: allow sentence-case and lower-case
    "subject-case": [
      1,
      "never",
      ["start-case", "pascal-case", "upper-case"],
    ],
    // Max subject line length
    "header-max-length": [2, "always", 100],
  },
};

export default config;
