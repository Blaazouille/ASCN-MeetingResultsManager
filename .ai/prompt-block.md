# Prompt Block — Quick-Reference AI Instructions

Paste the block below into your AI assistant's instructions, project file, or session prompt. It's the compressed version of the full rule set — meant to be loaded on every task.

---

```
## Project Rules — Always Apply

STRUCTURE
- One file = one responsibility. Never exceed 300 lines per file.
- Never add a second responsibility to an existing file. Propose a new file with a clear name instead.
- Follow existing patterns in the codebase. Do not invent new patterns for solved problems.

CLEANLINESS
- Never leave dead code: no unused imports, variables, functions, or commented-out code.
- If something is no longer needed, remove it completely.
- Do not add dependencies without explicit approval.

DOCUMENTATION
- For every non-trivial choice, add a short comment explaining WHY, not just WHAT.
- Every file must have a header comment: what it does, who calls it, what breaks if deleted.

TRANSPARENCY
- When generating code, also provide a plain-language explanation of what it does and why this approach was chosen.
- When making a structural choice, briefly state what alternatives exist and why this one fits better.

TESTING
- All functions must be covered by tests.
- Write tests that verify expected behavior, not implementation details.
- Never write a test that only confirms what the code currently does — test what it should do per the spec.
```

---

## Usage

- **Claude Code / CLAUDE.md** — paste the block into your `CLAUDE.md` at the project root.
- **Cursor / .cursorrules** — paste into `.cursorrules`.
- **GitHub Copilot** — paste into `.github/copilot-instructions.md`.
- **Any chat session** — paste at the start of a conversation or in a system prompt.

## Adapting the Block

- Adjust the 300-line ceiling to match your language and framework conventions.
- Add project-specific conventions (naming patterns, folder structure) directly below the block.
- Keep it under ~30 lines total — longer prompt blocks lose effectiveness.
