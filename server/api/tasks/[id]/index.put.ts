import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const taskId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body is required'
    })
  }

  try {
    console.log('PUT /api/tasks/[id] - Request body:', body)
    console.log('PUT /api/tasks/[id] - Task ID:', taskId)

    // First, get the current task to check permissions
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('creator_id, assignee_id')
      .eq('id', taskId)
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
        statusMessage: 'Failed to fetch task for permission check',
        data: fetchError
      })
    }

    // TODO: STAFF MODULE INTEGRATION REQUIRED
    // For now, we'll skip permission validation until user-staff mapping is implemented
    // Once staff module is ready, uncomment and implement this permission check:
    /*
    // Get current user's staff ID
    const { data: userStaffMapping, error: mappingError } = await supabase
      .from('user_staff_mapping')
      .select('staff_id')
      .eq('user_id', event.context.user?.id)
      .single()

    if (mappingError || !userStaffMapping) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Unable to verify user permissions'
      })
    }

    const userStaffId = userStaffMapping.staff_id

    // Check if user is creator or assignee
    const canEdit = currentTask.creator_id === userStaffId || currentTask.assignee_id === userStaffId

    if (!canEdit) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to edit this task. Only the creator or assignee can edit it.'
      })
    }
    */

    // Validate and prepare the update data
    const updateData: any = {}
    
    if (body.task_name) updateData.title = body.task_name
    if (body.start_date) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.due_date = body.end_date
    if (body.status) updateData.status = body.status
    if (body.description !== undefined) updateData.description = body.description
    if (body.assignee_id !== undefined) updateData.assignee_id = body.assignee_id

    console.log('PUT /api/tasks/[id] - Update data:', updateData)

    // Update task in database
    const { data: task, error } = await supabase
      .from('tasks')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updateData as any)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('PUT /api/tasks/[id] - Database error:', error)
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Task not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update task',
        data: error
      })
    }

    console.log('PUT /api/tasks/[id] - Success, updated task:', task)

    return {
      success: true,
      task
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
