# 🕐 Deadline Reminder Cron Job Setup

## 🎯 **Solution: GitHub Actions (FREE)**

We use GitHub Actions to run the deadline reminder cron job daily at 4 PM Singapore time.

---

## 🚀 **Quick Setup (2 minutes)**

### **Step 1: Add GitHub Secret**

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `VERCEL_APP_URL`
5. Value: `https://your-app-name.vercel.app` (replace with your actual Vercel URL)
6. Click **Add secret**

### **Step 2: Deploy the Workflow**

The workflow file is already created at `.github/workflows/cron-deadline-reminders.yml`

Just commit and push:
```bash
git add .github/workflows/cron-deadline-reminders.yml
git commit -m "Add GitHub Actions cron job for deadline reminders"
git push origin refactoring
```

### **Step 3: Test the Workflow**

1. Go to your GitHub repository
2. Click **Actions** tab
3. Find "Deadline Reminder Cron Job"
4. Click **Run workflow** → **Run workflow** (manual trigger)
5. Watch it execute and check the logs

---

## 🔧 **How It Works**

### **Schedule:**
- **Runs daily at 4 PM Singapore time** (8 AM UTC)
- **Manual trigger available** for testing
- **Free forever** (GitHub Actions has generous free tier)

### **What It Does:**
1. Makes HTTP request to your Vercel app
2. Calls `/api/notifications/schedule-deadline-reminders`
3. Logs the response
4. Fails if HTTP status is not 200

### **Monitoring:**
- View logs in GitHub Actions tab
- Get email notifications on failures
- See execution history and timing

---

## 🧪 **Testing Your Setup**

### **Test GitHub Actions:**

1. **Manual Trigger:**
   - Go to Actions tab
   - Click "Deadline Reminder Cron Job"
   - Click "Run workflow"
   - Watch the execution

2. **Check Logs:**
   ```bash
   # Look for these log messages:
   ✅ "Triggering deadline reminder cron job..."
   ✅ "HTTP Status: 200"
   ✅ "Deadline reminder cron job completed successfully"
   ```

3. **Verify Notifications:**
   - Check your database for new notifications
   - Check if emails were sent (if configured)

### **Test Endpoint Manually:**

```bash
# Test your endpoint manually
curl https://your-app.vercel.app/api/notifications/schedule-deadline-reminders

# Expected response:
{
  "success": true,
  "message": "Created X deadline reminder notifications",
  "notificationsCreated": X,
  "tasksProcessed": Y
}
```

---

## 🎯 **Why GitHub Actions?**

**Use GitHub Actions** because:
- ✅ **Completely FREE**
- ✅ **Reliable** (99.9% uptime)
- ✅ **Easy monitoring** (built into GitHub)
- ✅ **Manual triggers** for testing
- ✅ **Detailed logs** for debugging
- ✅ **No external dependencies**

---

## 🚀 **Next Steps**

1. **Set up GitHub Actions:**
   ```bash
   # Add the secret in GitHub repository settings
   # Then commit the workflow file
   git add .github/workflows/cron-deadline-reminders.yml
   git commit -m "Add GitHub Actions cron job"
   git push origin refactoring
   ```

2. **Test it:**
   - Go to Actions tab
   - Run the workflow manually
   - Check the logs

3. **Monitor it:**
   - Check daily execution
   - Verify notifications are created
   - Set up email alerts for failures

Your cron job will now run reliably every day at 4 PM Singapore time! 🎉