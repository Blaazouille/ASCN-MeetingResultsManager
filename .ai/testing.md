# Testing — Philosophy & Methodology

## Non-Negotiable

No code merges without tests. Period.

## The Circular Reasoning Risk

The biggest danger with AI-generated tests is circular reasoning: the AI writes code, then writes tests confirming what the code **does** rather than what it **should do**.

### Division of Responsibility

| Human defines | AI helps with |
|---|---|
| Acceptance criteria | Test boilerplate and setup |
| Edge cases | Mocking infrastructure |
| Expected behaviors | Repetitive assertion patterns |
| What "correct" means | Generating test variants |

### Human Always Verifies

- Assertions actually match the spec, not the implementation.
- Edge cases are genuinely covered, not just happy paths.
- Test names describe the expected behavior, not the implementation detail.

## Red-Green-Refactor

TDD works even better with AI than without it:

1. **Red:** human writes a failing test (defines the expectation).
2. **Green:** AI generates the implementation that passes it.
3. **Refactor:** human cleans up the AI output.

This keeps the human in the design seat, uses AI where it's strongest (cranking out an implementation that satisfies a contract), and forces a cleanup pass every cycle.

## Spec Before Code

Before asking AI to implement anything, write down:

- What are the inputs?
- What are the expected outputs?
- What are the edge cases?
- What does "done" look like?

This spec is both your test plan and an artifact future maintainers can read independently of the code.
