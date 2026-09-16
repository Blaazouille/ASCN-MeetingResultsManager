# Principles — Always Apply

These three rules are non-negotiable. They override any shortcut, any urgency, any convenience.

## 1. Humans own the "what" and "why" — AI owns the "how"

AI compresses the implementation phase, not the thinking phases.
Design, specification, review, and refactoring stay human-driven.

## 2. If nobody can explain it, it doesn't ship

Every piece of AI-generated code must be understood by at least one person before it merges.
"It passes tests" is not sufficient. "I can explain what it does and why" is the bar.

## 3. AI is a pair partner, not a contractor

Work interactively: outline → AI drafts → you review and adjust → AI refines.
Never throw a vague task at AI and rubber-stamp whatever comes back.

---

## Project Instruction Files

This folder contains scoped rule sets. Load only what's relevant to the current task:

| File | When to load |
|---|---|
| `conventions.md` | Any code generation or editing task |
| `file-hygiene.md` | Creating new files, refactoring, or when a file is growing |
| `testing.md` | Writing or reviewing tests |
| `architecture.md` | Adding dependencies, creating new modules, structural decisions |
| `review-checklist.md` | Before any PR or code review |
| `unfamiliar-stack.md` | When the project owner cannot audit the tech directly |
| `prompt-block.md` | Quick-reference rules to paste into any AI session |
