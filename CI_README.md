# CI/CD Pipeline Documentation

This document describes the Continuous Integration and Continuous Deployment setup for the SPM Project Management System.

## Overview

The CI/CD pipeline automates testing, building, and deployment of the application to ensure code quality and reliable releases.

## Current Status

**Note:** CI/CD configuration files are not currently present in the repository. This document serves as a template and guide for setting up CI/CD pipelines.

## Recommended CI/CD Setup

### GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: false

  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
        # Add lint script to package.json if not present

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [test, lint]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: .output
          retention-days: 7

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  before_script:
    - npm ci
  script:
    - npm test
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 1 week
  only:
    - merge_requests
    - main
    - develop

lint:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  before_script:
    - npm ci
  script:
    - npm run lint
  only:
    - merge_requests
    - main
    - develop

build:
  stage: build
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  before_script:
    - npm ci
  script:
    - npm run build
  artifacts:
    paths:
      - .output/
    expire_in: 1 week
  only:
    - main
    - develop

deploy_production:
  stage: deploy
  image: node:${NODE_VERSION}
  before_script:
    - npm install -g vercel
  script:
    - vercel --prod --token $VERCEL_TOKEN
  environment:
    name: production
    url: https://your-app.vercel.app
  only:
    - main
  when: manual
```

## Environment Variables

### Required Secrets

Set these in your CI/CD platform's secret management:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/service role key
- `VERCEL_TOKEN` - Vercel deployment token (if using Vercel)
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### GitHub Actions Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add the required secrets

### GitLab CI Variables

1. Go to Settings → CI/CD → Variables
2. Add the required variables
3. Mark sensitive variables as "Protected" and "Masked"

## Testing in CI/CD

### Test Coverage Thresholds

The pipeline enforces minimum coverage thresholds for all API files (`server/api/**/*.{js,ts}`):
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

If coverage falls below these thresholds, the build will fail.

### Running Tests

Tests are automatically run on:
- Every push to main/develop branches
- Every pull request
- Before deployment

### Test Reports

Coverage reports are generated in multiple formats:
- **LCOV**: For code coverage tools (Codecov, Coveralls)
- **HTML**: For local viewing
- **JSON**: For programmatic access

## Deployment

### Vercel Deployment

If using Vercel:

1. Install Vercel CLI: `npm i -g vercel`
2. Link project: `vercel link`
3. Configure environment variables in Vercel dashboard
4. Set up automatic deployments from GitHub/GitLab

### Manual Deployment

For manual deployments:

```bash
# Build the application
npm run build

# Preview the build
npm run preview

# Deploy (method depends on hosting platform)
```

## Cron Jobs

The application includes a recurring tasks processor that should run daily. Configure this in your deployment platform:

### Vercel Cron Jobs

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/tasks/process-recurring-tasks",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Other Platforms

For other platforms, set up a scheduled job to call:
```
GET https://your-domain.com/api/tasks/process-recurring-tasks
```

Schedule: Daily at midnight (UTC+8 for Singapore timezone)

## Pipeline Stages

### 1. Test Stage

- Run unit tests
- Run regression tests
- Generate coverage reports
- Check coverage thresholds

### 2. Lint Stage

- Run code linter
- Check code formatting
- Validate TypeScript types

### 3. Build Stage

- Install dependencies
- Build application
- Generate production artifacts
- Validate build output

### 4. Deploy Stage

- Deploy to staging (on develop branch)
- Deploy to production (on main branch)
- Run post-deployment checks

## Branch Strategy

### Main Branch
- Production-ready code
- Automatic deployment to production
- Requires passing all tests

### Develop Branch
- Development integration branch
- Automatic deployment to staging
- Requires passing all tests

### Feature Branches
- Individual feature development
- Run tests on pull requests
- No automatic deployment

## Monitoring and Alerts

### Build Status

Monitor build status via:
- GitHub Actions: Repository → Actions tab
- GitLab CI: Project → CI/CD → Pipelines

### Deployment Status

Monitor deployments via:
- Vercel Dashboard
- Platform-specific deployment logs

### Alerts

Set up alerts for:
- Failed builds
- Failed deployments
- Coverage drops below threshold
- Test failures

## Troubleshooting

### Build Failures

**Issue:** Tests failing in CI but passing locally
- **Solution:** Ensure Node.js version matches (use `.nvmrc` or specify in CI config)
- **Solution:** Clear cache and rebuild
- **Solution:** Check environment variables are set correctly

**Issue:** Coverage below threshold
- **Solution:** Add more tests to increase coverage
- **Solution:** Review coverage report to identify gaps

### Deployment Failures

**Issue:** Build succeeds but deployment fails
- **Solution:** Check environment variables in deployment platform
- **Solution:** Verify deployment platform configuration
- **Solution:** Check build artifacts are generated correctly

**Issue:** Environment variables not available
- **Solution:** Ensure secrets are set in CI/CD platform
- **Solution:** Verify secret names match configuration
- **Solution:** Check secret permissions

## Best Practices

1. **Always test before merging**: Ensure all tests pass locally
2. **Keep coverage high**: Maintain >80% coverage
3. **Review before deploying**: Use manual approval for production deployments
4. **Monitor builds**: Check build status regularly
5. **Document changes**: Update this document when pipeline changes
6. **Use feature flags**: For gradual rollouts
7. **Rollback plan**: Have a plan to quickly rollback if issues occur

## Future Enhancements

Consider adding:

- **E2E Tests**: Add Playwright/Cypress tests to pipeline
- **Performance Testing**: Add Lighthouse CI for performance metrics
- **Security Scanning**: Add dependency vulnerability scanning
- **Automated Releases**: Automate version bumping and changelog generation
- **Preview Deployments**: Deploy PR previews for review
- **Database Migrations**: Automate database migrations in deployment

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Vitest CI Integration](https://vitest.dev/guide/ci.html)

