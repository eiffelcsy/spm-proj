import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  console.log('DELETE /api/tasks/[id] - Starting delete request')
  
  const supabase = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  const taskId = getRouterParam(event, 'id')

  console.log('DELETE /api/tasks/[id] - User:', user?.id)
  console.log('DELETE /api/tasks/[id] - Supabase client initialized:', !!supabase)

  // TODO: Re-enable user authentication check once user-staff mapping is implemented
  // if (!user) {
  //   throw createError({
  //     statusCode: 401,
  //     statusMessage: 'Unauthorized - User not authenticated'
  //   })
  // }

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  try {
    console.log('DELETE /api/tasks/[id] - Task ID:', taskId, 'Type:', typeof taskId)

    // Convert taskId to number if it's a string
    const numericTaskId = typeof taskId === 'string' ? parseInt(taskId) : taskId
    
    if (isNaN(numericTaskId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid task ID format'
      })
    }

    console.log('DELETE /api/tasks/[id] - Numeric Task ID:', numericTaskId)

    // First, check if the task exists
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, creator_id, assignee_id')
      .eq('id', numericTaskId)
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

    // TODO: Add permission check when user-staff mapping is implemented
    // For now, allow deletion (you may want to add proper permission checks)

    // Check if this task has subtasks
    const { data: subtasks, error: subtaskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('parent_task_id', numericTaskId)

    if (subtaskError) {
      console.warn('DELETE /api/tasks/[id] - Could not check for subtasks:', subtaskError)
    } else if (subtasks && subtasks.length > 0) {
      console.log('DELETE /api/tasks/[id] - Task has subtasks:', subtasks.length)
      // For now, we'll still allow deletion - the database should handle cascading
      // You might want to prevent deletion or delete subtasks first depending on your business logic
    }

    // Delete the task
    console.log('DELETE /api/tasks/[id] - Attempting to delete task with ID:', numericTaskId)
    
    const { data: deletedData, error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', numericTaskId)
      .select()

    console.log('DELETE /api/tasks/[id] - Delete query result:')
    console.log('  - deletedData:', deletedData)
    console.log('  - deleteError:', deleteError)

    if (deleteError) {
      console.error('DELETE /api/tasks/[id] - Database error:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete task',
        data: deleteError
      })
    }

    if (!deletedData || deletedData.length === 0) {
      console.warn('DELETE /api/tasks/[id] - No rows were deleted. Task may not exist.')
      throw createError({
        statusCode: 404,
        statusMessage: 'Task not found or already deleted'
      })
    }

    console.log('DELETE /api/tasks/[id] - Success, task deleted:', taskId)
    console.log('DELETE /api/tasks/[id] - Deleted data:', deletedData)

    return {
      success: true,
      message: 'Task deleted successfully',
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
