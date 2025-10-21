# GitHub Actions CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing, coverage reporting, and continuous integration.

## 📋 Available Workflows

### 1. **test.yml** - Main Test Suite
**Triggers**: Push and PR to main branches  
**Purpose**: Run comprehensive test suite across multiple Node.js versions

#### What it does:
- ✅ Runs on Node.js 18.x and 20.x
- ✅ Executes all unit tests
- ✅ Generates coverage reports
- ✅ Uploads coverage to Codecov
- ✅ Posts coverage comments on PRs
- ✅ Includes lint and build checks

#### Jobs:
1. **test** - Run tests on multiple Node versions
2. **lint** - Linting checks (placeholder)
3. **build** - Production build verification

---

### 2. **coverage-report.yml** - Detailed Coverage
**Triggers**: Push and PR to main/master  
**Purpose**: Generate detailed coverage reports

#### What it does:
- ✅ Generates comprehensive coverage reports
- ✅ Creates coverage summary in job output
- ✅ Uploads coverage artifacts (30-day retention)
- ✅ Sends coverage to Codecov
- ✅ Warns if coverage drops below 80%

---

### 3. **pr-checks.yml** - PR Validation
**Triggers**: Pull request events  
**Purpose**: Automated PR validation and feedback

#### What it does:
- ✅ Runs tests on PR code
- ✅ Extracts test results (passed/failed counts)
- ✅ Posts automated comment with results
- ✅ Updates existing comments (no spam)
- ✅ Uploads coverage as artifact
- ✅ Fails if tests don't pass

#### PR Comment Example:
```markdown
## ✅ Test Results

**Status**: ✅ All tests passed!

- **Passed**: 37
- **Failed**: 0
- **Total**: 37

<details>
<summary>View Coverage Report</summary>

Coverage reports are available in the workflow artifacts.
Download the `coverage-report` artifact to view detailed HTML coverage.

</details>
```

---

## 🔧 Setup Instructions

### 1. Enable GitHub Actions

GitHub Actions are enabled by default for most repositories. If not:
1. Go to repository **Settings**
2. Click **Actions** → **General**
3. Under **Actions permissions**, select "Allow all actions and reusable workflows"

### 2. Configure Secrets (Optional)

For Codecov integration:
1. Sign up at [codecov.io](https://codecov.io/)
2. Get your Codecov token
3. Go to repository **Settings** → **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `CODECOV_TOKEN`
6. Value: Your Codecov token
7. Click **Add secret**

**Note**: Codecov integration is optional. Tests will still run without it.

### 3. Branch Protection Rules (Recommended)

Require tests to pass before merging:

1. Go to **Settings** → **Branches**
2. Click **Add rule** under "Branch protection rules"
3. Branch name pattern: `main` (or `master`)
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Select status checks:
     - `Run Tests`
     - `PR Test Suite`
     - `Generate Coverage Report`
5. Click **Create**

---

## 📊 Viewing Results

### In Pull Requests

1. **Checks Tab**: View all workflow runs
2. **Conversation Tab**: See automated test result comments
3. **Files Changed Tab**: See inline coverage (with Codecov)

### In Actions Tab

1. Go to **Actions** tab in repository
2. Click on a workflow run to see details
3. View logs for each job
4. Download artifacts (coverage reports)

### Coverage Reports

**Option 1: GitHub Artifacts**
1. Go to workflow run
2. Scroll to **Artifacts** section
3. Download `coverage-report.zip`
4. Extract and open `index.html`

**Option 2: Codecov Dashboard** (if configured)
1. Visit [codecov.io](https://codecov.io/)
2. Find your repository
3. View interactive coverage reports

---

## 🎯 Workflow Triggers

| Workflow | Push | PR | Branches |
|----------|------|----|----|
| test.yml | ✅ | ✅ | main, master, develop, refactoring |
| coverage-report.yml | ✅ | ✅ | main, master |
| pr-checks.yml | ❌ | ✅ | All PRs |

---

## 🚀 Usage Examples

### Running Tests on Push

```bash
git add .
git commit -m "Add new feature"
git push origin refactoring
```

This triggers:
- ✅ test.yml (if pushing to main, master, develop, or refactoring)
- ✅ coverage-report.yml (if pushing to main or master)

### Running Tests on PR

```bash
git checkout -b feature/my-feature
git add .
git commit -m "Implement feature"
git push origin feature/my-feature
# Create PR on GitHub
```

This triggers:
- ✅ test.yml
- ✅ coverage-report.yml (if PR targets main/master)
- ✅ pr-checks.yml

---

## 🔍 Understanding Workflow Status

### ✅ Success (Green Check)
- All tests passed
- Coverage meets threshold (≥80%)
- Build successful

### ❌ Failure (Red X)
- Tests failed
- Coverage below threshold
- Build errors

### 🟡 Warning (Yellow Dot)
- Workflow in progress
- Or optional checks failed

---

## 📝 Customization

### Change Node.js Versions

Edit `test.yml`:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]  # Add/remove versions
```

### Change Coverage Threshold

Edit `coverage-report.yml`:
```yaml
if [ "$COVERAGE" -lt 90 ]; then  # Change from 80 to 90
```

### Add More Jobs

Add to any workflow:
```yaml
  my-custom-job:
    name: My Custom Job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Custom command"
```

### Add Environment Variables

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

---

## 🛠️ Troubleshooting

### Workflow Not Running

**Check**:
1. Is the workflow file in `.github/workflows/`?
2. Is the YAML syntax correct?
3. Does the trigger match your action (push/PR)?
4. Are Actions enabled in repository settings?

### Tests Failing in CI but Pass Locally

**Common causes**:
1. Missing environment variables
2. Node version mismatch
3. Dependency version differences
4. Timezone issues

**Solution**:
```yaml
- name: Set timezone
  run: |
    export TZ=UTC
```

### Codecov Upload Failing

**Check**:
1. Is `CODECOV_TOKEN` secret set?
2. Is the coverage file path correct?
3. Try with `fail_ci_if_error: false`

### Slow Workflow Runs

**Optimize**:
1. Use `npm ci` instead of `npm install`
2. Enable npm caching:
   ```yaml
   with:
     cache: 'npm'
   ```
3. Run jobs in parallel where possible

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
- [Upload Artifact Action](https://github.com/actions/upload-artifact)

---

## 🎯 Best Practices

1. ✅ **Always use `npm ci`** in CI (faster, more reliable)
2. ✅ **Cache dependencies** to speed up workflows
3. ✅ **Use specific action versions** (v4 not @latest)
4. ✅ **Set `continue-on-error`** for optional steps
5. ✅ **Upload artifacts** for debugging
6. ✅ **Use matrix builds** to test multiple versions
7. ✅ **Keep secrets in GitHub Secrets**, never in code
8. ✅ **Use `checkout@v4`** for latest features
9. ✅ **Add descriptive names** to jobs and steps
10. ✅ **Test workflows locally** with [act](https://github.com/nektos/act)

---

## 📧 Support

For issues with workflows:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Check GitHub Actions status page
4. Contact repository maintainers

---

**Last Updated**: October 2025  
**Maintained By**: Development Team

