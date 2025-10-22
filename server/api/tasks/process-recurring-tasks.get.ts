import { serverSupabaseServiceRole } from '#supabase/server'
import type { TaskDB } from '~/types'
import { replicateCompletedTask } from '../../utils/recurringTaskService'

/**
 * Scheduled job to process recurring tasks
 * This should be called once daily as a safety net to catch any tasks that weren't replicated on completion
 * 
 * Logic:
 * - Find completed tasks with repeat_interval > 0
 * - These are tasks that were marked complete but for some reason weren't replicated
 * - Create a new copy of the task with adjusted dates
 * - Set the original task's repeat_interval to 0 to prevent exponential replication
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  
  try {
    // Find completed tasks with repeat_interval > 0 that need to be replicated
    // These are tasks that were marked complete but somehow weren't replicated
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .gt('repeat_interval', 0)
      .eq('status', 'completed')
      .not('due_date', 'is', null)
      .is('deleted_at', null)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch recurring tasks',
        data: error
      })
    }

    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        message: 'No completed recurring tasks to process',
        tasksProcessed: 0,
        tasksCreated: 0
      }
    }

    let tasksProcessed = 0
    let tasksCreated = 0
    const processedTasks: Array<{ originalId: number, newId: number, title: string }> = []

    // Process each completed recurring task
    for (const task of tasks as TaskDB[]) {
      try {
        const result = await replicateCompletedTask(supabase, task)
        
        if (result.success && result.newTask) {
          tasksCreated++
          processedTasks.push({
            originalId: task.id,
            newId: result.newTask.id,
            title: task.title
          })
          console.log(`Cron job: Successfully replicated completed task ${task.id}: created task ${result.newTask.id}`)
        } else {
          console.error(`Cron job: Failed to replicate task ${task.id}:`, result.error)
        }

        tasksProcessed++
      } catch (taskError) {
        console.error(`Cron job: Error processing recurring task ${task.id}:`, taskError)
        continue
      }
    }

    return {
      success: true,
      message: `Processed ${tasksProcessed} recurring tasks, created ${tasksCreated} new tasks`,
      tasksProcessed,
      tasksCreated,
      processedTasks
    }
  } catch (error: any) {
    console.error('Recurring tasks cron job failed:', error)
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

