import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const body = await readBody(event)

  const taskId = Number(body.task_id)
  const assigneeIds: number[] = Array.isArray(body.assignee_ids)
    ? body.assignee_ids.map((v: any) => Number(v))
    : []

  if (!taskId) {
    throw createError({ statusCode: 400, statusMessage: 'task_id is required' })
  }
  
  if (assigneeIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one assignee is required' })
  }

  // Enforce maximum 5 assignees limit
  if (assigneeIds.length > 5) {
    throw createError({ statusCode: 400, statusMessage: 'Maximum 5 assignees allowed per task' })
  }

  let assignedBy = body.assigned_by_staff_id ? Number(body.assigned_by_staff_id) : null
  if (!assignedBy) {
    const user = await serverSupabaseUser(event)
    if (!user || !user.id) {
      throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    }
    const { data: staffRow, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (staffError) {
      throw createError({ statusCode: 500, statusMessage: staffError.message })
    }
    if (!staffRow) {
      throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })
    }
    //@ts-ignore
    assignedBy = Number(staffRow.id)
  }

  const mappings = assigneeIds.map((staffId) => ({
    task_id: taskId,
    assigned_to_staff_id: staffId,
    assigned_by_staff_id: assignedBy,
  }))

  const { data, error } = await supabase
    .from('task_assignees')
    .insert(mappings as any)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, inserted: data }
})