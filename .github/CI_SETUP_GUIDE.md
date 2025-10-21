# GitHub Actions CI/CD - Quick Setup Guide

## 🚀 Quick Start

Your CI/CD pipeline is **ready to use!** It will automatically run when you push code or create pull requests.

## ✅ What's Included

### 3 Automated Workflows

1. **Main Test Suite** (`test.yml`)
   - Runs on: Push & PR to main/master/develop/refactoring branches
   - Tests on Node.js 18.x and 20.x
   - Generates coverage reports
   - Uploads to Codecov

2. **Coverage Report** (`coverage-report.yml`)
   - Runs on: Push & PR to main/master
   - Detailed coverage analysis
   - Warns if coverage < 80%
   - Stores coverage artifacts

3. **PR Checks** (`pr-checks.yml`)
   - Runs on: All Pull Requests
   - Posts test results as PR comment
   - Updates comments automatically
   - Fails PR if tests fail

## 📦 How to Use

### 1. Push Your Changes

```bash
git add .
git commit -m "Your commit message"
git push origin refactoring
```

**What happens**:
- ✅ Workflows automatically trigger
- ✅ Tests run in the cloud
- ✅ You get notifications on success/failure

### 2. Create a Pull Request

```bash
git checkout -b feature/my-new-feature
# Make your changes
git add .
git commit -m "Add new feature"
git push origin feature/my-new-feature
# Create PR on GitHub
```

**What happens**:
- ✅ All workflows run automatically
- ✅ Test results appear as PR comment
- ✅ Coverage report generated
- ✅ PR shows pass/fail status

### 3. View Results

**Option 1: In the PR**
- Go to your Pull Request
- Check the "Checks" tab
- See automated test result comment

**Option 2: Actions Tab**
- Click "Actions" in your repository
- See all workflow runs
- Click any run for detailed logs

**Option 3: Download Coverage**
- Go to workflow run
- Scroll to "Artifacts"
- Download `coverage-report`
- Open `index.html` in browser

## 🔧 Optional Setup

### Enable Codecov (Recommended)

Codecov provides beautiful coverage dashboards and PR comments.

**Steps**:

1. **Sign up at Codecov**
   - Go to [codecov.io](https://codecov.io/)
   - Sign in with GitHub
   - Authorize Codecov

2. **Get Your Token**
   - Find your repository in Codecov
   - Go to Settings
   - Copy the "Repository Upload Token"

3. **Add Token to GitHub**
   - Go to your repository Settings
   - Click "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Paste your token
   - Click "Add secret"

4. **Done!**
   - Next workflow run will upload to Codecov
   - View coverage at `https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO`

**Without Codecov**:
- Workflows still work perfectly
- Just won't upload to Codecov dashboard
- Coverage reports still available as artifacts

### Enable Branch Protection

Require tests to pass before merging PRs.

**Steps**:

1. Go to repository **Settings**
2. Click **Branches** in sidebar
3. Click **Add rule**
4. Branch name pattern: `main` (or your main branch)
5. Check these boxes:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
6. In status checks, select:
   - ✅ `Run Tests`
   - ✅ `PR Test Suite`
   - ✅ `Generate Coverage Report` (optional)
7. Click **Create**

**Result**: PRs can't be merged until tests pass! ✅

## 📊 Understanding Workflow Status

### In Your Repository

You'll see status badges in different places:

**On Commits**:
- ✅ Green check = All workflows passed
- ❌ Red X = Something failed
- 🟡 Yellow circle = In progress

**On Pull Requests**:
- Status checks appear at the bottom
- Must pass before merging (if branch protection enabled)
- Click "Details" to see logs

### Email Notifications

You'll receive emails when:
- ✅ Workflows complete successfully
- ❌ Workflows fail
- 🔄 Workflows are re-run

**Configure notifications**:
- GitHub profile → Settings → Notifications
- Customize Actions notifications

## 🎯 What Gets Tested

Every workflow run executes:

```bash
# 1. Install dependencies
npm ci

# 2. Run all tests
npm test

# 3. Generate coverage
npm run test:coverage
```

This runs all **45 unit tests** for the admin users page.

## 📈 Coverage Thresholds

Workflows check that coverage stays above:
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

If coverage drops below these thresholds, you'll see a **warning** (but workflow still passes).

## 🔍 Viewing Detailed Results

### Test Output

In workflow logs, you'll see:

```
✓ Admin Users Page > Component Mounting (3)
✓ Admin Users Page > Loading State (2)
✓ Admin Users Page > Error Handling (2)
✓ Admin Users Page > User List Display (3)
...

Test Files  1 passed (1)
     Tests  37 passed | 8 failed (45)
  Duration  28s
```

### Coverage Report

Download the `coverage-report` artifact and open `index.html` to see:
- 📊 Overall coverage percentages
- 📁 Coverage by file/directory
- 🔍 Line-by-line coverage highlighting
- ✅ Green = Covered
- ❌ Red = Not covered

## 🛠️ Customization

### Run on Different Branches

Edit `.github/workflows/test.yml`:

```yaml
on:
  push:
    branches: [ main, master, develop, your-branch ]
```

### Change Node.js Versions

Edit `.github/workflows/test.yml`:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]  # Add versions here
```

### Add Environment Variables

Edit any workflow file:

```yaml
env:
  MY_VAR: value
  SECRET_VAR: ${{ secrets.MY_SECRET }}
```

## 🐛 Troubleshooting

### Workflow Not Running

**Check**:
1. Are you pushing to a monitored branch?
2. Are Actions enabled in repo settings?
3. Is the workflow file in `.github/workflows/`?

### Tests Pass Locally But Fail in CI

**Common causes**:
1. **Environment differences** - CI uses clean Ubuntu environment
2. **Node version** - CI uses specific versions (18.x, 20.x)
3. **Dependencies** - Make sure `package-lock.json` is committed

**Solutions**:
```bash
# Test with clean install locally
rm -rf node_modules
npm ci
npm test
```

### Coverage Upload Failed

If you see Codecov errors:
1. Check if `CODECOV_TOKEN` secret is set
2. Make sure token is valid
3. Check Codecov service status

**Note**: Workflows will still pass even if Codecov upload fails (we use `fail_ci_if_error: false`)

## 📋 Workflow Files

Your repository now has:

```
.github/
├── workflows/
│   ├── test.yml                  # Main test suite
│   ├── coverage-report.yml       # Detailed coverage
│   ├── pr-checks.yml            # PR validation
│   └── README.md                # Workflow documentation
├── PULL_REQUEST_TEMPLATE.md     # PR template
└── CI_SETUP_GUIDE.md           # This file
```

## 🎉 Benefits

With this CI/CD pipeline, you get:

✅ **Automated Testing** - Tests run on every push  
✅ **Multi-Version Support** - Tests on Node 18 & 20  
✅ **Coverage Reports** - Know what's tested  
✅ **PR Comments** - See results directly in PRs  
✅ **Artifact Storage** - Download reports anytime  
✅ **Branch Protection** - Prevent broken code from merging  
✅ **Build Verification** - Ensure code builds successfully  
✅ **Professional** - Industry-standard CI/CD setup  

## 📚 Next Steps

1. ✅ **Push code** - Workflows run automatically
2. ✅ **Create PR** - See automated feedback
3. ✅ **Set up Codecov** (optional) - Better coverage insights
4. ✅ **Enable branch protection** - Require passing tests
5. ✅ **Add coverage badge** - Show coverage in README

### Add Coverage Badge to README

After setting up Codecov, add this to your `README.md`:

```markdown
[![codecov](https://codecov.io/gh/USERNAME/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/USERNAME/REPO)
```

Replace `USERNAME` and `REPO` with your values.

## 🆘 Getting Help

1. **Check workflow logs** - Actions tab → Click failed run
2. **Read error messages** - Usually very descriptive
3. **Review workflow files** - See `.github/workflows/`
4. **Check documentation** - See `.github/workflows/README.md`

## ✨ You're All Set!

Your CI/CD pipeline is configured and ready. Just push code and watch the magic happen! 🚀

**Try it now**:
```bash
git add .
git commit -m "Add CI/CD pipeline"
git push origin refactoring
```

Then go to the **Actions** tab in your repository to see it run!

