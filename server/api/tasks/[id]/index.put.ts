import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { logTaskUpdate, logTaskAssignment, logTaskCompletion, logTaskUnassignment } from '../../../utils/activityLogger'
import { 
  createTaskAssignmentNotification, 
  createTaskUnassignmentNotification,
  createTaskUpdateNotification,
  getTaskDetails 
} from '../../../utils/notificationService'
import { replicateCompletedTask } from '../../../utils/recurringTaskService'
import { getVisibleStaffIds } from '../../../utils/departmentHierarchy'
import type { TaskDB } from '~/types'

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

    // Get current user's staff ID, department, and role
    const { data: staffIdData, error: staffIdError } = await supabase
      .from('staff')
      .select('id, department, is_manager, is_admin')
      .eq('user_id', user.id)
      .single()

    if (staffIdError || !staffIdData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID',
        data: staffIdError
      })
    }
    const currentStaffId = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).id
    const currentDepartment = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).department
    const isManager = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).is_manager
    const isAdmin = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).is_admin

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

    // Check visibility: user can only edit task if someone from visible departments is assigned
    // Get staff IDs from departments visible to current user based on hierarchy
    const visibleStaffIds = await getVisibleStaffIds(supabase, currentDepartment)
    
    if (visibleStaffIds.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to view or edit this task'
      })
    }
    
    // Check if any assignee is from visible departments
    const hasVisibleAssignee = assigneeRows?.some((row: any) => 
      visibleStaffIds.includes(row.assigned_to_staff_id)
    )
    
    if (!hasVisibleAssignee) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to view or edit this task'
      })
    }

    // Managers and admins can edit any task they can view (department visibility already checked above)
    // For non-managers/admins, check assignment permissions
    if (!isManager && !isAdmin) {
      const isCurrentUserAssignedToTask = Array.isArray(assigneeRows) 
        ? assigneeRows.some((r: any) => r.assigned_to_staff_id === currentStaffId) : false

      let isCurrentUserAssignedToAnySubtask = false
      if (!isCurrentUserAssignedToTask) {
        const { data: subAssignees } = await supabase
          .from('task_assignees')
          .select('assigned_to_staff_id, task_id')
          .in('task_id', (
            await supabase.from('tasks')
              .select('id').eq('parent_task_id', Number(taskId)).is('deleted_at', null)
          ).data?.map((t: any) => t.id) || [-1])
          .eq('is_active', true)
        isCurrentUserAssignedToAnySubtask = Array.isArray(subAssignees)
          ? subAssignees.some((r: any) => r.assigned_to_staff_id === currentStaffId)
          : false
      }

      if (!isCurrentUserAssignedToTask && !isCurrentUserAssignedToAnySubtask) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to edit this task. Only managers/admins, task assignees, or subtask assignees may edit.'
        })
      }
    }

    // Get current task data to compare changes
    const { data: currentTask, error: currentTaskError } = await supabase
      .from('tasks')
      .select('title, start_date, due_date, status, notes, priority, repeat_interval, tags')
      .eq('id', taskId)
      .single() as { data: { title: string, start_date: string | null, due_date: string | null, status: string, notes: string, priority: number | null, repeat_interval: number | null, tags: string[] | null } | null, error: any }

    if (currentTaskError || !currentTask) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch current task data',
        data: currentTaskError
      })
    }

    // Validate priority
    const hasPriority = body.priority !== undefined && body.priority !== null
    if (hasPriority) {
      const p = Number(body.priority)
      if (!Number.isInteger(p) || p < 1 || p > 10) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid priority: must be an integer between 1 and 10'
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
      priority?: number
      repeat_interval?: number
      tags?: string[]
    } = {}
    
    if (body.task_name) updateData.title = body.task_name
    if (body.start_date) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.due_date = body.end_date
    if (body.status) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes
    if (hasPriority) updateData.priority = Number(body.priority)
    if (body.repeat_interval !== undefined) updateData.repeat_interval = body.repeat_interval
    if (body.tags !== undefined) updateData.tags = body.tags

    // If repeat_interval > 0, calculate due_date from start_date
    const repeatInterval = body.repeat_interval !== undefined ? Number(body.repeat_interval) : null
    const startDateToUse = body.start_date || updateData.start_date
    
    if (repeatInterval && repeatInterval > 0 && startDateToUse) {
      const startDate = new Date(startDateToUse)
      const dueDate = new Date(startDate.getTime() + (repeatInterval * 24 * 60 * 60 * 1000))
      updateData.due_date = dueDate.toISOString().split('T')[0]
    }

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
    const parentProjectId = task?.project_id ?? (body.project_id ?? null)

    // --- NEW: handle subtasks payload (create new or update existing) ---
    if (Array.isArray(body.subtasks)) {
      for (const s of body.subtasks) {
        try {
          // Validate subtask priority (if provided): must be integer 1-10
          const hasSubPriority = s.priority !== undefined && s.priority !== null
          if (hasSubPriority) {
            const sp = Number(s.priority)
            if (!Number.isInteger(sp) || sp < 1 || sp > 10) {
              throw createError({
                statusCode: 400,
                statusMessage: `Invalid subtask priority: must be an integer between 1 and 10`
              })
            }
          }
          
          // If subtask has repeat_interval, calculate due_date from start_date
          let subtaskDueDate = s.due_date ?? null
          const subtaskRepeatInterval = s.repeat_interval !== undefined ? Number(s.repeat_interval) : null
          
          if (subtaskRepeatInterval && subtaskRepeatInterval > 0 && s.start_date) {
            const subtaskStartDate = new Date(s.start_date)
            const subtaskDueDateCalc = new Date(subtaskStartDate.getTime() + (subtaskRepeatInterval * 24 * 60 * 60 * 1000))
            subtaskDueDate = subtaskDueDateCalc.toISOString().split('T')[0]
          }

          const subPayload: any = {
            title: s.title,
            start_date: s.start_date ?? null,
            due_date: subtaskDueDate,
            status: s.status,
            priority: s.priority !== undefined ? Number(s.priority) : null,
            repeat_interval: subtaskRepeatInterval,
            notes: s.notes ?? null,
            tags: s.tags ?? [],           
            project_id: parentProjectId !== undefined ? parentProjectId : null,
            parent_task_id: Number(taskId)
          }

          if (s.id) {
            // update existing subtask (ensure it's a subtask of this parent)
            const { data: existingSub, error: fetchSubErr } = await supabase
              .from('tasks')
              .select('id, parent_task_id')
              .eq('id', s.id)
              .single()

            if (fetchSubErr || !existingSub) {
              // skip or report error
              throw createError({ statusCode: 400, statusMessage: `Subtask id ${s.id} not found` })
            }

            // ensure parent_task_id is this taskId (or update it)
            await supabase
              .from('tasks')
              .update(subPayload)
              .eq('id', s.id)
              
          } else {
            // insert new subtask
            const insertObj = { ...subPayload, creator_id: currentStaffId }
            const { data: inserted, error: insertErr } = await supabase
              .from('tasks')
              .insert(insertObj)
              .select()
              .single()

            if (insertErr) {
              throw createError({ statusCode: 500, statusMessage: 'Failed to create subtask', data: insertErr })
            }

            // set s.id for assignee handling below
            s.id = inserted?.id
          }

          // Handle subtask assignees if provided
          if (Array.isArray(s.assignee_ids)) {
            const subtaskId = Number(s.id)
            // enforce max 5
            if (s.assignee_ids.length === 0) {
              throw createError({ statusCode: 400, statusMessage: `Subtask ${s.title || subtaskId}: at least one assignee required` })
            }
            if (s.assignee_ids.length > 5) {
              throw createError({ statusCode: 400, statusMessage: 'Maximum 5 assignees allowed per subtask' })
            }

            // deactivate existing for subtask
            await supabase
              .from('task_assignees')
              .update({ is_active: false })
              .eq('task_id', subtaskId)

            // upsert new assignees
            const mappings = s.assignee_ids.map((sid: any) => ({
              task_id: subtaskId,
              assigned_to_staff_id: Number(sid),
              assigned_by_staff_id: currentStaffId,
              is_active: true
            }))

            const { error: upsertErr } = await supabase
              .from('task_assignees')
              .upsert(mappings, { onConflict: 'task_id,assigned_to_staff_id' })

            if (upsertErr) {
              throw createError({ statusCode: 500, statusMessage: 'Failed to set subtask assignees', data: upsertErr })
            }
          }
        } catch (subErr: any) {
          // bubble up first subtask error
          if (subErr.statusCode) throw subErr
          throw createError({ statusCode: 500, statusMessage: 'Failed processing subtasks', data: subErr })
        }
      }
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
    if (body.priority !== undefined && Number(body.priority) !== currentTask.priority) {
      changes.push({ field: 'priority', oldValue: currentTask.priority, newValue: Number(body.priority) })
    }
    if (body.repeat_interval !== undefined && String(body.repeat_interval) !== String(currentTask.repeat_interval)) {
      changes.push({ field: 'repeat_interval', oldValue: currentTask.repeat_interval, newValue: body.repeat_interval })
    }
    if (body.tags !== undefined && JSON.stringify(body.tags) !== JSON.stringify(currentTask.tags)) {
      changes.push({ field: 'tags', oldValue: currentTask.tags, newValue: body.tags })
    }
    
    // Special handling for task completion
    if (body.status === 'completed' && body.status !== currentTask.status) {
      await logTaskCompletion(supabase, Number(taskId), currentStaffId)
    } else if (changes.length > 0) {
      await logTaskUpdate(supabase, Number(taskId), currentStaffId, changes)
      
      // Create notifications for task updates
      const taskDetails = await getTaskDetails(supabase, Number(taskId))
      if (taskDetails) {
        // Get all assignees for this task
        const { data: assignees } = await supabase
          .from('task_assignees')
          .select('assigned_to_staff_id')
          .eq('task_id', Number(taskId))
          .eq('is_active', true) as { data: Array<{ assigned_to_staff_id: number }> | null }

        if (assignees && assignees.length > 0) {
          // Create a summary of changes for the notification
          const changesSummary = changes.map(change => {
            const fieldName = change.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return `${fieldName}: ${change.oldValue} → ${change.newValue}`
          }).join(', ')

          // Notify all assignees (including the one making the change)
          for (const assignee of assignees) {
            await createTaskUpdateNotification(
              supabase,
              Number(taskId),
              assignee.assigned_to_staff_id,
              currentStaffId,
              taskDetails.title,
              changesSummary,
              taskDetails.projectName
            )
          }
        }
      }
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

      const addedAssignees = assigneeIdsToSet.filter(id => !currentAssigneeIds.includes(id))
      const removedAssignees = currentAssigneeIds.filter(id => !assigneeIdsToSet.includes(id))
      
      // Only managers can remove existing assignees
      if (!isManager && removedAssignees.length > 0) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Only managers can unassign assignees from a task'
        })
      }

      // Deactivate current assignees
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

        // Log added assignees and create notifications
        const taskDetails = await getTaskDetails(supabase, Number(taskId))
        for (const assigneeId of addedAssignees) {
          await logTaskAssignment(supabase, Number(taskId), currentStaffId, assigneeId)
          
          // Create notification for assignment
          if (taskDetails) {
            await createTaskAssignmentNotification(
              supabase,
              Number(taskId),
              assigneeId,
              currentStaffId,
              taskDetails.title,
              taskDetails.projectName
            )
          }
        }

        // Log removed assignees and create notifications
        for (const assigneeId of removedAssignees) {
          await logTaskUnassignment(supabase, Number(taskId), currentStaffId, assigneeId)

          // Create notification for unassignment
          if (taskDetails) {
            await createTaskUnassignmentNotification(
              supabase,
              Number(taskId),
              assigneeId,
              currentStaffId,
              taskDetails.title,
              taskDetails.projectName
            )
          }
        }
      }
    }

    // Check if task was just completed and has repeat_interval > 0
    // If so, replicate the task immediately (creates one next occurrence)
    let replicatedTask: TaskDB | undefined = undefined
    const wasCompleted = currentTask.status !== 'completed' && task.status === 'completed'
    const hasRepeatInterval = task.repeat_interval && task.repeat_interval > 0
    
    if (wasCompleted && hasRepeatInterval) {
      console.log(`Task ${taskId} was completed with repeat_interval ${task.repeat_interval}, triggering replication`)
      const replicationResult = await replicateCompletedTask(supabase, task as TaskDB)
      
      if (replicationResult.success && replicationResult.newTask) {
        replicatedTask = replicationResult.newTask
        console.log(`Successfully replicated task ${taskId}: created task ${replicatedTask.id} with due date ${replicatedTask.due_date}`)
      } else {
        console.error(`Failed to replicate task ${taskId}:`, replicationResult.error)
      }
    }

    return {
      success: true,
      task,
      replicatedTask: replicatedTask ? {
        id: replicatedTask.id,
        title: replicatedTask.title,
        due_date: replicatedTask.due_date,
        start_date: replicatedTask.start_date
      } : undefined
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
