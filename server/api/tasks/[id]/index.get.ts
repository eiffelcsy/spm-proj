import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  const taskId = Number(getRouterParam(event, 'id'))

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - User not authenticated'
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

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  try {
    // Main task (fetch without join first)
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single() as { data: any, error: any }


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

    // Fetch creator information separately
    let creator = null
    if (task && task.creator_id) {
      const { data: creatorData } = await supabase
        .from('staff')
        .select('id, fullname')
        .eq('id', task.creator_id)
        .single()
      creator = creatorData
    }
    
    // Fetch project information
    let project = null
    if (task && task.project_id) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', task.project_id)
        .single()
      project = projectData
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
        .select('*')
        .eq('parent_task_id', parentTask.id)
        .order('start_date', { ascending: true });


      if (subtaskError) {
        subtasks = [];
      } else {
        // For each subtask, fetch all its assignees from task_assignees and staff
        subtasks = await Promise.all(
          (subtaskData || []).map(async (subtask: any) => {
            // Fetch creator for subtask
            let subtaskCreator = null
            if (subtask.creator_id) {
              const { data: subtaskCreatorData } = await supabase
                .from('staff')
                .select('id, fullname')
                .eq('id', subtask.creator_id)
                .single()
              subtaskCreator = subtaskCreatorData
            }

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
            return { ...subtask, creator: subtaskCreator, assignees: subtaskAssignees }
          })
        )
      }
    }

    // Check if current user can edit/delete this task
    // New logic: assigned users OR task creator (if unassigned)
    const isAssigned = assignees.some((assignee: any) => assignee.assigned_to.id === currentStaffId)
    const isTaskAssigned = assignees.some((assignee: any) => assignee.assigned_to.id !== null)
    const isCreator = creator && (creator as any).id === currentStaffId
    
    let canEdit = false
    let canDelete = false
    
    if (isTaskAssigned) {
      // If task is assigned, only assigned person can edit/delete
      canEdit = Boolean(isAssigned || isCreator)
      canDelete = isAssigned
    } else {
      // If task is unassigned, only task creator can edit/delete
      canEdit = Boolean(isCreator)
      canDelete = Boolean(isCreator)
    }
    
    // Attach history, subtasks, assignees, creator, project, and permissions to the task object
    if (task) {
      parentTask.history = history || [];
      parentTask.subtasks = subtasks;
      parentTask.assignees = assignees;
      parentTask.creator = creator;
      parentTask.project = project;
      parentTask.permissions = {
        canEdit,
        canDelete
      };
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