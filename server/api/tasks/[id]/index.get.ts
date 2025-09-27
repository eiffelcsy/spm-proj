import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  const taskId = Number(getRouterParam(event, 'id'))

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
    // Main task (no assignee join)
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`*, creator:creator_id (id, fullname)`)
      .eq('id', taskId)
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
        statusMessage: 'Failed to fetch task',
        data: error
      })
    }
    
    // Fetch all active assignees for main task
    let assignees: any[] = []
    const { data: assigneeRows } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id, assigned_by_staff_id')
      .eq('task_id', taskId)
      .eq('is_active', true)


    if (assigneeRows && assigneeRows.length > 0) {
      const staffIds = [
        ...new Set([
          ...assigneeRows.map((row: any) => row.assigned_to_staff_id),
          ...assigneeRows.map((row: any) => row.assigned_by_staff_id)
        ])
      ]
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, fullname')
        .in('id', staffIds)

      assignees = assigneeRows.map((row: any) => ({
        assigned_to: staffList?.find((s: any) => s.id === row.assigned_to_staff_id) || { id: null, fullname: 'Unassigned' },
        assigned_by: staffList?.find((s: any) => s.id === row.assigned_by_staff_id) || null
      }))
    } else {
      // No assignees at all
      assignees = [{ assigned_to: { id: null, fullname: 'Unassigned' }, assigned_by: null }]
    }

    // Fetch activity timeline for this task
    const { data: history, error: timelineError } = await supabase
      .from('activity_timeline')
      .select('*, staff:user_id (fullname)')
      .eq('task_id', taskId)
      .order('timestamp', { ascending: true })
   

    if (timelineError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch activity timeline',
        data: timelineError
      })
    }

    // Fetch subtasks if this is a parent task
    let subtasks: any[] = [];
    const parentTask = task as any;
    if (parentTask && !parentTask.parent_task_id) {
      const { data: subtaskData, error: subtaskError } = await supabase
        .from('tasks')
        .select(`*, creator:creator_id (id, fullname)`)
        .eq('parent_task_id', parentTask.id)
        .order('start_date', { ascending: true });


      if (subtaskError) {
        console.error('Failed to fetch subtasks:', subtaskError);
        subtasks = [];
      } else {
        // For each subtask, fetch all its assignees from task_assignees and staff
        subtasks = await Promise.all(
          (subtaskData || []).map(async (subtask: any) => {
            let subtaskAssignees: any[] = []
            const { data: subAssigneeRows } = await supabase
              .from('task_assignees')
              .select('assigned_to_staff_id, assigned_by_staff_id')
              .eq('task_id', subtask.id)
              .eq('is_active', true)

            if (subAssigneeRows && subAssigneeRows.length > 0) {
              const subStaffIds = [
                ...new Set([
                  ...subAssigneeRows.map((row: any) => row.assigned_to_staff_id),
                  ...subAssigneeRows.map((row: any) => row.assigned_by_staff_id)
                ])
              ]
              const { data: subStaffList } = await supabase
                .from('staff')
                .select('id, fullname')
                .in('id', subStaffIds)

              subtaskAssignees = subAssigneeRows.map((row: any) => ({
                assigned_to: subStaffList?.find((s: any) => s.id === row.assigned_to_staff_id) || { id: null, fullname: 'Unassigned' },
                assigned_by: subStaffList?.find((s: any) => s.id === row.assigned_by_staff_id) || null
              }))
            } else {
              subtaskAssignees = [{ assigned_to: { id: null, fullname: 'Unassigned' }, assigned_by: null }]
            }
            return { ...subtask, assignees: subtaskAssignees }
          })
        )
      }
    }

    // Attach history, subtasks, and assignees to the task object
    if (task) {
      parentTask.history = history || [];
      parentTask.subtasks = subtasks;
      parentTask.assignees = assignees;
    }

    return { task }
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