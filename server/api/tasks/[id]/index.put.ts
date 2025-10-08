import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  const taskId = getRouterParam(event, 'id')
  const body = await readBody(event)

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

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body is required'
    })
  }

  try {

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

    // Check if task exists before checking permissions
    const { data: taskExists, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
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

    // Get task assignees
    const { data: assigneeRows } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id')
      .eq('task_id', taskId)
      .eq('is_active', true)

    // Check if task is assigned to anyone
    const isTaskAssigned = assigneeRows && assigneeRows.length > 0
    
    if (isTaskAssigned) {
      // If task is assigned, only the assigned person can edit
      const isCurrentUserAssigned = assigneeRows.some((row: any) => row.assigned_to_staff_id === currentStaffId)
      
      if (!isCurrentUserAssigned) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to edit this task. Only assigned staff can edit assigned tasks.'
        })
      }
    } else {
      // If task is unassigned, only the task creator can edit
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('creator_id')
        .eq('id', taskId)
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
          statusMessage: 'You do not have permission to edit this task. Only the task creator can edit unassigned tasks.'
        })
      }
    }

    // Validate and prepare the update data
    const updateData: {
      title?: string
      start_date?: string
      due_date?: string
      status?: string
      notes?: string
    } = {}
    
    if (body.task_name) updateData.title = body.task_name
    if (body.start_date) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.due_date = body.end_date
    if (body.status) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes

    // Update task in database
    const { data: task, error } = await (supabase as any)
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
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

    // Handle assignees update if provided (support both single and multiple)
    if (body.assignee_id !== undefined || body.assignee_ids !== undefined) {
      // Convert to array format for unified handling
      let assigneeIdsToSet: number[] = []
      
      if (body.assignee_ids !== undefined && Array.isArray(body.assignee_ids)) {
        // Multiple assignees (new format)
        assigneeIdsToSet = body.assignee_ids.map((id: any) => Number(id))
        
        // Enforce maximum 5 assignees limit
        if (assigneeIdsToSet.length > 5) {
          throw createError({ statusCode: 400, statusMessage: 'Maximum 5 assignees allowed per task' })
        }
      } else if (body.assignee_id !== undefined) {
        // Single assignee (legacy format)
        if (body.assignee_id !== null) {
          assigneeIdsToSet = [Number(body.assignee_id)]
        }
      }

      // First, deactivate all current assignees
      await (supabase as any)
        .from('task_assignees')
        .update({ is_active: false })
        .eq('task_id', taskId)

      // Enforce minimum 1 assignee requirement
      if (assigneeIdsToSet.length === 0) {
        throw createError({ 
          statusCode: 400, 
          statusMessage: 'At least one assignee is required for the task' 
        })
      }

      // Add or reactivate new assignees
      if (assigneeIdsToSet.length > 0) {
        const assigneeMappings = assigneeIdsToSet.map((staffId) => ({
          task_id: Number(taskId),
          assigned_to_staff_id: staffId,
          assigned_by_staff_id: currentStaffId,
          is_active: true
        }))

        const { error: assignError } = await (supabase as any)
          .from('task_assignees')
          .upsert(assigneeMappings, {
            onConflict: 'task_id,assigned_to_staff_id'
          })

        if (assignError) {
          console.error('Failed to update assignees:', assignError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to update task assignees',
            data: assignError
          })
        }
      }
    }

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
