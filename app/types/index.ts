/**
 * ============================================================================
 * CENTRALIZED TYPE DEFINITIONS
 * ============================================================================
 * 
 * NAMING CONVENTIONS:
 * - Database/API fields: snake_case (e.g., start_date, created_at)
 * - TypeScript/UI fields: camelCase (e.g., startDate, createdAt)
 * - Use transformation functions to convert between conventions
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type StaffRole = 'staff' | 'manager' | 'director' | 'hr'

export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked'

export type ProjectStatus = 'todo' | 'in-progress' | 'completed' | 'blocked'

export type ProjectMemberRole = 'member' | 'manager'

export type ProjectPriority = 'low' | 'medium' | 'high'

export type NotificationType = 
  | 'deadline_reminder' 
  | 'task_assigned' 
  | 'task_updated' 
  | 'task_unassigned'
  | 'task_deleted'
  | 'comment_added' 
  | 'mention' 
  | 'project_invitation'

export type ActivityAction = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'assigned' 
  | 'completed' 
  | 'commented' 
  | 'reassigned'

export type ActivityEntityType = 'task' | 'project' | 'comment' | 'assignment'

export type ReportType = 'schedule_overview' | 'progress_summary' | 'team_workload'

export type ReportFormat = 'pdf' | 'excel' | 'csv'

export type ReportStatus = 'generating' | 'completed' | 'failed'

// ============================================================================
// STAFF & USER TYPES (Database Schema)
// ============================================================================

/**
 * Staff record from database
 * Maps to 'staff' table in ERD
 */
export interface StaffDB {
  id: number
  fullname: string
  designation: string | null
  department: string | null
  contact_number: number | null  
  staff_type: string | null
  created_at: string
  user_id: string  // UUID foreign key
}

/**
 * Simplified staff member for dropdowns/assignments
 * Used in UI components for staff selection
 */
export interface StaffMember {
  id: number
  fullname: string
  email: string | null
  department?: string | null
  // Transition away from staff_type; prefer booleans below
  staff_type?: string
  isManager?: boolean
  isAdmin?: boolean
}

/**
 * Staff member with additional details
 */
export interface StaffDetail extends StaffMember {
  department: string | null
  designation: string | null
  role: StaffRole
  is_active: boolean
}

// ============================================================================
// PROJECT TYPES (Database Schema)
// ============================================================================

/**
 * Project record from database
 * Maps to 'projects' table in ERD
 */
export interface ProjectDB {
  id: number
  name: string
  description: string | null
  owner_id: number
  created_at: string
  updated_at: string
  due_date: string | null
  deleted_at: string | null
  priority: string
  tags: string[]
  status: string
}

/**
 * Project with populated relationships
 * Used when fetching project details with joins
 */
export interface ProjectWithRelations extends ProjectDB {
  owner?: StaffMember
  members?: ProjectMemberDB[]
  task_count?: number
}

/**
 * Input for creating a new project
 */
export interface ProjectCreateInput {
  name: string
  description?: string | null
  priority?: ProjectPriority
  due_date?: string | null
  assigned_user_ids?: number[]
  tags?: string[]
  status?: ProjectStatus
}

/**
 * Input for updating an existing project
 */
export interface ProjectUpdateInput {
  name?: string
  description?: string | null
  priority?: ProjectPriority
  due_date?: string | null
  assigned_user_ids?: number[]
  tags?: string[]
  status?: ProjectStatus
}

// ============================================================================
// PROJECT MEMBERS TYPES
// ============================================================================

/**
 * Project member record from database
 * Maps to 'project_members' table in ERD
 */
export interface ProjectMemberDB {
  id: number
  project_id: number
  staff_id: number
  created_at: string
  role: string  // project_roles_enum
  invited_at: string
  joined_at: string | null
  deleted_at: string | null
}

/**
 * Project member with staff details
 */
export interface ProjectMemberWithStaff extends ProjectMemberDB {
  staff: StaffMember
}

// ============================================================================
// TASK TYPES (Database Schema)
// ============================================================================

/**
 * Task record from database (raw)
 * Maps to 'tasks' table in ERD
 * Note: 'description' field is called 'notes' in some parts of the codebase
 * Note: notes has NOT NULL constraint in database, defaults to 'No notes...'
 */
export interface TaskDB {
  id: number
  title: string
  notes: string  // NOT NULL in database, defaults to 'No notes...'
  project_id: number | null
  parent_task_id: number | null
  creator_id: number
  status: TaskStatus
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  priority: number | null
  repeat_interval: number | null
  deleted_at: string | null
  tags: string[]
}

/**
 * Task with populated relationships (from API)
 * This is what the API typically returns when fetching tasks
 */
export interface TaskFromAPI extends TaskDB {
  // Populated relationships
  creator?: {
    id: number
    fullname: string
  }
  assignees?: Array<{
    assigned_to: {
      id: number
      fullname: string
    }
    assigned_by: {
      id: number
      fullname: string
    } | null
  }>
  project?: {
    id: number
    name: string
  }
  subtasks?: TaskFromAPI[]
}

/**
 * Task formatted for UI display (tables, lists)
 * Uses camelCase and Date objects for easier frontend handling
 */
export interface TaskForUI {
  id: string | number
  title: string
  startDate: Date
  dueDate: Date
  project: string
  project_id?: number | null
  status: TaskStatus
  notes?: string
  priority?: number
  tags?: string[]
  assignees?: Array<{
    id: number
    fullname: string
  }>
}

/**
 * Minimal task data for dropdown actions
 * Used in data table dropdowns for status updates and deletion
 */
export interface TaskForDropdown {
  id: number
  status: TaskStatus
  title?: string
}

/**
 * Input for creating a new task
 */
export interface TaskCreateInput {
  title: string
  start_date?: string | null
  due_date?: string | null
  status?: TaskStatus
  priority?: number | null
  repeat_interval?: number | null
  notes?: string  // Will default to 'No notes...' if not provided
  project_id?: number | null
  assignee_ids?: number[]
  assigned_by_staff_id?: number | null
  tags?: string[]
  subtasks?: Array<{
    title: string
    start_date?: string | null
    due_date?: string | null
    status?: TaskStatus
    priority?: number | null
    notes?: string  // Will default to 'No notes...' if not provided
    assignee_ids?: number[]
    tags?: string[]
  }>
}

/**
 * Input for updating an existing task
 * Note: Uses different field names for compatibility with current API
 */
export interface TaskUpdateInput {
  task_name: string
  start_date: string
  end_date: string | null
  status: TaskStatus
  notes: string  // NOT NULL in database
  assignee_id?: number | null
  tags?: string[]
  priority?: number | null
}

// ============================================================================
// TASK ASSIGNEE TYPES
// ============================================================================

/**
 * Task assignee record from database
 * Maps to 'task_assignees' table in ERD
 */
export interface TaskAssigneeDB {
  id: number
  task_id: number
  assigned_to_staff_id: number
  assigned_by_staff_id: number
  assigned_at: string
  is_active: boolean
  deleted_at: string | null
}

/**
 * Task assignee with staff details
 */
export interface TaskAssigneeWithStaff extends TaskAssigneeDB {
  assigned_to: StaffMember
  assigned_by: StaffMember
}

// ============================================================================
// COMMENT TYPES
// ============================================================================

/**
 * Task comment record from database
 * Maps to 'task_comments' table in ERD
 */
export interface TaskCommentDB {
  id: number
  task_id: number
  staff_id: number
  content: string
  // is_system_generated: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Comment with staff details
 */
export interface TaskCommentWithStaff extends TaskCommentDB {
  staff: StaffMember
}

/**
 * Input for creating a comment
 */
export interface CommentCreateInput {
  task_id: number
  content: string
  // is_system_generated?: boolean
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification record from database
 * Maps to 'notifications' table in ERD
 */
export interface NotificationDB {
  id: number
  staff_id: number
  type: NotificationType
  title: string
  message: string
  related_task_id: number | null
  related_project_id: number | null
  triggered_by_staff_id: number | null
  is_read: boolean
  is_email_sent: boolean
  scheduled_for: string | null
  created_at: string
  deleted_at: string | null
}

/**
 * Notification with populated relationships
 */
export interface NotificationWithRelations extends NotificationDB {
  triggered_by?: StaffMember
  related_task?: TaskDB
  related_project?: ProjectDB
}

// ============================================================================
// ACTIVITY TIMELINE TYPES
// ============================================================================

/**
 * Activity timeline record from database
 * Maps to 'activity_timeline' table in ERD
 */
export interface ActivityTimelineDB {
  id: string  // UUID
  task_id: number
  timestamp: string
  action: string
  staff_id: number  
  deleted_at: string | null
}

/**
 * Activity timeline with staff details
 */
export interface ActivityTimelineWithStaff extends ActivityTimelineDB {
  staff: StaffMember
}


export interface ActivityLogDB {
  id: number
  staff_id: number
  action: ActivityAction
  entity_type: ActivityEntityType
  entity_id: number
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  description: string | null
  created_at: string
}

/**
 * Activity log with staff details
 */
export interface ActivityLogWithStaff extends ActivityLogDB {
  staff: StaffMember
}

// ============================================================================
// REPORT TYPES
// ============================================================================

/**
 * Report record from database
 * Maps to 'reports' table in ERD
 */
export interface ReportDB {
  id: number
  project_id: number
  generated_by: number
  report_type: ReportType
  title: string
  parameters: Record<string, any> | null
  file_path: string | null
  format: ReportFormat
  status: ReportStatus
  generated_at: string
  expires_at: string | null
}

/**
 * Report with populated relationships
 */
export interface ReportWithRelations extends ReportDB {
  project: ProjectDB
  generated_by_staff: StaffMember
}

/**
 * Task completion report metrics
 * Used in manager reports page
 */
export interface TaskCompletionMetrics {
  totalTasks: number
  completedTasks: number
  completedPercentage: string
  inProgressTasks: number
  inProgressPercentage: string
  notStartedTasks: number
  notStartedPercentage: string
  blockedTasks: number
  blockedPercentage: string
  projectedTasks: number
}

/**
 * Task completion report filters
 * Used in manager reports page
 */
export interface TaskCompletionFilters {
  user_id?: number
  project_id?: number
  start_date?: string
  end_date?: string
  userName?: string | null
  projectName?: string | null
}

/**
 * Task completion report data
 * Used in manager reports page
 */
export interface TaskCompletionReportData {
  metrics: TaskCompletionMetrics
  tasks: TaskFromAPI[]
  filters: TaskCompletionFilters
  generatedAt: string
}

/**
 * Logged time report metrics
 * Used in manager reports page
 */
export interface LoggedTimeMetrics {
  totalHours: number
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  avgHoursPerTask: number
  groupCount: number
}

/**
 * Task with time information
 * Used in logged time reports
 */
export interface TaskWithTime {
  id: number
  title: string
  status: string
  created_at: string
  completed_at: string | null
  project_id: number | null
  project_name: string | null
  department: string | null
  logged_hours: number
  is_in_progress: boolean
}

/**
 * Grouped time data for projects or departments
 * Used in logged time reports
 */
export interface GroupedTimeData {
  name: string
  total_hours: number
  completed_tasks: number
  in_progress_tasks: number
  avg_hours_per_task: number
  tasks: TaskWithTime[]
}

/**
 * Logged time report filters
 * Used in manager reports page
 */
export interface LoggedTimeFilters {
  grouping?: 'project' | 'department'
  project_id?: number
  department?: string
  start_date?: string
  end_date?: string
  projectName?: string | null
  departmentName?: string | null
}

/**
 * Logged time report data
 * Used in manager reports page
 */
export interface LoggedTimeReportData {
  metrics: LoggedTimeMetrics
  groupedData: GroupedTimeData[]
  filters: LoggedTimeFilters
  generatedAt: string
}

/**
 * Team member performance data
 * Used in team summary reports
 */
export interface TeamMemberPerformance {
  staff_id: number
  fullname: string
  tasks_completed: number
  tasks_in_progress: number
  tasks_not_started: number
  tasks_blocked: number
  total_tasks: number
  completion_rate: number
  total_hours_logged: number
}

/**
 * Task status breakdown
 * Used in team summary reports
 */
export interface TaskStatusBreakdown {
  not_started: number
  in_progress: number
  completed: number
  blocked: number
  total: number
}

/**
 * Completion trend data point
 * Used in team summary reports
 */
export interface CompletionTrend {
  date: string
  completed_count: number
  total_count: number
}

/**
 * Workload distribution for team members
 * Used in team summary reports
 */
export interface WorkloadDistribution {
  staff_id: number
  fullname: string
  task_count: number
  percentage: number
  variance_from_avg: number
}

/**
 * Team summary report metrics
 * Used in manager reports page
 */
export interface TeamSummaryMetrics {
  statusBreakdown: TaskStatusBreakdown
  overallCompletionRate: number
  overdueTaskCount: number
  totalTeamMembers: number
  avgTasksPerMember: number
  totalHoursLogged: number
}

/**
 * Team summary report filters
 * Used in manager reports page
 */
export interface TeamSummaryFilters {
  project_id?: number
  start_date?: string
  end_date?: string
  period?: 'weekly' | 'monthly'
  projectName?: string | null
}

/**
 * Team summary report data
 * Used in manager reports page
 */
export interface TeamSummaryReportData {
  project: {
    id: number
    name: string
    description: string | null
  }
  metrics: TeamSummaryMetrics
  completionTrends: CompletionTrend[]
  topPerformers: TeamMemberPerformance[]
  teamPerformance: TeamMemberPerformance[]
  workloadDistribution: WorkloadDistribution[]
  filters: TeamSummaryFilters
  generatedAt: string
}

// ============================================================================
// FORM STATE TYPES (UI Components)
// ============================================================================

/**
 * Subtask form state for create/edit modals
 * Uses DateValue from @internationalized/date
 */
export interface SubtaskFormState {
  title: string
  startDate: any  // DateValue from @internationalized/date
  dueDate: any    // DateValue from @internationalized/date
  status: TaskStatus
  priority: number
  repeatInterval: number | null
  notes: string
  assignedTo: string[]  // Array of staff IDs as strings
  tags: string[]  // Array of tag strings
  expanded: boolean
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API success response
 */
export interface APISuccessResponse<T = any> {
  success: true
  data?: T
  message?: string
}

/**
 * Standard API error response
 */
export interface APIErrorResponse {
  success: false
  statusCode: number
  statusMessage: string
  data?: any
}

/**
 * Tasks list response
 */
export interface TasksListResponse {
  tasks: TaskFromAPI[]
  count: number
}

/**
 * Projects list response
 */
export interface ProjectsListResponse {
  projects: ProjectWithRelations[]
  count: number
}

// ============================================================================
// BREADCRUMB TYPES
// ============================================================================

/**
 * Breadcrumb item for navigation
 * Used by useBreadcrumbs composable
 */
export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage: boolean
}

// ============================================================================
// UTILITY & TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Converts a task from API format to UI format for display in tables
 * @param apiTask - Task from API with snake_case fields
 * @param projectName - Optional project name to display
 * @returns Task formatted for UI with camelCase fields and Date objects
 */
export function transformTaskForUI(
  apiTask: TaskFromAPI, 
  projectName?: string
): TaskForUI {
  return {
    id: apiTask.id.toString(),
    title: apiTask.title,
    startDate: apiTask.start_date ? new Date(apiTask.start_date) : new Date(),
    dueDate: apiTask.due_date ? new Date(apiTask.due_date) : new Date(),
    project: projectName || apiTask.project?.name || 'personal',
    project_id: apiTask.project_id || apiTask.project?.id || null,
    status: apiTask.status,
    notes: apiTask.notes || undefined,
    priority: apiTask.priority || undefined,
    tags: apiTask.tags || [],
    assignees: apiTask.assignees?.map(a => ({
      id: a.assigned_to.id,
      fullname: a.assigned_to.fullname
    }))
  }
}

/**
 * Converts ISO date string to DateValue for calendar components
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns DateValue for use with @internationalized/date components
 */
export function parseAPIDate(dateString: string | null): any {
  if (!dateString) return null
  try {
    // Dynamic import to avoid issues if not available
    const { parseDate } = require('@internationalized/date')
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return parseDate(dateString)
    } else {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        const isoString = date.toISOString().split('T')[0]
        return isoString ? parseDate(isoString) : null
      }
    }
  } catch (error) {
    console.warn('Failed to parse date:', dateString, error)
    return null
  }
  return null
}

/**
 * Converts DateValue to ISO date string for API calls
 * @param dateValue - DateValue from @internationalized/date
 * @returns ISO date string (YYYY-MM-DD)
 */
export function dateValueToISO(dateValue: any): string | null {
  if (!dateValue) return null
  try {
    return dateValue.toString()
  } catch {
    return null
  }
}

/**
 * Formats a date for display
 * @param date - Date object or ISO string
 * @param format - Format style ('short', 'long', 'medium')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null, 
  format: 'short' | 'long' | 'medium' = 'medium'
): string {
  if (!date) return '—'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '—'
  
  const formatOptions = {
    short: { year: 'numeric', month: 'short', day: 'numeric' } as const,
    medium: { year: 'numeric', month: 'short', day: 'numeric' } as const,
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' } as const
  }
  
  const options: Intl.DateTimeFormatOptions = formatOptions[format]
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj)
}

/**
 * Checks if a task is overdue
 * @param task - Task object with due_date
 * @returns true if task is overdue and not completed
 */
export function isTaskOverdue(task: TaskDB | TaskFromAPI): boolean {
  if (!task.due_date || task.status === 'completed') return false
  return new Date(task.due_date) < new Date()
}

/**
 * Gets the first assignee from a task (for UI display)
 * @param task - Task with assignees
 * @returns First assignee or 'Unassigned'
 */
export function getTaskAssignee(task: TaskFromAPI): string {
  if (!task.assignees || task.assignees.length === 0) {
    return 'Unassigned'
  }
  return task.assignees[0]?.assigned_to?.fullname || 'Unassigned'
}

/**
 * Converts snake_case to camelCase
 * @param str - String in snake_case
 * @returns String in camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Converts camelCase to snake_case
 * @param str - String in camelCase
 * @returns String in snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Transforms an object from snake_case to camelCase keys
 * @param obj - Object with snake_case keys
 * @returns Object with camelCase keys
 */
export function transformKeysToCamel<T = any>(obj: Record<string, any>): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamel(key)] = value
  }
  return result as T
}

/**
 * Transforms an object from camelCase to snake_case keys
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export function transformKeysToSnake<T = any>(obj: Record<string, any>): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value
  }
  return result as T
}

