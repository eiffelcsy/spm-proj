# SPM Project Management System

A comprehensive project and task management application built with Nuxt 3, Vue 3, and Supabase.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Setup](#setup)
- [Development](#development)
- [Production](#production)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
  - [Recurring Tasks](#recurring-tasks)
  - [Department Hierarchy](#department-hierarchy)
- [Technology Stack](#technology-stack)
- [Documentation](#documentation)

## Overview

This is a full-stack project management system that enables teams to manage tasks, projects, and collaborate effectively. The system includes role-based access control, department-based visibility, recurring task automation, and comprehensive reporting capabilities.

## Features

- **Task Management**: Create, assign, and track tasks with subtasks, priorities, and due dates
- **Project Organization**: Organize tasks by projects with collaboration features
- **Recurring Tasks**: Automatically replicate tasks based on completion and repeat intervals
- **Department Hierarchy**: Restrict task visibility based on organizational structure
- **Role-Based Access**: Admin, Manager, and Staff roles with appropriate permissions
- **Notifications**: Real-time notifications for task assignments and updates
- **Reports**: Task completion, logged time, and team summary reports
- **User Management**: Admin interface for managing users and departments

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

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## Development

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

Check out the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Project Structure

```
spm-proj/
├── app/                    # Frontend application
│   ├── components/         # Vue components
│   ├── pages/              # Nuxt pages (routes)
│   ├── composables/        # Vue composables
│   ├── layouts/            # Page layouts
│   └── types/              # TypeScript types
├── server/                 # Backend API
│   ├── api/                # API endpoints
│   └── utils/              # Server utilities
├── test/                   # Test suite
│   ├── unit/               # Unit tests
│   └── regression/         # Regression tests
├── coverage/               # Test coverage reports
└── public/                 # Static assets
```

## Key Features

### Recurring Tasks

The application supports automatic task replication based on completion and a repeat interval (in days). This feature allows you to create tasks that automatically generate new copies when completed.

#### How It Works

1. **Creating a Recurring Task**
   - When creating or editing a task, set the "Repeat Interval (in Days)" field to a value greater than 0
   - For example, setting it to `7` means the next occurrence will be due 7 days after the current task's due date
   - **Important**: When a repeat interval is set, the due date is automatically calculated as `start_date + repeat_interval` days
   - The due date field becomes read-only and is automatically updated when either the start date or repeat interval changes

2. **Completion-Based Replication with Sequential Catch-Up**
   - **Key Feature**: A recurring task is only replicated when it is marked as **completed**
   - When you mark a task with `repeat_interval > 0` as completed:
     - **Sequential Catch-Up**: Creates ONE next occurrence based on the previous task's due date
     - The next occurrence gets the next sequential due date (previous due date + interval)
     - Each new occurrence maintains `repeat_interval > 0` to continue the cycle
     - All assignees and subtasks are copied to the new task occurrence
     - The original task's repeat interval is set to 0 to prevent re-replication
   - This allows you to work through missed occurrences one at a time

3. **Automatic Safety Net**
   - A scheduled job runs daily at midnight (Singapore timezone, UTC+8) as a backup
   - The job catches any completed tasks with `repeat_interval > 0` that weren't replicated on completion
   - This ensures no recurring tasks are missed due to system errors

4. **Example: On-Time Completion**
   - Task A has:
     - Start date: `2025-01-01`
     - Repeat interval: `7` days
     - Due date: `2025-01-08` (auto-calculated)
   - On `2025-01-08`, you mark Task A as completed
   - **Immediately**, Task B is created with:
     - Start date: `2025-01-08`
     - Repeat interval: `7` days
     - Due date: `2025-01-15` (auto-calculated)
     - Status: `not-started`
   - Task A's repeat interval is set to `0`

5. **Example: Late Completion with Sequential Catch-Up**
   - Task A has:
     - Start date: `2025-10-07`
     - Repeat interval: `1` day
     - Due date: `2025-10-08` (auto-calculated)
   - You complete it on `2025-10-15` (7 days late)
   - **Immediately**, Task B is created:
     - Due date: `2025-10-09` (next day after Task A)
     - Repeat interval: `1` (continues the cycle)
   - Task A's repeat interval is set to `0`
   - When you complete Task B, Task C is created with due date `2025-10-10`
   - When you complete Task C, Task D is created with due date `2025-10-11`
   - This continues sequentially until you catch up to the current date
   - Each completion creates the next occurrence in the sequence

#### Technical Implementation

- **Primary Trigger**: Task completion (via PUT `/api/tasks/:id`)
  - When a task status changes to `completed` and has `repeat_interval > 0`, replication happens immediately
  - Creates ONE next occurrence with the next sequential due date
  - Response includes information about the newly created task in the `replicatedTask` field
- **Backup Cron Job**: `/api/tasks/process-recurring-tasks`
  - **Schedule**: `0 0 * * *` (runs at midnight daily)
  - **Purpose**: Safety net to catch any tasks that weren't replicated on completion
  - **Configuration**: See deployment platform configuration for cron job setup
- **Replication Logic**: Centralized in `/server/utils/recurringTaskService.ts`

To manually trigger the recurring tasks processor (for testing):
```bash
curl https://your-domain.com/api/tasks/process-recurring-tasks
```

#### Important Notes

- **Completion Requirement**: Tasks are only replicated when marked as **completed**, regardless of the due date
- **Sequential Catch-Up Behavior**: If a task is completed late, only ONE next occurrence is created
  - Example: A daily task due Oct 14, completed Oct 21, creates 1 task with due date Oct 15
  - When Oct 15 task is completed, Oct 16 task is created, and so on
  - Each occurrence maintains `repeat_interval > 0` to continue the cycle
  - You work through missed occurrences sequentially, one at a time
- **No Time-Based Replication**: Unlike traditional recurring tasks, these tasks do NOT replicate automatically based on time passing
- **Control Over Timing**: You control when each occurrence is created by completing the previous one
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

### Department Hierarchy

The system implements a department hierarchy that restricts task visibility based on organizational structure. Users can only view tasks assigned to staff in their department or sub-departments.

**Note:** While task visibility is restricted by department, users can assign tasks to any staff member regardless of department or role. This allows for cross-departmental collaboration while maintaining visibility controls.

#### Hierarchy Structure

```
Managing Director → ALL departments (Full visibility)

Sales Division:
├─ Sales Director → Sales Manager, Account Managers
└─ Sales Manager → Account Managers

Consultancy Division:
└─ Consultancy Division Director → Consultant

System Solutioning Division:
└─ System Solutioning Division Director → Developers, Support Team

Engineering Operations Division:
└─ Engineering Operation Division Director → Senior Engineers, Junior Engineers, Call Centre, Operations Planning Team

HR and Admin Division:
└─ HR and Admin Director → HR Team, L&D Team, Admin Team

Finance Division:
├─ Finance Director → Finance Managers, Finance Executive
└─ Finance Managers → Finance Executive

IT Division:
└─ IT Director → IT Team
```

#### Visibility Rules

1. **Managing Director** sees ALL tasks across all departments
2. **Division Directors** see tasks for:
   - Their own department
   - All sub-departments under them
3. **Managers** see tasks for:
   - Their own department
   - Their direct reports' departments
4. **Regular Staff** see tasks for:
   - Only their own department

#### Edit/Delete Permissions

**For Managers and Admins (is_manager=true or is_admin=true):**
- Can **edit** any task they can view (based on department hierarchy)
- Can **delete** any task they can view (based on department hierarchy)

**For Regular Staff:**
- Can **edit** tasks they are assigned to, OR tasks they created (if unassigned)
- Can **delete** tasks they are assigned to, OR tasks they created (if unassigned)

#### Implementation

- **Backend**: Department hierarchy logic in `/server/utils/departmentHierarchy.ts`
- **API Endpoints**: All task, project, and report endpoints respect department visibility
- **Frontend**: Department selection dropdown in admin user management
- **Database**: Uses existing `staff.department` field (no migrations required)

#### Data Setup

All staff members must have their department field set to one of the predefined values for the system to work correctly.

To assign departments to users:
1. Go to Admin → User Management
2. Edit each user
3. Select their department from the dropdown
4. Save changes

#### Maintenance

**Adding New Departments:**
1. Update `server/utils/departmentHierarchy.ts`:
   - Add department to `DEPARTMENT_HIERARCHY` array
   - Define its visibility rules (canView array)
2. Update `app/pages/admin/users.vue`:
   - Add new SelectItem to department dropdown
3. Test the new department's visibility rules

**Modifying Hierarchy:**
1. Edit the `canView` array for affected departments in `departmentHierarchy.ts`
2. Test visibility changes thoroughly
3. Document changes

## Technology Stack

- **Framework**: Nuxt 3
- **Frontend**: Vue 3, TypeScript
- **UI Components**: shadcn-nuxt, Tailwind CSS
- **Backend**: Nuxt Server API (H3)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Testing**: Vitest, Vue Test Utils
- **Build Tool**: Vite

## Documentation

- **[Test Documentation](./test/TEST_README.md)**: Comprehensive guide to testing, coverage, and regression tests
- **[API Documentation](./API_README.md)**: Complete API endpoint reference
- **[CI/CD Documentation](./CI_README.md)**: Continuous integration and deployment guide

## Contributing

When adding new features:
1. Write tests before implementing (TDD approach)
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Aim for >80% coverage on new code
5. Update relevant documentation

When fixing bugs:
1. Add a regression test to prevent the bug from reappearing
2. Run regression tests: `npm run test:regression`
3. Ensure all regression tests pass
4. Document the bug fix in the test file

## License

[Add your license information here]
