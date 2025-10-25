import { defineEventHandler, getQuery } from 'h3'
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

  // Get current user's staff ID and department
  const { data: staffIdData, error: staffIdError } = await supabase
    .from('staff')
    .select('id, department')
    .eq('user_id', user.id)
    .single()

  if (staffIdError || !staffIdData) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff ID',
      data: staffIdError
    })
  }
  const currentStaffId = (staffIdData as { id: number; department: string | null }).id
  const currentDepartment = (staffIdData as { id: number; department: string | null }).department
  
  // Verify project exists (excluding soft-deleted projects)
  const { data: projectExists, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle()

  if (projectError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to verify project',
      data: projectError
    })
  }

  if (!projectExists) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  // Note: We no longer check if user is a project member
  // Instead, we check if they can see any tasks based on department visibility
  // This allows users to view projects where their department colleagues are assigned tasks

  try {
    // Get staff IDs in the same department as current user
    let departmentStaffIds: number[] = []
    if (currentDepartment) {
      const { data: departmentStaff, error: deptError } = await supabase
        .from('staff')
        .select('id')
        .eq('department', currentDepartment)
      
      if (deptError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch department staff',
          data: deptError
        })
      }
      
      departmentStaffIds = departmentStaff?.map((s: any) => s.id) || []
    }

    // If user has no department or department has no members, they can't see any tasks
    if (departmentStaffIds.length === 0) {
      return {
        tasks: [],
        count: 0
      }
    }

    // Fetch tasks for the specified project (excluding soft-deleted tasks)
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
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

    // Filter tasks: only include tasks where someone from the user's department is assigned
    const taskIds = tasks.map((t: any) => t.id)
    const { data: taskAssignees, error: assigneeError } = await supabase
      .from('task_assignees')
      .select('task_id, assigned_to_staff_id')
      .in('task_id', taskIds)
      .eq('is_active', true)

    if (assigneeError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch task assignees',
        data: assigneeError
      })
    }

    // Build a set of task IDs that have at least one assignee from the user's department
    const visibleTaskIds = new Set<number>()
    if (taskAssignees) {
      for (const assignee of taskAssignees) {
        if (departmentStaffIds.includes(assignee.assigned_to_staff_id)) {
          visibleTaskIds.add(assignee.task_id)
        }
      }
    }

    // Filter tasks to only include visible ones
    const visibleTasks = tasks.filter((task: any) => visibleTaskIds.has(task.id))

    if (visibleTasks.length === 0) {
      return {
        tasks: [],
        count: 0
      }
    }

    // Populate creator, assignees, and project information for each task
    const enrichedTasks = await Promise.all(
      visibleTasks.map(async (task: any) => {
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

        // Fetch project information (excluding soft-deleted projects)
        let project = null
        if (task.project_id) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('id, name')
            .eq('id', task.project_id)
            .is('deleted_at', null)
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
