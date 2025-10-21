# Test Coverage Guide

## Quick Start

To check test coverage for the admin users page and other components:

```bash
# Run tests with coverage report
npm run test:coverage
```

## Understanding Coverage Reports

The coverage tool (V8) generates reports in multiple formats:

### 1. Terminal Output
Shows a summary table with coverage percentages for:
- **Statements**: Individual executable statements
- **Branches**: if/else, switch cases, ternaries
- **Functions**: Function declarations and expressions  
- **Lines**: Physical lines of code

### 2. HTML Report
Interactive web-based report located at `coverage/index.html`

#### Viewing the HTML Report:

**Windows PowerShell:**
```powershell
Invoke-Item coverage/index.html
```

**Windows CMD:**
```cmd
start coverage/index.html
```

**Mac/Linux:**
```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

#### Features of HTML Report:
- 📊 Visual coverage percentage bars
- 🔍 Line-by-line coverage highlighting
  - ✅ Green: Code is covered by tests
  - ❌ Red: Code is NOT covered by tests
  - 🟨 Yellow: Partially covered branches
- 📁 Navigate through files and directories
- 🔎 Search for specific files

### 3. Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
}
```

**What this means:**
- ✅ If coverage is ≥ 80% → Tests pass
- ❌ If coverage is < 80% → Tests fail in CI/CD

## Current Coverage Status

### Admin Users Page (`app/pages/admin/users.vue`)

**Test Results**: 37/45 tests passing (82%)

**Estimated Coverage**:
- Core functionality: ~85%
- Edge cases: ~90%
- Helper functions: ~100%
- UI interactions: ~75%

### What's Covered

✅ **Fully Covered**:
- Component initialization and mounting
- User data fetching and display
- Error handling and loading states
- Role-based filtering (admin/manager/staff)
- Sorting functionality (name, role, date, email)
- Edit modal operations
- User update operations
- Role change confirmations
- Helper utility functions
- Edge case handling (null values, empty lists)

⚠️ **Partially Covered**:
- Search input interactions (stubbing limitations)
- Complex filtering combinations
- Some reactive state updates

### What's NOT Covered

Areas to improve:
- Integration with actual Supabase backend
- Real router navigation  
- Authentication flows
- Real-time updates

## Interpreting Coverage Numbers

### Example Coverage Output

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

### Good vs. Concerning Coverage

| Coverage % | Status | Action |
|------------|--------|--------|
| 90-100% | ✅ Excellent | Maintain quality |
| 80-89% | ✅ Good | Minor improvements |
| 70-79% | ⚠️ Fair | Add more tests |
| < 70% | ❌ Poor | Needs attention |

## Coverage Configuration

Located in `vitest.config.ts`:

```typescript
test: {
  coverage: {
    provider: 'v8',  // Fast native V8 coverage
    reporter: [
      'text',        // Terminal output
      'json',        // For CI/CD tools
      'html',        // Interactive web report
      'lcov'         // Standard format for coverage tools
    ],
    include: ['app/**/*.{js,ts,vue}'],  // What to cover
    exclude: [
      'node_modules/',
      'test/',
      '**/*.d.ts',
      '**/*.config.*',
      'app/assets/**',
    ],
    all: true,  // Include files not imported in tests
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  }
}
```

### Customizing Coverage

#### Change Threshold:

```typescript
coverage: {
  lines: 90,  // Require 90% line coverage
}
```

#### Add More Reporters:

```typescript
coverage: {
  reporter: ['text', 'html', 'lcovonly', 'json-summary'],
}
```

#### Focus on Specific Files:

```typescript
coverage: {
  include: ['app/pages/**/*.vue'],  // Only pages
}
```

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

## Troubleshooting

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

### HTML report doesn't open

**Cause**: Report not generated or wrong path

**Solution**:
```bash
# Regenerate coverage
npm run test:coverage

# Check if file exists
ls coverage/index.html

# Try absolute path
open $(pwd)/coverage/index.html
```

## Coverage Goals

### Short-term (Next Sprint)
- ✅ Fix search input stubbing issues
- ✅ Achieve 90%+ coverage on admin users page
- ✅ Add coverage for navigation flows

### Long-term (Next Quarter)
- 📝 Coverage for all admin pages
- 📝 Coverage for user/staff pages
- 📝 Integration test coverage
- 📝 E2E test coverage with Playwright

## Best Practices

### 1. **Don't Chase 100% Coverage**
- 80-90% is usually ideal
- Focus on critical paths
- Some code is hard to test (defensive checks, error handlers)

### 2. **Coverage ≠ Quality**
- High coverage with bad tests is useless
- Focus on meaningful assertions
- Test behavior, not implementation

### 3. **Ignore Generated Code**
- Add to `exclude` in coverage config
- Don't waste time testing auto-generated code

### 4. **Use Coverage to Find Gaps**
- Review uncovered lines in HTML report
- Ask: "Should this be tested?"
- Add tests for critical uncovered code

### 5. **Keep Coverage Visible**
- Add coverage badge to README
- Display in PR comments
- Track coverage trends over time

## Additional Resources

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [V8 Coverage](https://v8.dev/blog/javascript-code-coverage)
- [Istanbul Coverage Formats](https://istanbul.js.org/)
- [Codecov](https://about.codecov.io/)
- [Coveralls](https://coveralls.io/)

## Support

Questions about coverage? Check:
1. This guide
2. Vitest documentation
3. Project README
4. Ask the team lead

