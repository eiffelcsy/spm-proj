import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { logTaskUpdate, logTaskAssignment, logTaskCompletion } from '../../../utils/activityLogger'

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

    // Check if task exists before checking permissions (excluding soft-deleted tasks)
    const { data: taskExists, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
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

    // Get current task data to compare changes
    const { data: currentTask, error: currentTaskError } = await supabase
      .from('tasks')
      .select('title, start_date, due_date, status, notes, priority, repeat_interval')
      .eq('id', taskId)
      .single() as { data: { title: string, start_date: string | null, due_date: string | null, status: string, notes: string, priority: string | null, repeat_interval: number | null } | null, error: any }

    if (currentTaskError || !currentTask) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch current task data',
        data: currentTaskError
      })
    }

    // Validate and prepare the update data
    const updateData: {
      title?: string
      start_date?: string
      due_date?: string
      status?: string
      notes?: string
      priority?: string
      repeat_interval?: number
    } = {}
    
    if (body.task_name) updateData.title = body.task_name
    if (body.start_date) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.due_date = body.end_date
    if (body.status) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.repeat_interval !== undefined) updateData.repeat_interval = body.repeat_interval

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

    // Log task update activity with detailed changes
    const changes: Array<{ field: string, oldValue: any, newValue: any }> = []
    
    // Helper function to normalize date values for comparison
    const normalizeDate = (date: string | null) => {
      if (!date) return null
      // Convert to ISO date string (YYYY-MM-DD) for consistent comparison
      return new Date(date).toISOString().split('T')[0]
    }
    
    // Only log changes for fields that are actually being updated and are different
    if (body.task_name !== undefined && body.task_name !== currentTask.title) {
      changes.push({ field: 'title', oldValue: currentTask.title, newValue: body.task_name })
    }
    if (body.start_date !== undefined && normalizeDate(body.start_date) !== normalizeDate(currentTask.start_date)) {
      changes.push({ field: 'start_date', oldValue: currentTask.start_date, newValue: body.start_date })
    }
    if (body.end_date !== undefined && normalizeDate(body.end_date) !== normalizeDate(currentTask.due_date)) {
      changes.push({ field: 'due_date', oldValue: currentTask.due_date, newValue: body.end_date })
    }
    if (body.status !== undefined && body.status !== currentTask.status) {
      changes.push({ field: 'status', oldValue: currentTask.status, newValue: body.status })
    }
    if (body.notes !== undefined && body.notes !== currentTask.notes) {
      changes.push({ field: 'notes', oldValue: currentTask.notes, newValue: body.notes })
    }
    if (body.priority !== undefined && String(body.priority) !== String(currentTask.priority)) {
      changes.push({ field: 'priority', oldValue: currentTask.priority, newValue: body.priority })
    }
    if (body.repeat_interval !== undefined && String(body.repeat_interval) !== String(currentTask.repeat_interval)) {
      changes.push({ field: 'repeat_interval', oldValue: currentTask.repeat_interval, newValue: body.repeat_interval })
    }
    
    // Special handling for task completion
    if (body.status === 'completed' && body.status !== currentTask.status) {
      await logTaskCompletion(supabase, Number(taskId), currentStaffId)
    } else if (changes.length > 0) {
      await logTaskUpdate(supabase, Number(taskId), currentStaffId, changes)
    }

    // Handle assignees update if provided (support both single and multiple)
    if (body.assignee_id !== undefined || body.assignee_ids !== undefined) {
      // Get current assignees for comparison
      const { data: currentAssignees } = await supabase
        .from('task_assignees')
        .select('assigned_to_staff_id')
        .eq('task_id', taskId)
        .eq('is_active', true) as { data: Array<{ assigned_to_staff_id: number }> | null }

      const currentAssigneeIds = currentAssignees?.map(a => a.assigned_to_staff_id) || []

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

        // Log specific assignee changes
        const addedAssignees = assigneeIdsToSet.filter(id => !currentAssigneeIds.includes(id))
        const removedAssignees = currentAssigneeIds.filter(id => !assigneeIdsToSet.includes(id))

        // Log added assignees
        for (const assigneeId of addedAssignees) {
          await logTaskAssignment(supabase, Number(taskId), currentStaffId, assigneeId)
        }

        // Log removed assignees
        for (const assigneeId of removedAssignees) {
          // Get assignee name for better logging
          const { data: assigneeData } = await supabase
            .from('staff')
            .select('fullname')
            .eq('id', assigneeId)
            .single() as { data: { fullname: string } | null }

          const assigneeName = assigneeData?.fullname || `user ${assigneeId}`
          
          await logActivity(supabase, {
            task_id: Number(taskId),
            action: `Unassigned ${assigneeName}`,
            user_id: currentStaffId
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
