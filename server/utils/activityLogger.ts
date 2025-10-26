/**
 * Activity logging utility for task actions
 * 
 * This module provides comprehensive activity logging for all task-related operations.
 * It logs activities to the activity_timeline table with detailed information about
 * what changed, when it changed, and who made the change.
 * 
 * Features:
 * - Detailed field change tracking (old value → new value)
 * - Smart change detection (only logs actual changes)
 * - Human-readable formatting for different field types
 * - Automatic staff name resolution for assignments
 */

export interface ActivityLogEntry {
  task_id: number
  action: string
  staff_id: number
  timestamp?: string
}

/**
 * Core function to log an activity to the activity_timeline table
 * 
 * This is the base function that all other logging functions use.
 * It handles the actual database insertion and error handling.
 * 
 * @param supabase - Supabase service role client
 * @param entry - Activity log entry containing task_id, action, staff_id, and optional timestamp
 * @returns Promise<boolean> - Success status (true if logged successfully, false otherwise)
 */
export async function logActivity(
  supabase: any,
  entry: ActivityLogEntry
): Promise<boolean> {
  try {
    // Insert activity log entry into the activity_timeline table
    const { error } = await supabase
      .from('activity_timeline')
      .insert([{
        task_id: entry.task_id,
        action: entry.action,
        staff_id: entry.staff_id,
        timestamp: entry.timestamp || new Date().toISOString() // Use current timestamp if not provided
      }])

    if (error) {
      console.error('Failed to log activity:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error logging activity:', error)
    return false
  }
}

/**
 * Logs task creation activity
 * 
 * Called when a new task is created (including subtasks).
 * Creates a simple "Task Created" entry in the activity timeline.
 * 
 * @param supabase - Supabase service role client
 * @param taskId - ID of the created task
 * @param userId - ID of the user who created the task
 * @returns Promise<boolean> - Success status
 */
export async function logTaskCreation(
  supabase: any,
  taskId: number,
  userId: number
): Promise<boolean> {
  return logActivity(supabase, {
    task_id: taskId,
    action: 'Task Created',
    staff_id: userId
  })
}
/**
 * Logs task update activity with specific field changes
 * 
 * This is the most complex logging function. It takes an array of field changes
 * and creates a detailed, human-readable description of what was updated.
 * 
 * Features:
 * - Formats field names (snake_case → Title Case)
 * - Handles different data types (dates, text, numbers)
 * - Filters out unchanged values
 * - Truncates long text for readability
 * - Only logs if there are actual changes
 * 
 * @param supabase - Supabase service role client
 * @param taskId - ID of the updated task
 * @param userId - ID of the user who updated the task
 * @param changes - Array of field changes with old and new values
 * @returns Promise<boolean> - Success status
 */
export async function logTaskUpdate(
  supabase: any,
  taskId: number,
  userId: number,
  changes: Array<{ field: string, oldValue: any, newValue: any }>
): Promise<boolean> {
  // If no changes provided, log a generic update
  if (changes.length === 0) {
    return logActivity(supabase, {
      task_id: taskId,
      action: 'Updated',
      staff_id: userId
    })
  }

  // Create detailed change descriptions for each field
  const changeDescriptions = changes.map(change => {
    const { field, oldValue, newValue } = change
    
    // Convert snake_case field names to Title Case for display
    const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    // Handle different field types with appropriate formatting
    switch (field) {
      case 'title':
        // Show title changes with quotes for clarity
        return `${fieldName}: "${oldValue}" → "${newValue}"`
        
      case 'start_date':
      case 'due_date':
        // Format dates consistently and only show if actually different
        const oldDate = oldValue ? new Date(oldValue).toLocaleDateString() : 'Not set'
        const newDate = newValue ? new Date(newValue).toLocaleDateString() : 'Not set'
        // Only show the change if dates are actually different
        if (oldDate === newDate) {
          return null // Don't log unchanged dates
        }
        return `${fieldName}: ${oldDate} → ${newDate}`
        
      case 'status':
        // Format status values to proper case (e.g., "not-started" → "Not Started")
        const formatStatus = (status: string) => {
          return status.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        }
        const formattedOldStatus = formatStatus(oldValue)
        const formattedNewStatus = formatStatus(newValue)
        return `${fieldName}: ${formattedOldStatus} → ${formattedNewStatus}`
        
      case 'notes':
        // Truncate long notes and handle null values
        const oldNotes = oldValue ? `"${oldValue.substring(0, 50)}${oldValue.length > 50 ? '...' : ''}"` : 'null'
        const newNotes = newValue ? `"${newValue.substring(0, 50)}${newValue.length > 50 ? '...' : ''}"` : 'null'
        return `${fieldName}: ${oldNotes} → ${newNotes}`
        
      case 'priority':
        // Handle priority with fallback for null values
        return `${fieldName}: ${oldValue || 'Not set'} → ${newValue || 'Not set'}`
        
      case 'repeat_interval':
        // Handle repeat interval with descriptive text
        const formatRepeatInterval = (interval: number | string | null) => {
          if (!interval || interval === '0') return 'Does not repeat'
          const numericInterval = typeof interval === 'string' ? parseInt(interval) : interval
          if (numericInterval === 1) return 'Daily'
          if (numericInterval === 7) return 'Weekly'
          if (numericInterval === 30) return 'Monthly'
          if (numericInterval === 365) return 'Yearly'
          return `Every ${numericInterval} days`
        }
        const formattedOldInterval = formatRepeatInterval(oldValue)
        const formattedNewInterval = formatRepeatInterval(newValue)
        return `${fieldName}: ${formattedOldInterval} → ${formattedNewInterval}`
        
      default:
        // Generic formatting for any other fields
        return `${fieldName}: ${oldValue} → ${newValue}`
    }
  }).filter(description => description !== null) // Remove null descriptions (unchanged fields)

  // If no actual changes after filtering, don't log anything
  if (changeDescriptions.length === 0) {
    return true // Return success but don't log
  }

  // Log each change as a separate activity entry for better readability
  const logPromises = changeDescriptions.map(description => 
    logActivity(supabase, {
      task_id: taskId,
      action: `Updated ${description}`,
      staff_id: userId
    })
  )
  
  // Wait for all activity logs to complete
  const results = await Promise.all(logPromises)
  return results.every(result => result === true)
}
/**
 * Logs task completion activity
 * 
 * Called when a task's status is changed to 'completed'.
 * Creates a simple "completed" entry in the activity timeline.
 * 
 * @param supabase - Supabase service role client
 * @param taskId - ID of the completed task
 * @param userId - ID of the user who completed the task
 * @returns Promise<boolean> - Success status
 */
export async function logTaskCompletion(
  supabase: any,
  taskId: number,
  userId: number
): Promise<boolean> {
  return logActivity(supabase, {
    task_id: taskId,
    action: 'Completed',
    staff_id: userId
  })
}
/**
 * Logs task deletion activity
 * 
 * Called when a task is soft-deleted (deleted_at timestamp is set).
 * Creates a "deleted" entry in the activity timeline.
 * 
 * @param supabase - Supabase service role client
 * @param taskId - ID of the deleted task
 * @param userId - ID of the user who deleted the task
 * @returns Promise<boolean> - Success status
 */
export async function logTaskDeletion(
  supabase: any,
  taskId: number,
  userId: number
): Promise<boolean> {
  return logActivity(supabase, {
    task_id: taskId,
    action: 'Deleted',
    staff_id: userId
  })
}
/**
 * Logs task assignment activity
 * 
 * Called when a user is assigned to a task. This function fetches the
 * assignee's name from the staff table to create a more readable log entry.
 * 
 * @param supabase - Supabase service role client
 * @param taskId - ID of the task
 * @param userId - ID of the user who assigned the task
 * @param assigneeId - ID of the user who was assigned the task
 * @returns Promise<boolean> - Success status
 */
export async function logTaskAssignment(
  supabase: any,
  taskId: number,
  userId: number,
  assigneeId: number
): Promise<boolean> {
  // Fetch assignee's name from staff table for better readability
  const { data: assigneeData } = await supabase
    .from('staff')
    .select('fullname')
    .eq('id', assigneeId)
    .single() as { data: { fullname: string } | null }

  // Use full name if available, otherwise fall back to user ID
  const assigneeName = assigneeData?.fullname || `user ${assigneeId}`
  
  return logActivity(supabase, {
    task_id: taskId,
    action: `Assigned to ${assigneeName}`,
    staff_id: userId
  })
}

/**
 * Logs task unassignment activity
 * 
 * Called when a user is unassigned from a task. This function fetches the
 * unassigned user's name from the staff table to create a more readable log entry.
 * 
 * @param supabase - Supabase service role client
 * @param taskId - ID of the task
 * @param userId - ID of the user who unassigned the task
 * @param unassignedUserId - ID of the user who was unassigned from the task
 * @returns Promise<boolean> - Success status
 */
export async function logTaskUnassignment(
  supabase: any,
  taskId: number,
  userId: number,
  unassignedUserId: number
): Promise<boolean> {
  // Fetch unassigned user's name from staff table for better readability
  const { data: unassignedUserData } = await supabase
    .from('staff')
    .select('fullname')
    .eq('id', unassignedUserId)
    .single() as { data: { fullname: string } | null }

  // Use full name if available, otherwise fall back to user ID
  const unassignedUserName = unassignedUserData?.fullname || `user ${unassignedUserId}`
  
  return logActivity(supabase, {
    task_id: taskId,
    action: `Unassigned ${unassignedUserName}`,
    staff_id: userId
  })
}
