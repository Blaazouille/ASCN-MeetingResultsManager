# Conventions — Style, Patterns & Documentation

## One Pattern, One Place

Establish canonical implementations early and document them here or in a `CONVENTIONS.md` at the repo root:

- "This is how we do API calls."
- "This is our error-handling pattern."
- "This is how a component/service is structured."

Point the AI at these references explicitly on every task. Without this, AI will invent five approaches to the same problem across five prompts.

## Conventional Style Over Clever Style

- Follow the existing codebase's naming, folder structure, error handling, and logging format.
- Do not introduce new patterns where existing ones already serve.
- Avoid unnecessary abstractions "for flexibility."
- Avoid overly generic solutions to specific problems.
- When in doubt, match what's already there — even if the textbook says otherwise.

## Mandatory Inline Context

Every non-obvious design choice needs a short comment explaining **why**, not just what.
AI can confidently produce working code for the wrong reason — future maintainers need the intent trail.

## File Header Rule

Every file must carry a header comment or docstring answering:

1. What is this file's single responsibility?
2. Who calls it / what calls it?
3. What would break if you deleted it?

If the AI can't answer #3, the file may not need to exist.

## Iterate, Don't Regenerate

When AI output isn't right, fix it incrementally.
Re-generating from scratch trains you to treat code as disposable, which kills ownership.
Editing forces you to read it, understand it, make it yours.
