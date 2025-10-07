import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

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

    // First, check if the task exists
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', numericTaskId)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Task not found'
        })
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

    // Soft delete all subtasks first
    const { error: subtasksSoftDeleteError } = await (supabase as any)
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('parent_task_id', numericTaskId)
      .is('deleted_at', null)

    if (subtasksSoftDeleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to soft delete subtasks',
        data: subtasksSoftDeleteError
      })
    }

    // Soft delete the main task
    const { data: softDeletedData, error: softDeleteError } = await (supabase as any)
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', numericTaskId)
      .is('deleted_at', null)
      .select()

    if (softDeleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to soft delete task',
        data: softDeleteError
      })
    }

    if (!softDeletedData || softDeletedData.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Task not found or already deleted'
      })
    }

    return {
      success: true,
      message: 'Task deleted successfully',
      deletedTask: softDeletedData?.[0] || null
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
