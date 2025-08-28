# End-to-End Testing Suite

This directory contains a comprehensive end-to-end testing suite for the Campaign Manager application using Playwright.

## Overview

The testing suite covers all major functionality of the Campaign Manager platform:

- **Authentication** - Login, registration, password reset, logout
- **Campaign Management** - CRUD operations, analytics, stream tracking
- **Artist Management** - Discovery, profiles, SoundCloud scraping, AI similarity
- **Email Outreach** - Templates, campaigns, Gmail integration, tracking
- **Financial Tracking** - Transactions, P&L, budgets, forecasting
- **Data Management** - Import/export, backup/restore, data integrity

## Architecture

### Page Object Model
Tests use the Page Object Model pattern for maintainable and reusable test code:

```
tests/
├── page-objects/
│   ├── AuthPage.ts          # Authentication functionality
│   ├── DashboardPage.ts     # Dashboard and navigation
│   ├── CampaignPage.ts      # Campaign management
│   ├── ArtistPage.ts        # Artist management and discovery
│   ├── OutreachPage.ts      # Email outreach system
│   └── FinancialPage.ts     # Financial tracking
├── utils/
│   └── test-helpers.ts      # Common test utilities
├── e2e/
│   ├── auth.spec.ts         # Authentication tests
│   ├── campaigns.spec.ts    # Campaign management tests
│   ├── artists.spec.ts      # Artist management tests
│   ├── outreach.spec.ts     # Outreach system tests
│   ├── financial.spec.ts    # Financial tracking tests
│   ├── data-management.spec.ts  # Data management tests
│   └── complete-workflow.spec.ts # End-to-end workflow tests
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test cleanup
└── playwright.config.ts     # Playwright configuration
```

### Test Configuration

- **Multiple Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Mobile Testing**: Includes mobile viewports (Pixel 5, iPhone 12)
- **Automatic Server Management**: Automatically starts frontend and backend services
- **Screenshots & Videos**: Captures on failure for debugging
- **Comprehensive Reporting**: HTML, JSON, and JUnit reports

## Test User

All tests use the predefined test user:
- **Email**: `benjamin.hausinger@gmail.com`
- **Password**: `TestPassword123!`

Ensure this user exists in your test database with appropriate permissions.

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
pnpm install
```

2. Install Playwright browsers:
```bash
pnpm exec playwright install
```

3. Ensure services are configured:
   - Frontend server on port 3002
   - Backend server on port 5000
   - Database accessible
   - Test user exists

### Run All Tests

```bash
# Run all tests
pnpm test:e2e

# Run tests in headed mode (see browser)
pnpm test:e2e --headed

# Run tests in debug mode
pnpm test:e2e --debug
```

### Run Specific Test Files

```bash
# Authentication tests only
pnpm exec playwright test auth.spec.ts

# Campaign management tests
pnpm exec playwright test campaigns.spec.ts

# Complete workflow tests
pnpm exec playwright test complete-workflow.spec.ts
```

### Run Specific Test Cases

```bash
# Run specific test by name
pnpm exec playwright test --grep "should login with valid credentials"

# Run tests for specific browser
pnpm exec playwright test --project=chromium
```

### Mobile Testing

```bash
# Run tests on mobile browsers
pnpm exec playwright test --project="Mobile Chrome"
pnpm exec playwright test --project="Mobile Safari"
```

## Test Reports

After running tests, reports are available in:

- **HTML Report**: `test-results/playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit Report**: `test-results/results.xml`

View HTML report:
```bash
pnpm exec playwright show-report
```

## Debugging Tests

### Visual Debugging

```bash
# Run with browser UI visible
pnpm exec playwright test --headed

# Run in debug mode with step-by-step execution
pnpm exec playwright test --debug
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots on failure
- Videos of test execution
- Network traces for debugging

Files are saved in `test-results/` directory.

### Test Inspector

Use Playwright's test inspector for debugging:
```bash
pnpm exec playwright test --ui
```

## Test Data Management

### Test Data Generation

The `TestHelpers` class provides utilities for generating test data:

```typescript
const testData = helpers.generateTestData();
// Returns: { email, password, firstName, lastName, campaignName, artistName, description, amount }
```

### Database State

Tests assume a clean database state. Consider:
- Using test database
- Implementing data cleanup in `global-teardown.ts`
- Isolating tests with unique data

## Best Practices

### Writing Tests

1. **Use Page Objects**: Always use page object methods instead of direct Playwright calls
2. **Descriptive Names**: Use clear, descriptive test names
3. **Independent Tests**: Each test should be independent and not rely on others
4. **Proper Assertions**: Use meaningful assertions with clear error messages
5. **Error Handling**: Include proper error handling and cleanup

### Test Organization

1. **Group Related Tests**: Use `test.describe()` to group related functionality
2. **Setup and Teardown**: Use `test.beforeEach()` and `test.afterEach()` appropriately
3. **Test Data**: Generate unique test data to avoid conflicts
4. **API Mocking**: Mock external APIs for reliable testing

### Performance

1. **Parallel Execution**: Tests run in parallel by default
2. **Selective Testing**: Run only necessary tests during development
3. **Resource Management**: Properly clean up resources
4. **Timeout Configuration**: Set appropriate timeouts for operations

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

## Test Coverage

### Feature Coverage

- ✅ **Authentication**: Login, register, password reset, logout
- ✅ **Campaign Management**: CRUD, analytics, associations, stream tracking
- ✅ **Artist Management**: CRUD, search, social profiles, discovery, AI similarity
- ✅ **SoundCloud Integration**: Profile scraping, data extraction
- ✅ **Email Outreach**: Templates, campaigns, Gmail integration, tracking
- ✅ **Financial Tracking**: Transactions, P&L, budgets, forecasting, reports
- ✅ **Data Management**: Import/export, backup/restore, data integrity
- ✅ **Cross-Module Integration**: Data relationships, workflow testing
- ✅ **Error Handling**: Network errors, validation, edge cases
- ✅ **Accessibility**: Keyboard navigation, ARIA labels
- ✅ **Performance**: Large datasets, load testing
- ✅ **Mobile Responsiveness**: Mobile viewport testing

### Browser Coverage

- ✅ **Desktop**: Chrome, Firefox, Safari
- ✅ **Mobile**: Mobile Chrome, Mobile Safari
- ✅ **Cross-Platform**: Windows, macOS, Linux (in CI)

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3002 and 5000 are available
2. **Database Connection**: Verify database is running and accessible
3. **Test User**: Ensure test user exists with correct credentials
4. **Service Dependencies**: Check that all required services are running

### Debug Commands

```bash
# Check Playwright installation
pnpm exec playwright --version

# List available browsers
pnpm exec playwright install --dry-run

# Test configuration
pnpm exec playwright test --list

# Verbose output
pnpm exec playwright test --verbose
```

### Getting Help

1. Check Playwright documentation: https://playwright.dev/
2. Review test logs and error messages
3. Use the test inspector for step-by-step debugging
4. Check network traces for API issues

## Contributing

When adding new tests:

1. Follow the existing page object model pattern
2. Add comprehensive test coverage for new features
3. Update this README if adding new test categories
4. Ensure tests are independent and can run in any order
5. Add appropriate error handling and cleanup
6. Include both positive and negative test cases
7. Test across all supported browsers and viewports

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep Playwright and dependencies up to date
2. **Review Test Coverage**: Ensure new features have test coverage
3. **Performance Monitoring**: Monitor test execution times
4. **Test Data Cleanup**: Regularly clean up test data
5. **Report Analysis**: Review test reports for flaky tests

### Monitoring

- Monitor test execution times for performance regressions
- Track test flakiness and address unstable tests
- Review failure patterns to identify systemic issues
- Update test data and scenarios as the application evolves