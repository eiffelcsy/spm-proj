import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { TaskDB } from '~/types'
import { logTaskDeletion } from '../../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  const taskId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - User not authenticated'
    })
  }

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  try {
    // Convert taskId to number if it's a string
    const numericTaskId = typeof taskId === 'string' ? parseInt(taskId) : taskId
    
    if (isNaN(numericTaskId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid task ID format'
      })
    }

    // Get current user's staff ID
    const { data: staffIdData, error: staffIdError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (staffIdError || !staffIdData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID',
        data: staffIdError
      })
    }
    const currentStaffId = (staffIdData as { id: number }).id

    // First, check if the task exists (only non-deleted tasks)
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, deleted_at')
      .eq('id', numericTaskId)
      .is('deleted_at', null)
      .single() as { data: Pick<TaskDB, 'id' | 'deleted_at'> | null, error: any }

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Check if task exists but is soft-deleted
        const { data: deletedTask } = await supabase
          .from('tasks')
          .select('id, deleted_at')
          .eq('id', numericTaskId)
          .not('deleted_at', 'is', null)
          .maybeSingle() as { data: Pick<TaskDB, 'id' | 'deleted_at'> | null, error: any }
        
        if (deletedTask) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Task not found'
          })
        } else {
          throw createError({
            statusCode: 404,
            statusMessage: 'Task not found'
          })
        }
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch task for deletion',
        data: fetchError
      })
    }

    // Get task assignees
    const { data: assigneeRows } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id')
      .eq('task_id', numericTaskId)
      .eq('is_active', true)

    // Check if task is assigned to anyone
    const isTaskAssigned = assigneeRows && assigneeRows.length > 0
    
    if (isTaskAssigned) {
      // If task is assigned, only the assigned person can delete
      const isCurrentUserAssigned = assigneeRows.some((row: any) => row.assigned_to_staff_id === currentStaffId)
      
      if (!isCurrentUserAssigned) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to delete this task. Only assigned staff can delete assigned tasks.'
        })
      }
    } else {
      // If task is unassigned, only the task creator can delete
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('creator_id')
        .eq('id', numericTaskId)
        .single() as { data: { creator_id: number } | null, error: any }

      if (taskError || !taskData) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch task creator information'
        })
      }

      if (taskData.creator_id !== currentStaffId) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to delete this task. Only the task creator can delete unassigned tasks.'
        })
      }
    }

    // Check if this task has subtasks (only non-deleted subtasks)
    const { data: subtasks, error: subtaskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('parent_task_id', numericTaskId)
      .is('deleted_at', null) as { data: Pick<TaskDB, 'id'>[] | null, error: any }

    if (subtaskError) {
      // Could not check for subtasks, but continue with deletion
    } else if (subtasks && subtasks.length > 0) {
      // Task has active subtasks - soft delete them first
      const subtaskIds = subtasks.map(subtask => subtask.id)
      const { error: subtasksDeleteError } = await (supabase as any)
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', subtaskIds)

      if (subtasksDeleteError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to soft delete subtasks',
          data: subtasksDeleteError
        })
      }
    }

    // Soft delete the task by setting deleted_at timestamp
    const { data: deletedData, error: deleteError } = await (supabase as any)
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', numericTaskId)
      .select() as { data: TaskDB[] | null, error: any }

    if (deleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to soft delete task',
        data: deleteError
      })
    }

    if (!deletedData || deletedData.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Task not found or already deleted'
      })
    }

    // Log task deletion activity
    await logTaskDeletion(supabase, numericTaskId, currentStaffId)

    return {
      success: true,
      message: 'Task soft deleted successfully',
      deletedTask: deletedData?.[0] || null
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
