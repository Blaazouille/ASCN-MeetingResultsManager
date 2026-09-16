# Review Checklist — PRs, Commits & Code Review

## Before Writing Code

- [ ] Acceptance criteria are written in plain language
- [ ] Inputs, outputs, and edge cases are defined
- [ ] The task is scoped to one logical change
- [ ] The target file/module is identified (no "figure it out" delegation)

## During Code Generation

- [ ] AI is following existing patterns (check `conventions.md`)
- [ ] No file is exceeding the line-count ceiling
- [ ] No new dependencies are added without explicit approval
- [ ] Every file has a header comment stating its purpose

## Before Committing

- [ ] The diff is reviewable — small and single-purpose
- [ ] No dead code: no unused imports, variables, functions, or commented-out blocks
- [ ] No god files: no file has gained a second responsibility
- [ ] Tests exist and assert expected behavior, not just implementation
- [ ] AI-generated explanation is included and makes sense
- [ ] Linter and formatter pass with zero warnings

## PR / Merge Discipline

- **Small, scoped commits.** One logical change per commit. A 2,000-line AI-generated PR is unreviewable.
- **Short-lived branches.** AI produces code fast enough that branches diverge quickly. Merge frequently.
- **Review the diff, not the file.** AI code often looks clean at file level but hides pattern breaks or unnecessary changes that only show in the diff.

## Version Your AI Configuration

If you use structured prompts, system instructions, or AI coding rules (this `.ai/` folder, `.cursorrules`, `CLAUDE.md`, `copilot-instructions.md`), they're checked into the repo. They're part of the development process and a future maintainer needs to understand what shaped the code.

## Refactoring Cadence

AI workflows tend toward additive coding — generating new files rather than refactoring existing ones. Schedule regular passes to:

- [ ] Consolidate duplicated logic
- [ ] Simplify over-abstracted code
- [ ] Remove orphaned files and unused exports
- [ ] Verify the onboarding doc still matches reality
