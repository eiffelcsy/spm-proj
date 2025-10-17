import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface ReportFilters {
  grouping?: 'project' | 'department'
  project_id?: number
  department?: string
  start_date?: string
  end_date?: string
}

interface TaskWithTime {
  id: number
  title: string
  status: string
  created_at: string
  completed_at: string | null
  project_id: number | null
  project_name: string | null
  department: string | null
  logged_hours: number
  is_in_progress: boolean
}

interface GroupedTimeData {
  name: string
  total_hours: number
  completed_tasks: number
  in_progress_tasks: number
  tasks: TaskWithTime[]
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
    grouping: (query.grouping as 'project' | 'department') || 'project',
    project_id: query.project_id ? parseInt(query.project_id as string) : undefined,
    department: query.department as string | undefined,
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
        created_at,
        completed_at,
        project_id,
        creator_id
      `)
      .is('deleted_at', null)

    // Apply date range filter on created_at
    if (filters.start_date) {
      tasksQuery = tasksQuery.gte('created_at', filters.start_date)
    }
    if (filters.end_date) {
      // Add one day to include the end date
      const endDate = new Date(filters.end_date)
      endDate.setDate(endDate.getDate() + 1)
      tasksQuery = tasksQuery.lt('created_at', endDate.toISOString())
    }

    // Apply project filter if grouping by specific project
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

    let tasksWithTime: TaskWithTime[] = []

    // Process each task to calculate logged time and enrich with data
    for (const task of tasks || []) {
      // Calculate logged time
      let loggedHours = 0
      let isInProgress = false
      
      if (task.completed_at) {
        // Completed task: time from created_at to completed_at
        const start = new Date(task.created_at).getTime()
        const end = new Date(task.completed_at).getTime()
        loggedHours = (end - start) / (1000 * 60 * 60) // Convert to hours
      } else if (task.status === 'in-progress') {
        // In-progress task: time from created_at to now
        const start = new Date(task.created_at).getTime()
        const now = Date.now()
        loggedHours = (now - start) / (1000 * 60 * 60) // Convert to hours
        isInProgress = true
      }
      // For not-started or blocked tasks, logged time is 0

      // Get project name if task has a project
      let projectName = null
      if (task.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', task.project_id)
          .is('deleted_at', null)
          .single()
        projectName = projectData?.name || null
      }

      // Get department from task assignees (first assignee's department)
      let department = null
      const { data: assigneeRows } = await supabase
        .from('task_assignees')
        .select('assigned_to_staff_id')
        .eq('task_id', task.id)
        .eq('is_active', true)
        .limit(1)

      if (assigneeRows && assigneeRows.length > 0) {
        const { data: staffInfo } = await supabase
          .from('staff')
          .select('department')
          .eq('id', assigneeRows[0].assigned_to_staff_id)
          .single()
        department = staffInfo?.department || null
      }

      tasksWithTime.push({
        id: task.id,
        title: task.title,
        status: task.status,
        created_at: task.created_at,
        completed_at: task.completed_at,
        project_id: task.project_id,
        project_name: projectName,
        department: department,
        logged_hours: loggedHours,
        is_in_progress: isInProgress
      })
    }

    // Apply department filter if specified
    if (filters.department) {
      tasksWithTime = tasksWithTime.filter(task => task.department === filters.department)
    }

    // Group data based on grouping type
    const groupedData: Record<string, GroupedTimeData> = {}
    
    for (const task of tasksWithTime) {
      const groupKey = filters.grouping === 'project' 
        ? (task.project_name || 'Personal Tasks')
        : (task.department || 'No Department')

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          name: groupKey,
          total_hours: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          tasks: []
        }
      }

      groupedData[groupKey].total_hours += task.logged_hours
      if (task.status === 'completed') {
        groupedData[groupKey].completed_tasks++
      }
      if (task.is_in_progress) {
        groupedData[groupKey].in_progress_tasks++
      }
      groupedData[groupKey].tasks.push(task)
    }

    // Convert to array and sort by total hours descending
    const groupedArray = Object.values(groupedData).sort((a, b) => b.total_hours - a.total_hours)

    // Calculate overall metrics
    const totalHours = tasksWithTime.reduce((sum, task) => sum + task.logged_hours, 0)
    const totalTasks = tasksWithTime.length
    const completedTasks = tasksWithTime.filter(t => t.status === 'completed').length
    const inProgressTasks = tasksWithTime.filter(t => t.is_in_progress).length
    const avgHoursPerTask = totalTasks > 0 ? totalHours / totalTasks : 0

    // Fetch context data for filters
    let projectName = null
    let departmentName = null

    if (filters.project_id) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', filters.project_id)
        .single()
      projectName = projectData?.name || 'Unknown Project'
    }

    if (filters.department) {
      departmentName = filters.department
    }

    return {
      success: true,
      data: {
        metrics: {
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalTasks,
          completedTasks,
          inProgressTasks,
          avgHoursPerTask: parseFloat(avgHoursPerTask.toFixed(2)),
          groupCount: groupedArray.length
        },
        groupedData: groupedArray.map(group => ({
          ...group,
          total_hours: parseFloat(group.total_hours.toFixed(2)),
          avg_hours_per_task: group.tasks.length > 0 
            ? parseFloat((group.total_hours / group.tasks.length).toFixed(2))
            : 0
        })),
        filters: {
          ...filters,
          projectName,
          departmentName
        },
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Error generating logged time report:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error
    })
  }
})

