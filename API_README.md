# API Documentation

Complete reference for all API endpoints in the SPM Project Management System.

## Base URL

All API endpoints are prefixed with `/api/`

## Authentication

Most endpoints require authentication via Supabase session. Include the session cookie in requests or use the Supabase client SDK.

## Error Responses

All endpoints may return the following error responses:

- `400 Bad Request` - Invalid request data or validation errors
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User lacks required permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error response format:
```json
{
  "statusCode": 400,
  "statusMessage": "Error message"
}
```

---

## Authentication Endpoints

### POST `/api/login`

Authenticate a user and create a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "session": { ... }
}
```

**Errors:**
- `400` - Email and password required, or invalid email format
- `401` - Invalid credentials

---

### POST `/api/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullname": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

**Errors:**
- `400` - Invalid input data
- `409` - Email already exists
- `500` - User creation failed

---

### POST `/api/logout`

Sign out the current user.

**Response:**
```json
{
  "success": true
}
```

---

### POST `/api/forgot-password`

Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset link sent to your email."
}
```

---

### POST `/api/update-password`

Update user password (requires access token from reset email).

**Request Body:**
```json
{
  "access_token": "token_from_email",
  "password": "newpassword123",
  "confirm_password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

**Errors:**
- `400` - Access token required, passwords don't match, or password too short (< 8 characters)

---

## User Endpoints

### GET `/api/user/me`

Get current authenticated user information.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    ...
  }
}
```

**Errors:**
- `401` - Not authenticated

---

## Task Endpoints

### GET `/api/tasks`

Get all tasks assigned to the current user (personal dashboard).

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Task title",
      "status": "in-progress",
      "priority": 5,
      "start_date": "2025-01-01",
      "due_date": "2025-01-08",
      "repeat_interval": 7,
      "creator": { "id": 1, "fullname": "Creator Name" },
      "assignees": [
        {
          "assigned_to": { "id": 1, "fullname": "Assignee Name" },
          "assigned_by": { "id": 2, "fullname": "Manager Name" }
        }
      ],
      "project": { "id": 1, "name": "Project Name" }
    }
  ],
  "count": 10
}
```

**Note:** Tasks are filtered by department hierarchy - users only see tasks assigned to staff in their visible departments.

---

### GET `/api/tasks/overdue`

Get all overdue tasks visible to the current user.

**Response:**
```json
{
  "tasks": [ ... ],
  "count": 5
}
```

**Note:** Respects department hierarchy visibility.

---

### GET `/api/tasks/by-project?project_id={id}`

Get all tasks for a specific project.

**Query Parameters:**
- `project_id` (required) - Project ID

**Response:**
```json
{
  "tasks": [ ... ],
  "count": 15
}
```

**Note:** Only shows tasks assigned to staff in visible departments.

---

### GET `/api/tasks/[id]`

Get detailed information about a specific task.

**Response:**
```json
{
  "task": {
    "id": 1,
    "title": "Task title",
    "status": "in-progress",
    "priority": 5,
    "start_date": "2025-01-01",
    "due_date": "2025-01-08",
    "repeat_interval": 7,
    "notes": "Task notes",
    "tags": ["tag1", "tag2"],
    "creator": { "id": 1, "fullname": "Creator Name" },
    "assignees": [ ... ],
    "project": { "id": 1, "name": "Project Name" },
    "subtasks": [ ... ],
    "history": [ ... ],
    "permissions": {
      "canEdit": true,
      "canDelete": true
    }
  }
}
```

**Errors:**
- `403` - User cannot view this task (department visibility restriction)

---

### POST `/api/tasks`

Create a new task.

**Request Body:**
```json
{
  "title": "Task title",
  "notes": "Task description",
  "start_date": "2025-01-01",
  "due_date": "2025-01-08",
  "status": "not-started",
  "priority": 5,
  "repeat_interval": 7,
  "project_id": 1,
  "tags": ["tag1", "tag2"],
  "assignee_ids": [1, 2],
  "subtasks": [
    {
      "title": "Subtask title",
      "start_date": "2025-01-01",
      "due_date": "2025-01-05",
      "status": "not-started",
      "priority": 3,
      "assignee_ids": [1]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "task": { ... },
  "subtasks": [ ... ]
}
```

**Validation Rules:**
- At least 1 assignee required (maximum 5)
- Priority must be integer between 1-10
- If `repeat_interval > 0`, `due_date` is auto-calculated from `start_date`
- Subtasks must also have at least 1 assignee (maximum 5)

**Errors:**
- `400` - Validation errors (missing assignees, invalid priority, etc.)

---

### PUT `/api/tasks/[id]`

Update an existing task.

**Request Body:**
```json
{
  "task_name": "Updated title",
  "start_date": "2025-01-02",
  "end_date": "2025-01-09",
  "status": "in-progress",
  "priority": 6,
  "notes": "Updated notes",
  "repeat_interval": 7,
  "tags": ["tag1", "tag2", "tag3"],
  "assignee_ids": [1, 2, 3],
  "subtasks": [
    {
      "id": 10,
      "title": "Updated subtask",
      "status": "completed",
      "assignee_ids": [1]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "task": { ... },
  "replicatedTask": {
    "id": 2,
    "title": "Task title",
    "due_date": "2025-01-15",
    "start_date": "2025-01-08"
  }
}
```

**Note:** `replicatedTask` is included when a recurring task is completed and a new occurrence is created.

**Permissions:**
- Managers/Admins: Can edit any task they can view
- Regular Staff: Can only edit tasks they are assigned to

**Errors:**
- `403` - User lacks permission to edit this task
- `400` - Validation errors

---

### DELETE `/api/tasks/[id]`

Delete a task (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

**Permissions:**
- Managers/Admins: Can delete any task they can view
- Regular Staff: Can only delete tasks they are assigned to

**Note:** This is a soft delete - the task is marked as deleted but not removed from the database.

---

### GET `/api/tasks/process-recurring-tasks`

Manually trigger the recurring tasks processor (cron job endpoint).

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "message": "Processed 5 recurring tasks"
}
```

**Note:** This endpoint is typically called by a scheduled cron job, but can be manually triggered for testing.

---

## Task Comments Endpoints

### GET `/api/tasks/[id]/comments`

Get all comments for a task.

**Response:**
```json
{
  "comments": [
    {
      "id": 1,
      "task_id": 1,
      "staff_id": 1,
      "comment": "Comment text",
      "created_at": "2025-01-01T00:00:00Z",
      "staff": { "id": 1, "fullname": "Commenter Name" }
    }
  ]
}
```

---

### POST `/api/tasks/[id]/comments`

Add a comment to a task.

**Request Body:**
```json
{
  "comment": "Comment text"
}
```

**Response:**
```json
{
  "success": true,
  "comment": { ... }
}
```

---

### PUT `/api/tasks/[id]/comments/[commentId]`

Update a comment.

**Request Body:**
```json
{
  "comment": "Updated comment text"
}
```

**Response:**
```json
{
  "success": true,
  "comment": { ... }
}
```

**Permissions:** Only the comment author can update their comment.

---

### DELETE `/api/tasks/[id]/comments/[commentId]`

Delete a comment.

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Permissions:** Only the comment author can delete their comment.

---

## Project Endpoints

### GET `/api/projects`

Get all projects visible to the current user.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Project Name",
    "description": "Project description",
    "priority": "medium",
    "status": "in-progress",
    "due_date": "2025-12-31",
    "tags": ["tag1", "tag2"],
    "owner_id": 1,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

**Note:** Projects are filtered based on department hierarchy - only projects with tasks assigned to visible staff are shown.

---

### GET `/api/projects/active`

Get all active (non-completed) projects.

**Response:**
```json
[ ... ]
```

---

### GET `/api/projects/[id]`

Get detailed information about a specific project.

**Response:**
```json
{
  "project": { ... },
  "tasks": [ ... ],
  "members": [ ... ]
}
```

---

### POST `/api/projects`

Create a new project.

**Request Body:**
```json
{
  "name": "Project Name",
  "description": "Project description",
  "priority": "medium",
  "status": "todo",
  "due_date": "2025-12-31",
  "tags": ["tag1", "tag2"]
}
```

**Response:**
```json
{
  "success": true,
  "project": { ... }
}
```

**Permissions:** Only managers can create projects.

**Validation:**
- Project name is required
- Priority must be: `low`, `medium`, or `high`
- Status must be: `todo`, `in-progress`, `completed`, or `blocked`
- Duplicate project names for the same owner are not allowed

---

### PUT `/api/projects/[id]`

Update a project.

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "priority": "high",
  "status": "in-progress",
  "due_date": "2025-12-31",
  "tags": ["tag1", "tag2", "tag3"]
}
```

**Response:**
```json
{
  "success": true,
  "project": { ... }
}
```

---

### DELETE `/api/projects/[id]`

Delete a project (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

---

## Staff Endpoints

### GET `/api/staff`

Get all staff members visible to the current user.

**Response:**
```json
[
  {
    "id": 1,
    "fullname": "Staff Name",
    "department": "Sales Division",
    "is_manager": false,
    "is_admin": false
  }
]
```

**Note:** Staff list is filtered by department hierarchy - users only see staff from their visible departments.

---

## Notification Endpoints

### GET `/api/notifications`

Get all notifications for the current user.

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "staff_id": 1,
      "type": "task_assignment",
      "message": "You have been assigned to task: Task Name",
      "is_read": false,
      "created_at": "2025-01-01T00:00:00Z",
      "triggered_by": { "id": 2, "fullname": "Manager Name" },
      "related_task": { "id": 1, "title": "Task Name" },
      "related_project": { "id": 1, "name": "Project Name" }
    }
  ]
}
```

**Note:** Returns last 50 notifications, ordered by creation date (newest first).

---

### GET `/api/notifications/[id]`

Get a specific notification.

**Response:**
```json
{
  "notification": { ... }
}
```

---

### POST `/api/notifications/read-all`

Mark all notifications as read.

**Response:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### DELETE `/api/notifications/[id]`

Delete a notification.

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### POST `/api/notifications/delete-all-read`

Delete all read notifications.

**Response:**
```json
{
  "success": true,
  "message": "All read notifications deleted"
}
```

---

## Report Endpoints

All report endpoints require manager or admin privileges and respect department hierarchy.

### GET `/api/reports/task-completion`

Get task completion report.

**Query Parameters:**
- `user_id` (optional) - Filter by user ID
- `project_id` (optional) - Filter by project ID
- `start_date` (optional) - Start date (ISO format)
- `end_date` (optional) - End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalTasks": 100,
      "completedTasks": 75,
      "completedPercentage": "75.00",
      "inProgressTasks": 15,
      "inProgressPercentage": "15.00",
      "notStartedTasks": 8,
      "notStartedPercentage": "8.00",
      "blockedTasks": 2,
      "blockedPercentage": "2.00",
      "projectedTasks": 5
    },
    "tasks": [ ... ],
    "filters": {
      "user_id": 1,
      "userName": "User Name",
      "project_id": 1,
      "projectName": "Project Name",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31"
    },
    "generatedAt": "2025-01-15T10:00:00Z"
  }
}
```

**Errors:**
- `403` - User is not a manager/admin, or cannot view reports for specified user

---

### GET `/api/reports/logged-time`

Get logged time report.

**Query Parameters:**
- `user_id` (optional) - Filter by user ID
- `start_date` (optional) - Start date
- `end_date` (optional) - End date

**Response:**
```json
{
  "success": true,
  "data": {
    "totalHours": 120.5,
    "byUser": [ ... ],
    "byProject": [ ... ]
  }
}
```

---

### GET `/api/reports/team-summary`

Get team performance summary report.

**Query Parameters:**
- `start_date` (optional) - Start date
- `end_date` (optional) - End date

**Response:**
```json
{
  "success": true,
  "data": {
    "teamMetrics": { ... },
    "individualPerformance": [ ... ]
  }
}
```

---

## Admin Endpoints

All admin endpoints require admin privileges.

### GET `/api/admin/users`

Get all users (admin only).

**Response:**
```json
[
  {
    "id": 1,
    "fullname": "User Name",
    "email": "user@example.com",
    "contact_number": "+1234567890",
    "staff_type": "manager",
    "is_admin": false,
    "is_manager": true,
    "designation": "Manager",
    "department": "Sales Division",
    "user_id": "uuid",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### PUT `/api/admin/users/[id]`

Update a user (admin only).

**Request Body:**
```json
{
  "fullname": "Updated Name",
  "contact_number": "+1234567890",
  "is_manager": true,
  "is_admin": false,
  "designation": "Senior Manager",
  "department": "Sales Division"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

---

### GET `/api/admin/archive`

Get archived (soft-deleted) items (admin only).

**Response:**
```json
{
  "tasks": [ ... ],
  "projects": [ ... ]
}
```

---

## Assignee Endpoints

### POST `/api/assignee`

Assign a staff member to a task (legacy endpoint).

**Request Body:**
```json
{
  "task_id": 1,
  "staff_id": 1
}
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Prefer using the task update endpoint with `assignee_ids` array instead.

---

## Department Hierarchy

All task, project, and report endpoints respect department hierarchy. Users can only see:

- Tasks assigned to staff in their department or sub-departments
- Projects that have tasks assigned to visible staff
- Reports for visible staff members

See the main README for details on the department hierarchy structure.

---

## Recurring Tasks

Tasks with `repeat_interval > 0` are automatically replicated when completed. See the main README for detailed information about recurring task behavior.

---

## Rate Limiting

Currently, there are no rate limits on API endpoints. Consider implementing rate limiting for production deployments.

---

## Versioning

API versioning is not currently implemented. All endpoints are under `/api/` without version prefixes.

---

## Support

For questions or issues with the API:
1. Check this documentation
2. Review the main README for feature details
3. Check server logs for error details
4. Contact the development team

