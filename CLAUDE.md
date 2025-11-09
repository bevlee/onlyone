# OnlyOne Project - Claude Instructions

## Code Change Policy

**CRITICAL**: Do not make any file modifications (Edit, Write, MultiEdit, NotebookEdit) unless explicitly requested by the user.

### Rules:

1. **Always ask permission** before making code changes
2. **Read and analyze** files freely for understanding
3. **Suggest changes** but don't implement them automatically
4. **Wait for explicit approval** with phrases like:
   - "Should I make these changes?"
   - "Would you like me to implement this?"
   - "Shall I proceed with the modifications?"

### Exceptions:

- User says "fix it", "update it", "change it", or similar direct commands
- User explicitly asks to "edit", "modify", "create", or "write" files
- Emergency fixes when user reports errors and asks for help

## Project Context

This is a real-time multiplayer word-guessing game with Docker containerization. Always prioritize understanding the codebase before suggesting modifications.

## Development Partnership

We build production code together. I handle implementation details while you guide architecture and catch complexity early.

**Core Workflow**: Research → Plan → Implement → Validate

Start every feature with: "Let me research the codebase and create a plan before implementing."

1. **Research** - Understand existing patterns and architecture
2. **Plan** - Propose approach and verify with you
3. **Implement** - Build with tests and error handling
4. **Validate** - ALWAYS run formatters, linters, and tests after implementation

## Code Organization

Keep functions small and focused:

- If you need comments to explain sections, split into functions
- Group related functionality into clear packages
- Prefer many small files over few large ones

## Architecture Principles

This is always a feature branch:

- Delete old code completely - no deprecation needed
- No versioned names (processV2, handleNew, ClientOld)
- No migration code unless explicitly requested
- No "removed code" comments - just delete it

Prefer explicit over implicit:

- Clear function names over clever abstractions
- Obvious data flow over hidden magic
- Direct dependencies over service locators

## Maximize Efficiency

**Parallel operations**: Run multiple searches, reads, and greps in single messages

**Multiple agents**: Split complex tasks - one for tests, one for implementation

**Batch similar work**: Group related file edits together

## JavaScript/TypeScript Development Standards

**Required Patterns**:

- Strict types not `any` or `unknown` - types prevent runtime errors
- Promises/async-await for asynchronous operations, not `setTimeout()` - callbacks are unreliable
- Early returns to reduce nesting - flat code is readable code
- Delete old code when replacing - no versioned functions
- `new Error("context", { cause: originalError })` - preserve error chains
- Parameterized tests for complex logic - easy to add test cases
- JSDoc all exported functions and types - documentation prevents misuse

## Problem Solving

**When stuck**: Stop. The simple solution is usually correct.

**When uncertain**: "Let me ultrathink about this architecture."

**When choosing**: "I see approach A (simple) vs B (flexible). Which do you prefer?"

Your redirects prevent over-engineering. When uncertain about implementation, stop and ask for guidance.

## Testing Strategy

Match testing approach to code complexity:

- Complex business logic: Write tests first (TDD)
- Simple CRUD operations: Write code first, then tests
- Hot paths: Add benchmarks after implementation

Always keep security in mind: Validate all inputs, use crypto/rand for randomness, use prepared SQL statements.

**Performance rule**: Measure before optimizing. No guessing.

## Progress Tracking

- TodoWrite for task management
- Clear naming in all code

Focus on maintainable solutions over clever abstractions.
