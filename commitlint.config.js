// Enforces Conventional Commits locally (commit-msg hook) and in CI (PR title check) so release-please can compute version bumps.
export default { extends: ['@commitlint/config-conventional'] };
