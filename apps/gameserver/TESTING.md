# Testing Strategy Guide

## Current Test Structure ✅

```
test/
├── unit/                    # Unit tests - test business logic in isolation
│   ├── Room.test.ts        # Test Room model methods
│   └── RoomService.test.ts # Test service layer logic
├── integration/            # Integration tests - test HTTP APIs
│   └── api.test.ts        # Test actual endpoints
└── setup.ts               # Global test configuration
```

## Testing Philosophy

### 1. **Unit Tests** (80% of your tests)

- **What**: Test individual functions/methods in isolation
- **Speed**: Very fast (< 1ms each)
- **Focus**: Business logic, edge cases, error handling
- **Example**: `Room.addPlayer()` should reject when room is full

### 2. **Integration Tests** (20% of your tests)

- **What**: Test complete user journeys through HTTP APIs
- **Speed**: Slower (50-200ms each)
- **Focus**: Critical user flows, API contracts
- **Example**: POST /lobby/rooms → GET /lobby/rooms → POST /room/join

## Current Working Tests

✅ **20 passing tests** covering:

- Room model creation and validation
- Player management (add, remove, ready status)
- Game state transitions (waiting → playing)
- Ownership transfer logic
- JSON serialization

## What Makes Good Tests

### ✅ **Good Unit Test Example**:

```typescript
it("should transfer ownership when owner leaves", () => {
  room.addPlayer({ id: "owner", name: "Alice", isOwner: true, isReady: false });
  room.addPlayer({
    id: "player2",
    name: "Bob",
    isOwner: false,
    isReady: false,
  });

  const result = room.removePlayer("owner");

  expect(result).to.be.true;
  expect(room.players[0].isOwner).to.be.true; // Bob becomes owner
});
```

**Why it's good**:

- Tests one specific behavior
- Clear setup, action, assertion
- Fast execution
- No external dependencies

### ❌ **Bad Test Example** (what we removed):

```typescript
// DON'T DO THIS
function createMockExpressApp() {
  const app = express();
  app.get("/room/status", (req, res) => {
    /* mock implementation */
  });
  return app;
}
```

**Why it's bad**:

- Testing Express framework, not your logic
- Duplicates production code
- Slow and complex
- Breaks when you change frameworks

## Next Steps

### 1. **Add More Unit Tests** (recommended):

```typescript
// test/unit/User.test.ts - Test User model
// test/unit/GameService.test.ts - Test game logic
// test/unit/AuthService.test.ts - Test auth logic
```

### 2. **Add Service Layer Tests**:

```typescript
// When you create RoomService.ts
describe("RoomService", () => {
  it("should create room with unique ID", async () => {
    const room = await roomService.createRoom("Test", "user123");
    expect(room.roomName).to.match(/^room_/);
  });
});
```

### 3. **Add Integration Tests** (sparingly):

```typescript
// Only for critical user journeys
describe("Room Creation Flow", () => {
  it("should allow user to create and join room", async () => {
    // Test complete user journey
  });
});
```

## Testing Commands

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:unit     # Run only unit tests (when you add this script)
npm run test:integration # Run only integration tests (when you add this script)
```

## Key Principles

1. **Test Behavior, Not Implementation** - Test what the function does, not how it does it
2. **Fast Feedback** - Unit tests should run in milliseconds
3. **Clear Names** - Test names should explain the scenario being tested
4. **Arrange, Act, Assert** - Clear test structure
5. **One Assertion Per Test** - Each test should verify one specific behavior

## Red Flags in Tests

❌ **Avoid these patterns**:

- Testing Express/framework code
- Complex test setup that duplicates production code
- Tests that break when you refactor (testing implementation details)
- Slow tests that hit databases or networks in unit tests
- Tests that don't actually test your business logic

## Success Metrics

- **Unit tests**: > 90% coverage of business logic
- **Integration tests**: Cover critical user journeys
- **Speed**: Unit test suite runs in < 100ms
- **Reliability**: Tests pass consistently
- **Maintainability**: Tests are easy to understand and update

---

Your current test suite is a great foundation! Focus on unit testing your domain models and business logic rather than framework integration.
