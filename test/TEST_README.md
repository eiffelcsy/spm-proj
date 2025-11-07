# Test Suite Documentation

## Overview

This directory contains comprehensive test suites for the SPM Project application. The test suite is built using Vitest and Vue Test Utils to ensure code quality and reliability.

## Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run with UI interface
npm run test:ui

# Run regression tests only
npm run test:regression

# Run regression tests in watch mode
npm run test:regression:watch
```

## Test Structure

```
test/
├── unit/                    # Unit tests for individual components
│   ├── admin/              # Admin page tests
│   ├── assignee/          # Assignee functionality tests
│   ├── auth/               # Authentication tests
│   ├── notifications/     # Notification tests
│   ├── projects/           # Project management tests
│   ├── reports/            # Report tests
│   ├── staff/              # Staff management tests
│   ├── task_comments/      # Task comment tests
│   └── tasks/              # Task management tests
├── regression/             # Regression tests for previously fixed bugs
│   ├── tasks/              # Task-related regression tests
│   ├── auth/               # Authentication regression tests
│   └── data-validation/    # Data validation regression tests
└── setup.ts                # Test setup configuration
```

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode (auto-rerun on changes) |
| `npm run test:coverage` | Run tests and generate coverage report |
| `npm run test:ui` | Open interactive test UI (Vitest UI) |
| `npm run test:regression` | Run regression tests only |
| `npm run test:regression:watch` | Run regression tests in watch mode |

## Test Coverage

### Coverage Configuration

Coverage is configured in `vitest.config.ts` with the following targets:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

**Note:** These thresholds apply to all API files in `server/api/**/*.{js,ts}`.

### Coverage Reports

Coverage reports are generated in multiple formats:

- **Text**: Console output
- **HTML**: `coverage/index.html` - Open in browser for interactive report
- **JSON**: `coverage/coverage-final.json` - For CI/CD integration
- **LCOV**: `coverage/lcov.info` - For code coverage tools

### Viewing HTML Coverage Report

After running `npm run test:coverage`, open the HTML report:

```bash
# Windows PowerShell
Invoke-Item coverage/index.html

# Windows CMD
start coverage/index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

The HTML report shows:
- 📊 Coverage percentages for each file
- 🔍 Line-by-line coverage highlighting
- 📁 Directory tree navigation
- ✅ Green = Covered
- ❌ Red = Not covered
- 🟨 Yellow = Partially covered branches

### Interpreting Coverage Numbers

**Example Coverage Output:**
```
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
app/pages/admin/         |         |          |         |        
  users.vue             |   87.5  |    75.0  |   92.3  |   87.5
```

**What this means:**
- **87.5% Statements**: 87.5% of code statements were executed during tests
- **75.0% Branches**: 75% of if/else and conditional branches were tested
- **92.3% Functions**: 92.3% of functions were called in tests
- **87.5% Lines**: 87.5% of code lines were hit by tests

**Coverage Quality Guide:**

| Coverage % | Status | Action |
|------------|--------|--------|
| 90-100% | ✅ Excellent | Maintain quality |
| 80-89% | ✅ Good | Minor improvements |
| 70-79% | ⚠️ Fair | Add more tests |
| < 70% | ❌ Poor | Needs attention |

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import YourComponent from '@/pages/your-component.vue'

// Mock global functions
global.definePageMeta = vi.fn()

// Mock dependencies
vi.mock('#imports', () => ({
  useSupabaseUser: vi.fn(() => ref({ id: 'test-user-id' })),
}))

describe('Your Component', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should do something', async () => {
    const wrapper = mount(YourComponent)
    await flushPromises()
    
    expect(wrapper.exists()).toBe(true)
  })
})
```

### Best Practices

1. **Use descriptive test names**: Clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
3. **Mock external dependencies**: Use `vi.mock()` for API calls and external modules
4. **Async handling**: Always use `await flushPromises()` after async operations
5. **Clean up**: Use `afterEach()` to reset mocks and state
6. **Test user interactions**: Simulate clicks, inputs, and form submissions
7. **Test edge cases**: Include tests for error states, empty data, and boundary conditions

## Mocking Strategies

### Mocking API Calls

```typescript
const mockFetch = vi.fn()
global.$fetch = mockFetch as any

// In test
mockFetch.mockResolvedValueOnce({ data: 'mock data' })
```

### Mocking Nuxt Composables

```typescript
vi.mock('#imports', () => ({
  useSupabaseUser: vi.fn(() => ref({ id: 'test-user-id' })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))
```

### Mocking UI Components

```typescript
vi.mock('@/components/ui/button', () => ({
  Button: { template: '<button><slot /></button>' }
}))
```

## Regression Tests

### Overview

Regression tests verify that previously fixed bugs do not reappear. These tests are critical for maintaining code quality and preventing the reintroduction of known issues.

### Purpose

Regression tests serve a different purpose than unit tests:
- **Unit Tests**: Verify current functionality works correctly
- **Regression Tests**: Verify that previously fixed bugs remain fixed

### Test Categories

#### 1. Task Creation Rollback Tests
**Purpose**: Verify that task creation properly rolls back when errors occur.

**Bugs Fixed**:
- Task created but assignee insert failed → orphaned task
- Subtask creation failed → parent task not cleaned up
- Project member insert failed → task not rolled back

#### 2. Assignee Validation Tests
**Purpose**: Verify assignee validation rules are enforced.

**Bugs Fixed**:
- Tasks created with 0 assignees
- Tasks created with >5 assignees
- Subtasks bypassing assignee validation

#### 3. Cascade Delete Tests
**Purpose**: Verify cascade delete operations work correctly.

**Bugs Fixed**:
- Parent task deleted but subtasks remain
- Task assignees not cleaned up on delete
- Notifications sent for already deleted tasks

#### 4. Authentication/Authorization Tests
**Purpose**: Verify auth checks prevent unauthorized access.

**Bugs Fixed**:
- Unauthenticated users accessing protected endpoints
- Non-admin users accessing admin endpoints
- Staff without records accessing endpoints

#### 5. Data Validation Tests
**Purpose**: Verify input validation prevents invalid data.

**Bugs Fixed**:
- Empty arrays treated as valid
- Null values causing crashes
- Invalid data types accepted

#### 6. Error Handling Tests
**Purpose**: Verify errors are handled gracefully.

**Bugs Fixed**:
- Unhandled promise rejections
- Database errors not properly caught
- Error messages exposing sensitive information

### Adding New Regression Tests

When fixing a bug, add a regression test to prevent it from reappearing:

1. **Identify the bug**: Document what was broken
2. **Create test**: Write a test that would have caught the bug
3. **Verify fix**: Ensure the test passes with the fix
4. **Document**: Add a comment explaining the bug that was fixed

**Example:**

```typescript
/**
 * Regression Test: Task creation rollback on assignee insert failure
 * 
 * Bug: When assignee insert failed, the parent task was not rolled back,
 *      leaving orphaned tasks in the database.
 * 
 * Fixed: Added rollbackParent() function that deletes task and assignees
 *        when validation or insert fails.
 * 
 * Date Fixed: 2024-01-15
 */
it('should rollback parent task when assignee insert fails', async () => {
  // Test implementation
})
```

### Regression Test Best Practices

1. **Document the bug**: Each test should have a comment explaining what bug it prevents
2. **Keep tests focused**: One test per bug scenario
3. **Use descriptive names**: Test names should clearly indicate what bug they prevent
4. **Maintain over time**: Update tests when related code changes
5. **Run regularly**: Include regression tests in CI/CD pipeline

## Known Issues

### Search Input Tests
The search functionality tests currently fail because the stubbed Input component doesn't properly trigger v-model updates. This is a limitation of the test environment, not the actual code.

**Workaround**: Consider using mount instead of shallowMount, or create custom mocks for form inputs.

### Recursive Update Warnings
Some tests trigger "Maximum recursive updates exceeded" warnings. These are caused by reactive loops in the Select component mocks and don't affect the actual application.

**Future Fix**: Implement better Select component mocks with proper v-model handling.

## Troubleshooting

### Tests fail with "definePageMeta is not defined"
Ensure you have this line before importing the component:
```typescript
global.definePageMeta = vi.fn()
```

### Tests timeout
Increase the timeout in vitest.config.ts:
```typescript
test: {
  testTimeout: 10000 // 10 seconds
}
```

### Mock not working
Make sure mocks are defined BEFORE importing the component:
```typescript
vi.mock('#imports', () => ({ ... }))  // Must be first
import Component from '@/pages/component.vue'  // Then import
```

### Coverage shows 0% for a file
**Cause**: File is not imported by any test

**Solution**:
1. Verify the file is in the `include` pattern
2. Ensure there's a test that imports the file
3. Check that `all: true` is set in coverage config

### Coverage report not generated
**Cause**: @vitest/coverage-v8 not installed

**Solution**:
```bash
npm install --save-dev @vitest/coverage-v8
```

### Coverage fails but tests pass
**Cause**: Coverage is below threshold

**Solution**:
1. Add more tests to increase coverage, OR
2. Lower threshold temporarily (not recommended)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests with coverage
        run: npm run test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
```

### GitLab CI Example

```yaml
test:
  stage: test
  script:
    - npm ci
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## Coverage Best Practices

### 1. Don't Chase 100% Coverage
- 80-90% is usually ideal
- Focus on critical paths
- Some code is hard to test (defensive checks, error handlers)

### 2. Coverage ≠ Quality
- High coverage with bad tests is useless
- Focus on meaningful assertions
- Test behavior, not implementation

### 3. Ignore Generated Code
- Add to `exclude` in coverage config
- Don't waste time testing auto-generated code

### 4. Use Coverage to Find Gaps
- Review uncovered lines in HTML report
- Ask: "Should this be tested?"
- Add tests for critical uncovered code

### 5. Keep Coverage Visible
- Add coverage badge to README
- Display in PR comments
- Track coverage trends over time

## Contributing

When adding new features:
1. Write tests BEFORE implementing the feature (TDD)
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Aim for at least 80% coverage on all API files (`server/api/**/*.{js,ts}`)
5. Document any known issues in this README
6. Add regression tests for any bugs you fix

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
