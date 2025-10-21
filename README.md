# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Features

### Recurring Tasks

The application supports automatic task replication based on completion and a repeat interval (in days). This feature allows you to create tasks that automatically generate new copies when completed.

#### How It Works

1. **Creating a Recurring Task**
   - When creating or editing a task, set the "Repeat Interval (in Days)" field to a value greater than 0
   - For example, setting it to `7` means the next occurrence will be due 7 days after the current task's due date
   - **Important**: When a repeat interval is set, the due date is automatically calculated as `start_date + repeat_interval` days
   - The due date field becomes read-only and is automatically updated when either the start date or repeat interval changes

2. **Completion-Based Replication**
   - **Key Feature**: A recurring task is only replicated when it is marked as **completed**
   - When you mark a task with `repeat_interval > 0` as completed:
     - A new copy is immediately created with dates shifted forward by the repeat interval
     - The new task maintains the same repeat interval, continuing the cycle
     - All assignees and subtasks are copied to the new task
     - The original task's repeat interval is set to 0 to prevent re-replication
   - This ensures tasks are not replicated exponentially and gives you control over when the next occurrence is created

3. **Automatic Safety Net**
   - A scheduled job runs daily at midnight (Singapore timezone, UTC+8) as a backup
   - The job catches any completed tasks with `repeat_interval > 0` that weren't replicated on completion
   - This ensures no recurring tasks are missed due to system errors

4. **Example**
   - Task A has:
     - Start date: `2025-01-01`
     - Repeat interval: `7` days
     - Due date: `2025-01-08` (auto-calculated)
   - On `2025-01-10`, you mark Task A as completed
   - **Immediately**, Task B is created with:
     - Start date: `2025-01-08`
     - Repeat interval: `7` days
     - Due date: `2025-01-15` (auto-calculated)
     - Status: `not-started`
   - Task A's repeat interval is set to `0`
   - When you complete Task B (on any date), Task C will be created with dates shifted by 7 days

#### Technical Implementation

- **Primary Trigger**: Task completion (via PUT `/api/tasks/:id`)
  - When a task status changes to `completed` and has `repeat_interval > 0`, replication happens immediately
  - Response includes information about the newly created task in the `replicatedTask` field
- **Backup Cron Job**: `/api/tasks/process-recurring-tasks`
  - **Schedule**: `0 0 * * *` (runs at midnight daily)
  - **Purpose**: Safety net to catch any tasks that weren't replicated on completion
  - **Configuration**: See `vercel.json` for cron job setup
- **Replication Logic**: Centralized in `/server/utils/recurringTaskService.ts`

To manually trigger the recurring tasks processor (for testing):
```bash
curl https://your-domain.com/api/tasks/process-recurring-tasks
```

#### Important Notes

- **Completion Requirement**: Tasks are only replicated when marked as **completed**, regardless of the due date
- **No Time-Based Replication**: Unlike traditional recurring tasks, these tasks do NOT replicate automatically based on time passing
- **Control Over Timing**: You control when the next occurrence is created by completing the current task
- **Example**: A task with `repeat_interval = 1` (1 day) that takes 3 days to complete will only create the next occurrence on day 3 when you mark it complete
- **Due Date Auto-Calculation**: When `repeat_interval > 0`, the due date is automatically set to `start_date + repeat_interval` days, both in the UI and backend
- The due date field is disabled in the UI when a repeat interval is set, ensuring consistency
- Backend validation enforces this rule during task creation and updates
- New tasks are created with status `not-started`
- Subtasks do not have their own repeat cycles; they are copied with the parent task
- The original task's repeat interval is always set to 0 after replication to prevent re-replication
- **Comments are NOT copied**: Each task instance maintains its own comment history

#### UI Behavior

When working with recurring tasks in the Create Task or Edit Task modals:
- Setting a repeat interval > 0 will:
  - Automatically calculate and set the due date
  - Disable the due date picker (marked as "Auto-set")
  - Display a helper text showing the calculation (e.g., "Due date is automatically set to 7 day(s) from start date")
- Changing the start date will automatically recalculate the due date if a repeat interval is set
- Setting the repeat interval to 0 re-enables manual due date selection
