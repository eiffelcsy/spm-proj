import type { TaskDB } from '~/types'
import { logTaskCreation } from './activityLogger'

/**
 * Service for handling recurring task replication with sequential catch-up logic
 * This function replicates a task when it's completed and has a repeat_interval > 0
 * 
 * Sequential Catch-Up Behavior:
 * - Creates only ONE next occurrence when a task is completed
 * - The next occurrence gets the next sequential due date based on the original schedule
 * - Each occurrence must be completed before the next one is created
 * - All occurrences maintain the repeat_interval to continue the cycle
 * 
 * Example: Task due Oct 14 (1-day interval), completed Oct 21
 * - Creates 1 task with due date Oct 15 and repeat_interval = 1
 * - When Oct 15 task is completed, creates Oct 16 task
 * - When Oct 16 task is completed, creates Oct 17 task
 * - This continues sequentially until caught up to current date
 * 
 * What gets copied:
 * - Task data (title, notes, dates, priority, repeat_interval, tags, etc.)
 * - Assignees
 * - Subtasks (with their assignees)
 * 
 * What does NOT get copied:
 * - Comments (task_comments) - each task instance has its own comment history
 * - Activity logs - new task starts with fresh activity log
 * - Completion data (completed_at is set to null, status is 'not-started')
 */

export interface ReplicateTaskResult {
  success: boolean
  newTask?: TaskDB
  error?: string
}

/**
 * Replicate a completed task to create the next occurrence
 * 
 * @param supabase - Supabase client
 * @param task - The completed task to replicate
 * @returns Result object with success status and new task data
 */
export async function replicateCompletedTask(
  supabase: any,
  task: TaskDB
): Promise<ReplicateTaskResult> {
  try {
    // Validate that task can be replicated
    if (!task.repeat_interval || task.repeat_interval <= 0) {
      return {
        success: false,
        error: 'Task has no repeat interval set'
      }
    }

    if (!task.due_date) {
      return {
        success: false,
        error: 'Task has no due date'
      }
    }

    if (task.status !== 'completed') {
      return {
        success: false,
        error: 'Task is not completed'
      }
    }

    const repeatInterval = task.repeat_interval

    // Calculate the next occurrence's due date (always just one interval forward)
    const currentDueDate = new Date(task.due_date)
    const newDueDate = new Date(currentDueDate.getTime() + (repeatInterval * 24 * 60 * 60 * 1000))
    
    let newStartDate = task.start_date ? new Date(task.start_date) : null
    if (newStartDate) {
      newStartDate = new Date(newStartDate.getTime() + (repeatInterval * 24 * 60 * 60 * 1000))
    }

    console.log(`Task ${task.id}: Creating next occurrence with due date ${newDueDate.toISOString().split('T')[0]}`)

    // Create the new task (copy of the original)
    const newTaskPayload = {
      title: task.title,
      notes: task.notes,
      project_id: task.project_id,
      parent_task_id: task.parent_task_id,
      creator_id: task.creator_id,
      status: 'not-started',
      start_date: newStartDate ? newStartDate.toISOString().split('T')[0] : null,
      due_date: newDueDate.toISOString().split('T')[0],
      priority: task.priority,
      repeat_interval: repeatInterval, // Always continues the recurrence
      tags: task.tags || [],
      completed_at: null
    }

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert([newTaskPayload])
      .select('*')
      .single() as { data: TaskDB | null, error: any }

    if (createError) {
      console.error(`Failed to create recurring task for task ${task.id}:`, createError)
      return {
        success: false,
        error: createError.message || 'Failed to create task'
      }
    }

    if (!newTask) {
      return {
        success: false,
        error: 'No task returned after creation'
      }
    }

    // Log task creation activity
    await logTaskCreation(supabase, newTask.id, task.creator_id)

    // Copy assignees from original task to new task
    const { data: assignees, error: assigneeError } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id, assigned_by_staff_id')
      .eq('task_id', task.id)
      .eq('is_active', true)

    if (!assigneeError && assignees && assignees.length > 0) {
      const assigneeRecords = assignees.map((a: any) => ({
        task_id: newTask.id,
        assigned_to_staff_id: a.assigned_to_staff_id,
        assigned_by_staff_id: a.assigned_by_staff_id,
        is_active: true
      }))

      await supabase
        .from('task_assignees')
        .insert(assigneeRecords)
    }

    // Copy subtasks if they exist
    const { data: subtasks, error: subtasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', task.id)
      .is('deleted_at', null)

    if (!subtasksError && subtasks && subtasks.length > 0) {
      for (const subtask of subtasks as TaskDB[]) {
        // Calculate new dates for subtask
        let subtaskNewDueDate = subtask.due_date ? new Date(subtask.due_date) : null
        let subtaskNewStartDate = subtask.start_date ? new Date(subtask.start_date) : null
        
        if (subtaskNewDueDate) {
          subtaskNewDueDate = new Date(subtaskNewDueDate.getTime() + (repeatInterval * 24 * 60 * 60 * 1000))
        }
        if (subtaskNewStartDate) {
          subtaskNewStartDate = new Date(subtaskNewStartDate.getTime() + (repeatInterval * 24 * 60 * 60 * 1000))
        }

        const newSubtaskPayload = {
          title: subtask.title,
          notes: subtask.notes,
          project_id: subtask.project_id,
          parent_task_id: newTask.id, // Link to the new parent task
          creator_id: subtask.creator_id,
          status: 'not-started',
          start_date: subtaskNewStartDate ? subtaskNewStartDate.toISOString().split('T')[0] : null,
          due_date: subtaskNewDueDate ? subtaskNewDueDate.toISOString().split('T')[0] : null,
          priority: subtask.priority,
          repeat_interval: 0, // Subtasks don't have their own repeat cycle
          tags: subtask.tags || [],
          completed_at: null
        }

        const { data: newSubtask, error: subtaskCreateError } = await supabase
          .from('tasks')
          .insert([newSubtaskPayload])
          .select('*')
          .single() as { data: TaskDB | null, error: any }

        if (!subtaskCreateError && newSubtask) {
          // Log subtask creation
          await logTaskCreation(supabase, newSubtask.id, subtask.creator_id)

          // Copy subtask assignees
          const { data: subtaskAssignees } = await supabase
            .from('task_assignees')
            .select('assigned_to_staff_id, assigned_by_staff_id')
            .eq('task_id', subtask.id)
            .eq('is_active', true)

          if (subtaskAssignees && subtaskAssignees.length > 0) {
            const subtaskAssigneeRecords = subtaskAssignees.map((a: any) => ({
              task_id: newSubtask.id,
              assigned_to_staff_id: a.assigned_to_staff_id,
              assigned_by_staff_id: a.assigned_by_staff_id,
              is_active: true
            }))

            await supabase
              .from('task_assignees')
              .insert(subtaskAssigneeRecords)
          }
        }
      }
    }

    // Set original task's repeat_interval to 0 to prevent re-replication
    await supabase
      .from('tasks')
      .update({ repeat_interval: 0 })
      .eq('id', task.id)

    return {
      success: true,
      newTask
    }
  } catch (error: any) {
    console.error(`Error replicating task ${task.id}:`, error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    }
  }
}

