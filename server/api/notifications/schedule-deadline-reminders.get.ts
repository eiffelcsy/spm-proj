import { serverSupabaseServiceRole } from '#supabase/server'
import { createDeadlineReminderNotification } from '../../utils/notificationService'

/**
 * Scheduled job to create deadline reminder notifications
 * This should be called once daily to check for tasks due in 24 hours
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  
  try {
    console.log('Cron job started at:', new Date().toISOString())
    
    // Calculate tomorrow's date in Singapore timezone (UTC+8)
    const now = new Date()
    
    // Get current time in Singapore timezone
    const singaporeTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}))
    
    // Get tomorrow in Singapore timezone
    const tomorrow = new Date(singaporeTime)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Format date for database query (YYYY-MM-DD) in Singapore timezone
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA", {timeZone: "Asia/Singapore"})
    
    console.log('Current Singapore time:', singaporeTime.toISOString())
    console.log('Looking for tasks due on:', tomorrowStr)
    
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
      console.error('Database error fetching tasks:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks for deadline reminders',
        data: error
      })
    }

    console.log(`Found ${tasks?.length || 0} tasks due tomorrow`)

    if (!tasks || tasks.length === 0) {
      console.log('No tasks due in 24 hours - cron job completed successfully')
      return {
        success: true,
        message: 'No tasks due in 24 hours',
        notificationsCreated: 0
      }
    }

    let notificationsCreated = 0

    // Create notifications for each task's assignees
    for (const task of tasks as any[]) {
      console.log(`Processing task: ${task.title} (ID: ${task.id})`)
      
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
        console.log(`No active assignees found for task ${task.id}`)
        continue
      }

      console.log(`Found ${assignees.length} assignees for task ${task.id}`)

      // Create notification for each assignee
      for (const assignee of assignees as any[]) {
        try {
          console.log(`=== DEBUGGING STAFF ${assignee.assigned_to_staff_id} ===`)
          
          // Check if staff has email
          const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('user_id, fullname')
            .eq('id', assignee.assigned_to_staff_id)
            .single()
          
          console.log('Staff data:', staffData)
          console.log('Staff error:', staffError)
          
          if (staffData?.user_id) {
            // Check auth user
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(staffData.user_id)
            console.log('User data:', userData?.user?.email)
            console.log('User error:', userError)
          }
          
          const notification = await createDeadlineReminderNotification(
            supabase,
            task.id,
            assignee.assigned_to_staff_id,
            task.title,
            task.priority,
            task.project?.name
          )

          if (notification) {
            notificationsCreated++
            console.log(`✅ Created notification for staff ${assignee.assigned_to_staff_id} for task ${task.id}`)
            
            // Check if email was sent
            const { data: updatedNotification } = await supabase
              .from('notifications')
              .select('is_email_sent')
              .eq('id', notification.id)
              .single()
            
            console.log(`📧 Email sent status: ${updatedNotification?.is_email_sent}`)
          } else {
            console.error(`❌ Failed to create notification for staff ${assignee.assigned_to_staff_id} for task ${task.id}`)
          }
        } catch (notificationError) {
          console.error(`❌ Error creating notification for staff ${assignee.assigned_to_staff_id} for task ${task.id}:`, notificationError)
        }
      }
    }

    console.log(`Cron job completed successfully. Created ${notificationsCreated} notifications for ${tasks.length} tasks`)
    
    return {
      success: true,
      message: `Created ${notificationsCreated} deadline reminder notifications`,
      notificationsCreated,
      tasksProcessed: tasks.length
    }
  } catch (error: any) {
    console.error('Cron job failed:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    })
    
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

