import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface ReportFilters {
  user_id?: number
  project_id?: number
  start_date?: string
  end_date?: string
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - User not authenticated'
    })
  }

  // Get current user's staff record to verify they're a manager
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, staff_type')
    .eq('user_id', user.id)
    .single()

  if (staffError || !staffData) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff data',
      data: staffError
    })
  }

  // Verify user is a manager or admin
  if (staffData.staff_type !== 'manager' && staffData.staff_type !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied - Only managers and admins can generate reports'
    })
  }

  // Parse query parameters
  const query = getQuery(event)
  const filters: ReportFilters = {
    user_id: query.user_id ? parseInt(query.user_id as string) : undefined,
    project_id: query.project_id ? parseInt(query.project_id as string) : undefined,
    start_date: query.start_date as string | undefined,
    end_date: query.end_date as string | undefined,
  }

  try {
    // Build base query for tasks
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        start_date,
        due_date,
        completed_at,
        created_at,
        project_id,
        creator_id
      `)
      .is('deleted_at', null)

    // Apply date range filter
    if (filters.start_date) {
      tasksQuery = tasksQuery.gte('created_at', filters.start_date)
    }
    if (filters.end_date) {
      // Add one day to include the end date
      const endDate = new Date(filters.end_date)
      endDate.setDate(endDate.getDate() + 1)
      tasksQuery = tasksQuery.lt('created_at', endDate.toISOString())
    }

    // Apply project filter
    if (filters.project_id) {
      tasksQuery = tasksQuery.eq('project_id', filters.project_id)
    }

    const { data: tasks, error: tasksError } = await tasksQuery

    if (tasksError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks',
        data: tasksError
      })
    }

    let filteredTasks = tasks || []

    // Apply user filter if specified
    if (filters.user_id) {
      // Get task IDs where the user is an assignee
      const { data: assignedTasks, error: assigneeError } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('assigned_to_staff_id', filters.user_id)
        .eq('is_active', true)

      if (assigneeError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch assigned tasks',
          data: assigneeError
        })
      }

      const assignedTaskIds = assignedTasks?.map(t => t.task_id) || []
      
      // Filter tasks to only those assigned to the user or created by the user
      filteredTasks = filteredTasks.filter(task => 
        assignedTaskIds.includes(task.id) || task.creator_id === filters.user_id
      )
    }

    // Calculate metrics
    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress').length
    const notStartedTasks = filteredTasks.filter(t => t.status === 'not-started').length
    const blockedTasks = filteredTasks.filter(t => t.status === 'blocked').length
    
    // Projected tasks (upcoming tasks starting in the future)
    const now = new Date()
    const projectedTasks = filteredTasks.filter(t => {
      if (!t.start_date) return false
      const startDate = new Date(t.start_date)
      return startDate > now && t.status === 'not-started'
    }).length

    // Calculate percentages
    const completedPercentage = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : '0.00'
    const inProgressPercentage = totalTasks > 0 ? ((inProgressTasks / totalTasks) * 100).toFixed(2) : '0.00'
    const notStartedPercentage = totalTasks > 0 ? ((notStartedTasks / totalTasks) * 100).toFixed(2) : '0.00'
    const blockedPercentage = totalTasks > 0 ? ((blockedTasks / totalTasks) * 100).toFixed(2) : '0.00'

    // Fetch additional context data
    let userName = null
    let projectName = null

    if (filters.user_id) {
      const { data: userData } = await supabase
        .from('staff')
        .select('fullname')
        .eq('id', filters.user_id)
        .single()
      userName = userData?.fullname || 'Unknown User'
    }

    if (filters.project_id) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', filters.project_id)
        .single()
      projectName = projectData?.name || 'Unknown Project'
    }

    // Enrich tasks with assignee and project data
    const enrichedTasks = await Promise.all(
      filteredTasks.map(async (task) => {
        // Fetch assignees
        const { data: assignees } = await supabase
          .from('task_assignees')
          .select(`
            assigned_to_staff_id,
            staff:staff!task_assignees_assigned_to_staff_id_fkey(id, fullname)
          `)
          .eq('task_id', task.id)
          .eq('is_active', true)

        // Fetch project info
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
          assignees: assignees?.map((a: any) => a.staff) || [],
          project
        }
      })
    )

    return {
      success: true,
      data: {
        metrics: {
          totalTasks,
          completedTasks,
          completedPercentage,
          inProgressTasks,
          inProgressPercentage,
          notStartedTasks,
          notStartedPercentage,
          blockedTasks,
          blockedPercentage,
          projectedTasks
        },
        tasks: enrichedTasks,
        filters: {
          ...filters,
          userName,
          projectName
        },
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error
    })
  }
})

