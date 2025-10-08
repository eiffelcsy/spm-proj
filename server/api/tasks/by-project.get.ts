import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - User not authenticated'
    })
  }

  // Get project_id from query parameters
  const query = getQuery(event)
  const projectId = query.project_id ? Number(query.project_id) : null

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'project_id query parameter is required'
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
  
  // Verify user is a member of the project
  const { data: projectMember, error: memberError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('staff_id', currentStaffId)
    .maybeSingle()

  if (memberError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to verify project membership',
      data: memberError
    })
  }

  if (!projectMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You are not a member of this project'
    })
  }

  try {
    // Fetch tasks for the specified project
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          tasks: [],
          count: 0
        }
      } else {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch tasks',
          data: error
        })
      }
    }

    if (!tasks || tasks.length === 0) {
      return {
        tasks: [],
        count: 0
      }
    }

    // Populate creator, assignees, and project information for each task
    const enrichedTasks = await Promise.all(
      tasks.map(async (task: any) => {
        // Fetch creator information
        let creator = null
        if (task.creator_id) {
          const { data: creatorData } = await supabase
            .from('staff')
            .select('id, fullname')
            .eq('id', task.creator_id)
            .single()
          creator = creatorData
        }

        // Fetch assignees
        let assignees: any[] = []
        const { data: assigneeRows } = await supabase
          .from('task_assignees')
          .select('assigned_to_staff_id, assigned_by_staff_id')
          .eq('task_id', task.id)
          .eq('is_active', true)

        if (assigneeRows && assigneeRows.length > 0) {
          const staffIds = [
            ...new Set([
              ...assigneeRows.map((row: any) => row.assigned_to_staff_id),
              ...assigneeRows.map((row: any) => row.assigned_by_staff_id).filter((id: any) => id !== null)
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
        }

        // Fetch project information
        let project = null
        if (task.project_id) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('id, name')
            .eq('id', task.project_id)
            .single()
          project = projectData
        }

        return {
          ...task,
          creator,
          assignees,
          project
        }
      })
    )

    return {
      tasks: enrichedTasks || [],
      count: enrichedTasks?.length || 0
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
      data: error
    })
  }
})
