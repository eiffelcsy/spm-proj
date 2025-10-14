/**
 * Notification service for creating and managing in-app notifications
 * 
 * This service provides functions to create notifications for various events
 * in the task management system, following the acceptance criteria requirements.
 */

import type { NotificationDB, NotificationType } from '~/types'

export interface CreateNotificationParams {
  staffId: number
  type: NotificationType
  title: string
  message: string
  relatedTaskId?: number
  relatedProjectId?: number
  triggeredByStaffId?: number
  scheduledFor?: string
}

/**
 * Create a notification in the database
 */
export async function createNotification(
  supabase: any,
  params: CreateNotificationParams
): Promise<NotificationDB | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        staff_id: params.staffId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_task_id: params.relatedTaskId || null,
        related_project_id: params.relatedProjectId || null,
        triggered_by_staff_id: params.triggeredByStaffId || null,
        scheduled_for: params.scheduledFor || null,
        is_read: false,
        is_email_sent: false
      }])
      .select()
      .single()

    if (error) {
      console.error('Failed to create notification:', error)
      return null
    }

    return data as NotificationDB
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * Create notification for task assignment
 */
export async function createTaskAssignmentNotification(
  supabase: any,
  taskId: number,
  assigneeStaffId: number,
  assignerStaffId: number,
  taskTitle: string,
  projectName?: string
): Promise<NotificationDB | null> {
  const title = 'Task Assigned'
  const message = projectName 
    ? `You have been assigned to "${taskTitle}" in project "${projectName}"`
    : `You have been assigned to "${taskTitle}"`

  return createNotification(supabase, {
    staffId: assigneeStaffId,
    type: 'task_assigned',
    title,
    message,
    relatedTaskId: taskId,
    triggeredByStaffId: assignerStaffId
  })
}

/**
 * Create notification for task unassignment
 */
export async function createTaskUnassignmentNotification(
  supabase: any,
  taskId: number,
  unassignedStaffId: number,
  unassignerStaffId: number,
  taskTitle: string,
  projectName?: string
): Promise<NotificationDB | null> {
  const title = 'Task Unassigned'
  const message = projectName 
    ? `You have been removed from "${taskTitle}" in project "${projectName}"`
    : `You have been removed from "${taskTitle}"`

  return createNotification(supabase, {
    staffId: unassignedStaffId,
    type: 'task_updated',
    title,
    message,
    relatedTaskId: taskId,
    triggeredByStaffId: unassignerStaffId
  })
}

/**
 * Create notification for task deletion
 */
export async function createTaskDeletionNotification(
  supabase: any,
  taskId: number,
  assigneeStaffId: number,
  deleterStaffId: number,
  taskTitle: string,
  projectName?: string
): Promise<NotificationDB | null> {
  const title = 'Task Deleted'
  const message = projectName 
    ? `Task "${taskTitle}" in project "${projectName}" has been deleted`
    : `Task "${taskTitle}" has been deleted`

  return createNotification(supabase, {
    staffId: assigneeStaffId,
    type: 'task_updated',
    title,
    message,
    relatedTaskId: taskId,
    triggeredByStaffId: deleterStaffId
  })
}

/**
 * Create notification for task updates
 */
export async function createTaskUpdateNotification(
  supabase: any,
  taskId: number,
  assigneeStaffId: number,
  updaterStaffId: number,
  taskTitle: string,
  changes: string,
  projectName?: string
): Promise<NotificationDB | null> {
  const title = 'Task Updated'
  const message = projectName 
    ? `Task "${taskTitle}" in project "${projectName}" has been updated: ${changes}`
    : `Task "${taskTitle}" has been updated: ${changes}`

  return createNotification(supabase, {
    staffId: assigneeStaffId,
    type: 'task_updated',
    title,
    message,
    relatedTaskId: taskId,
    triggeredByStaffId: updaterStaffId
  })
}

/**
 * Create notification for deadline reminder (24 hours before due date)
 */
export async function createDeadlineReminderNotification(
  supabase: any,
  taskId: number,
  assigneeStaffId: number,
  taskTitle: string,
  dueDate: string,
  priority: string,
  projectName?: string
): Promise<NotificationDB | null> {
  const title = 'Task Due Soon'
  const message = projectName 
    ? `Task "${taskTitle}" in project "${projectName}" is due in 24 hours (Priority: ${priority})`
    : `Task "${taskTitle}" is due in 24 hours (Priority: ${priority})`

  return createNotification(supabase, {
    staffId: assigneeStaffId,
    type: 'deadline_reminder',
    title,
    message,
    relatedTaskId: taskId
  })
}

/**
 * Create notification for new comment
 */
export async function createCommentNotification(
  supabase: any,
  taskId: number,
  assigneeStaffId: number,
  commenterStaffId: number,
  taskTitle: string,
  commentMessage: string,
  projectName?: string
): Promise<NotificationDB | null> {
  const title = 'New Comment'
  const truncatedComment = commentMessage.length > 100 
    ? commentMessage.substring(0, 100) + '...'
    : commentMessage
  
  const message = projectName 
    ? `New comment on "${taskTitle}" in project "${projectName}": "${truncatedComment}"`
    : `New comment on "${taskTitle}": "${truncatedComment}"`

  return createNotification(supabase, {
    staffId: assigneeStaffId,
    type: 'comment_added',
    title,
    message,
    relatedTaskId: taskId,
    triggeredByStaffId: commenterStaffId
  })
}

/**
 * Get all assignees for a task
 */
export async function getTaskAssignees(
  supabase: any,
  taskId: number
): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id')
      .eq('task_id', taskId)
      .eq('is_active', true)

    if (error) {
      console.error('Failed to fetch task assignees:', error)
      return []
    }

    return data?.map((row: { assigned_to_staff_id: number }) => row.assigned_to_staff_id) || []
  } catch (error) {
    console.error('Error fetching task assignees:', error)
    return []
  }
}

/**
 * Get task details for notifications
 */
export async function getTaskDetails(
  supabase: any,
  taskId: number
): Promise<{ title: string; projectName?: string } | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        title,
        project_id,
        project:project_id (
          name
        )
      `)
      .eq('id', taskId)
      .single()

    if (error || !data) {
      console.error('Failed to fetch task details:', error)
      return null
    }

    return {
      title: data.title,
      projectName: data.project?.name
    }
  } catch (error) {
    console.error('Error fetching task details:', error)
    return null
  }
}

/**
 * Get staff details for notifications
 */
export async function getStaffDetails(
  supabase: any,
  staffId: number
): Promise<{ fullname: string } | null> {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('fullname')
      .eq('id', staffId)
      .single()

    if (error || !data) {
      console.error('Failed to fetch staff details:', error)
      return null
    }

    return { fullname: data.fullname }
  } catch (error) {
    console.error('Error fetching staff details:', error)
    return null
  }
}

/**
 * Permanently delete old soft-deleted notifications (cleanup function)
 * This should be run periodically to clean up old deleted notifications
 */
export async function cleanupDeletedNotifications(
  supabase: any,
  daysOld: number = 30
): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('Failed to cleanup deleted notifications:', error)
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('Error cleaning up deleted notifications:', error)
    return 0
  }
}
