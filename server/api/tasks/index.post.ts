import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { TaskDB } from '~/types'
import { logTaskCreation } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const body = await readBody(event)

  // require authenticated user and find staff.id
  const user = await serverSupabaseUser(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle() as { data: { id: number } | null, error: any }
  if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
  if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

  const parentTaskPayload = {
    title: body.title,
    notes: body.notes || 'No notes...',
    start_date: body.start_date ?? null,
    due_date: body.due_date ?? null,
    status: body.status ?? null,
    priority: body.priority ?? null,
    repeat_interval: body.repeat_interval ?? null,
    project_id: body.project_id ?? null,
    creator_id: staffRow.id,
    parent_task_id: null
  }

  const { data: parentTask, error: parentError } = await supabase
    .from('tasks')
    .insert([parentTaskPayload] as any)
    .select('*')
    .single() as { data: TaskDB | null, error: any }

  if (parentError) {
    throw createError({ statusCode: 500, statusMessage: parentError.message })
  }

  // Log task creation activity
  await logTaskCreation(supabase, parentTask!.id, staffRow.id)
  
  const createdTaskId = parentTask!.id

  async function rollbackParent() {
    try {
      await supabase.from('task_assignees').delete().eq('task_id', createdTaskId)
    } catch (_) {}
    try {
      await supabase.from('tasks').delete().eq('id', createdTaskId)
    } catch (_) {}
  }

  try {
    const parentAssigneeIds: number[] = Array.isArray(body.assignee_ids)
      ? body.assignee_ids.map((v: any) => Number(v))
      : []

    // Enforce assignee requirements: minimum 1, maximum 5
    if (parentAssigneeIds.length === 0) {
      await rollbackParent()
      throw createError({ statusCode: 400, statusMessage: 'At least one assignee is required for the task' })
    }
    
    if (parentAssigneeIds.length > 5) {
      await rollbackParent()
      throw createError({ statusCode: 400, statusMessage: 'Maximum 5 assignees allowed per task' })
    }

    if (parentAssigneeIds.length > 0) {
      const parentMappings = parentAssigneeIds.map((staffId) => ({
        task_id: createdTaskId,
        assigned_to_staff_id: staffId,
        assigned_by_staff_id: body.assigned_by_staff_id ? Number(body.assigned_by_staff_id) : staffRow!.id
      }))
      const { error: pmError } = await supabase.from('task_assignees').insert(parentMappings as any)
      if (pmError) {
        await rollbackParent()
        throw pmError
      }
    }

    const subtasksInput = Array.isArray(body.subtasks) ? body.subtasks : []
    if (subtasksInput.length > 0) {
      const subtaskRows = subtasksInput.map((s: any) => ({
        title: s.title,
        notes: s.notes || 'No notes...',
        start_date: s.start_date ?? null,
        due_date: s.due_date ?? null,
        status: s.status ?? null,
        priority: body.priority ?? null,
        repeat_interval: body.repeat_interval ?? null,
        project_id: s.project_id ?? null,
        creator_id: staffRow!.id,
        parent_task_id: createdTaskId
      }))

      const { data: insertedSubtasks, error: subError } = await supabase
        .from('tasks')
        .insert(subtaskRows)
        .select('*') as { data: TaskDB[] | null, error: any }

      if (subError) {
        await rollbackParent()
        throw subError
      }

      // Log subtask creation activities
      if (insertedSubtasks) {
        for (const subtask of insertedSubtasks) {
          await logTaskCreation(supabase, subtask.id, staffRow.id)
        }
      }

      const subtaskMappings: any[] = []
      for (let i = 0; i < subtasksInput.length; i++) {
        const s = subtasksInput[i]
        const inserted = insertedSubtasks?.[i]
        if (!inserted) continue
        const assigneeIdsForSub = Array.isArray(s.assignee_ids) ? s.assignee_ids.map((v: any) => Number(v)) : []
        for (const staffId of assigneeIdsForSub) {
          subtaskMappings.push({
            task_id: inserted.id,
            assigned_to_staff_id: staffId,
            assigned_by_staff_id: body.assigned_by_staff_id ? Number(body.assigned_by_staff_id) : staffRow!.id
          })
        }
      }

      if (subtaskMappings.length > 0) {
        const { error: smError } = await supabase.from('task_assignees').insert(subtaskMappings as any)
        if (smError) {
          try {
            const insertedIds = insertedSubtasks?.map((r: any) => r.id) || []
            await supabase.from('task_assignees').delete().in('task_id', insertedIds)
            await supabase.from('tasks').delete().in('id', insertedIds)
          } catch (_) {}
          await rollbackParent()
          throw smError
        }
      }
      return { success: true, task: parentTask, subtasks: insertedSubtasks }
    }

    return { success: true, task: parentTask }
  } catch (err: any) {
    await rollbackParent()
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to create task/subtasks' })
  }
})