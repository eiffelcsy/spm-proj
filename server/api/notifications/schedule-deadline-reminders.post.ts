import { serverSupabaseServiceRole } from '#supabase/server'
import { createDeadlineReminderNotification, getTaskDetails } from '../../utils/notificationService'

/**
 * Scheduled job to create deadline reminder notifications
 * This should be called once daily to check for tasks due in 24 hours
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  
  try {
    // Calculate tomorrow's date
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    // Format dates for database query (YYYY-MM-DD)
    const todayStr = now.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    // Find tasks due tomorrow
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        priority,
        project_id,
        project:project_id (
          name
        )
      `)
      .eq('due_date', tomorrowStr)
      .neq('status', 'completed')
      .is('deleted_at', null)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks for deadline reminders',
        data: error
      })
    }

    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        message: 'No tasks due in 24 hours',
        notificationsCreated: 0
      }
    }

    let notificationsCreated = 0

    // Create notifications for each task's assignees
    for (const task of tasks as any[]) {
      // Get all assignees for this task
      const { data: assignees, error: assigneeError } = await supabase
        .from('task_assignees')
        .select('assigned_to_staff_id')
        .eq('task_id', task.id)
        .eq('is_active', true)

      if (assigneeError) {
        console.error(`Failed to fetch assignees for task ${task.id}:`, assigneeError)
        continue
      }

      if (!assignees || assignees.length === 0) {
        continue
      }

      // Create notification for each assignee
      for (const assignee of assignees as any[]) {
        const success = await createDeadlineReminderNotification(
          supabase,
          task.id,
          assignee.assigned_to_staff_id,
          task.title,
          task.due_date,
          task.priority || 'Not set',
          task.project?.name
        )

        if (success) {
          notificationsCreated++
        }
      }
    }

    return {
      success: true,
      message: `Created ${notificationsCreated} deadline reminder notifications`,
      notificationsCreated,
      tasksProcessed: tasks.length
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error
    })
  }
})
