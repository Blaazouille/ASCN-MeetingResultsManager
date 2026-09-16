# File Hygiene — No God Files, No Dead Code

## God Files

A "god file" is any file that does too much, knows too much, or is the default dumping ground.

### Rules

- **One file = one responsibility.** If you can't summarize it in one sentence, it's doing too much.
- **Hard ceiling: 300 lines.** Enforce with a linter. When approaching the limit, extract — don't append.
- **Never add a second responsibility.** If new logic doesn't fit the file's stated purpose, create a new file with a clear name. Do not ask, just propose the split.

### Warning Signs

AI-generated god files grow through these patterns — refuse them all:

- **"Add it to the utils file"** — utilities must be grouped by domain (`dateUtils`, `formatUtils`), not dumped into one bag.
- **"Put the logic in the main component"** — extract hooks, services, or helpers. The main file orchestrates, it doesn't implement.
- **"Add another case to the switch"** — a growing switch/if-chain signals a need for a strategy pattern or a lookup map.

---

## Dead Code

Dead code is code that exists but is never executed. AI is particularly prone to generating it.

### Rules

- **Zero tolerance.** Dead code is not "kept for later." It lives in version control history. If it's not called, it's deleted.
- **No commented-out blocks.** No `// TODO: maybe use this later`. No unused exports.
- **Automate detection** and fail the build on violations:
  - Unused imports → linter rule (`no-unused-vars` or equivalent)
  - Unused exports → `ts-prune`, `knip`, or equivalent
  - Unreachable code → linter rule (`no-unreachable`)
  - Unused dependencies → `depcheck`, `knip`, or equivalent

### Review Checklist for Dead Code

After AI generates code, specifically check:

- Are all exported functions actually imported somewhere?
- Are all defined props/parameters actually passed by a caller?
- Are there conditional branches that can never trigger?
- Are there imports that were added but never used?

---

## AI Prompt Instruction

Include this in every code-generation prompt:

> Never add logic to an existing file if it would exceed 300 lines or give the file a second responsibility. Propose a new file with a clear name instead.
> Never leave unused imports, variables, functions, or commented-out code. If something is no longer needed, remove it completely.
