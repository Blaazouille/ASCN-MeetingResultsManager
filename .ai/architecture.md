# Architecture — Boundaries, Dependencies & AI Ceiling

## Architecture Stays Human-Owned

Use AI for implementation within a decided architecture, not to decide the architecture.

These are deliberate human choices, documented in an ADR or equivalent:

- Module and folder structure
- Data flow patterns
- API contracts and interface shapes
- State management approach
- Error-handling strategy

AI fills in the boxes. Humans draw the boxes.

## Contract-First for Interfaces

Define types, interfaces, API contracts, and data shapes **before** generating implementations.

TypeScript types, OpenAPI specs, JSON schemas, SQL DDL — anything that makes the boundaries machine-checkable. If the AI's output respects the contract, the blast radius of any mistake is contained to the internals.

## Dependency Discipline

AI loves pulling in libraries. Every suggested dependency must be vetted:

- **Maintained?** Check last commit, open issues, bus factor.
- **License compatible?** MIT/Apache are safe; check anything else.
- **Actually needed?** Could 5–20 lines of code replace it?
- **Duplicate?** Does the project already have something that does this?

AI doesn't feel the long-term cost of a dependency. You do.

## AI Ceiling — Where AI Helps vs. Where It's Risky

Make this boundary explicit on your team. Prevent the slow drift toward "just let AI do it" for things that need deep human attention.

| ✅ Good for AI | ⚠️ Needs deep human attention |
|---|---|
| Boilerplate, CRUD operations | Security-sensitive code |
| Data transformations | Performance-critical paths |
| Test scaffolding | Complex state machines |
| Well-understood patterns | Anything touching money |
| UI component wiring | Authentication and access control |
| Documentation drafts | Cryptography and secrets handling |
| Repetitive refactoring | Concurrent/async edge cases |

## Decompose Ruthlessly

Break every feature into the smallest possible units before involving AI.

Not *"build the invoice module"* but *"write the function that calculates VAT from a line-item list."*

Small tasks produce better AI output and result in pieces that are individually reviewable, testable, and replaceable.
