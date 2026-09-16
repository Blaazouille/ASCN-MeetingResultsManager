# Unfamiliar Stack — Rules for When You Can't Review the Tech

When the project owner doesn't master the tech stack, the process itself must compensate for what their eyes can't catch.

## Demand Narration, Not Just Code

For every piece of generated code, require a plain-language explanation **alongside** the implementation:

- What does this file/function do?
- Why was this approach chosen over alternatives?
- What are the known limitations or risks?

This narration is your review tool. If the explanation doesn't make sense to you, the code isn't ready.

## Ask for Trade-Off Summaries

Before accepting any structural choice, ask:

> "What are two other ways to do this, and why is this one better for my situation?"

If the AI can't articulate trade-offs, the choice may be arbitrary — and arbitrary choices rot first.

## Validate Through Behavior, Not Reading

When you can't review the code itself, verify through observable behavior:

- Write acceptance criteria in plain language **before** implementation.
- Require demo-able output at every step: run it, see it, click it.
- If you can't see it working, it's not done.

## Enforce Structural Rules Mechanically

Use linters, formatters, and static analysis as your automated reviewers:

- Max file length
- Max function length
- Unused imports and dead exports
- Naming conventions

Configure these once, enforce them always — they're your proxy expertise.

## "Explain Like I'm the Next Developer"

Every file must carry a header comment answering:

1. What is this file's single responsibility?
2. Who calls it / what calls it?
3. What would break if you deleted it?

If the AI can't answer #3, the file may not need to exist.

## Keep a Living Onboarding Doc

Since AI generates code no single person fully authored, the "how this system works" document is the real institutional knowledge. Update it as the system evolves.

**Litmus test:** could a new developer get productive within a reasonable ramp-up using only the docs and the code? If not, you have a transferability problem.

## Periodic Full Audit

Schedule regular reviews (monthly or per milestone):

- Run dead-code detection across the whole project.
- Check file sizes against thresholds.
- Verify the onboarding doc still matches reality.
- Confirm no orphaned files or abandoned patterns exist.
