import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getVisibleStaffIds } from '../../utils/departmentHierarchy'

interface ReportFilters {
  project_id?: number
  start_date?: string
  end_date?: string
  period?: 'weekly' | 'monthly'
}

interface TeamMemberPerformance {
  staff_id: number
  fullname: string
  tasks_completed: number
  tasks_in_progress: number
  tasks_not_started: number
  tasks_blocked: number
  total_tasks: number
  completion_rate: number
  total_hours_logged: number
}

interface TaskStatusBreakdown {
  not_started: number
  in_progress: number
  completed: number
  blocked: number
  total: number
}

interface CompletionTrend {
  date: string
  completed_count: number
  total_count: number
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

  // Get current user's staff record to verify they're a manager/admin
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, is_manager, is_admin, department')
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
  if (!staffData.is_manager && !staffData.is_admin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied - Only managers and admins can generate reports'
    })
  }

  const currentDepartment = (staffData as { id: number; is_manager: boolean; is_admin: boolean; department: string | null }).department

  // Get staff IDs from departments visible to current user based on hierarchy
  const visibleStaffIds = await getVisibleStaffIds(supabase, currentDepartment)

  // Parse query parameters
  const query = getQuery(event)
  const filters: ReportFilters = {
    project_id: query.project_id ? parseInt(query.project_id as string) : undefined,
    start_date: query.start_date as string | undefined,
    end_date: query.end_date as string | undefined,
    period: (query.period as 'weekly' | 'monthly') || 'weekly',
  }

  try {
    // Validate that project_id is provided (required for team summary)
    if (!filters.project_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Project ID is required for team summary reports'
      })
    }

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', filters.project_id)
      .is('deleted_at', null)
      .single()

    if (projectError || !project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      })
    }

    // Build base query for tasks in this project
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        start_date,
        due_date,
        created_at,
        completed_at,
        project_id
      `)
      .eq('project_id', filters.project_id)
      .is('deleted_at', null)

    // Apply date filters
    if (filters.start_date) {
      tasksQuery = tasksQuery.gte('created_at', filters.start_date)
    }
    if (filters.end_date) {
      tasksQuery = tasksQuery.lte('created_at', filters.end_date)
    }

    const { data: tasks, error: tasksError } = await tasksQuery

    if (tasksError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks',
        data: tasksError
      })
    }

    // Calculate task status breakdown
    const statusBreakdown: TaskStatusBreakdown = {
      not_started: tasks.filter(t => t.status === 'not-started').length,
      in_progress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      total: tasks.length
    }

    // Calculate overdue tasks (not completed and past due date)
    const now = new Date()
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.due_date && 
      new Date(t.due_date) < now
    )

    // Calculate completion trends
    const completionTrends: CompletionTrend[] = []
    if (tasks.length > 0) {
      // Group completed tasks by date
      const completedByDate = new Map<string, number>()
      const totalByDate = new Map<string, number>()
      
      tasks.forEach(task => {
        const dateKey = task.created_at.split('T')[0]
        totalByDate.set(dateKey, (totalByDate.get(dateKey) || 0) + 1)
        
        if (task.completed_at) {
          const completedDateKey = task.completed_at.split('T')[0]
          completedByDate.set(completedDateKey, (completedByDate.get(completedDateKey) || 0) + 1)
        }
      })

      // Create trend data (last 7 days for weekly, last 30 days for monthly)
      const daysToShow = filters.period === 'weekly' ? 7 : 30
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        
        completionTrends.push({
          date: dateKey,
          completed_count: completedByDate.get(dateKey) || 0,
          total_count: totalByDate.get(dateKey) || 0
        })
      }
    }

    // Derive staff from task assignees within the project (no membership table)
    const { data: assigneesRecords, error: assigneesError } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id, task_id')
      .is('deleted_at', null)

    if (assigneesError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch task assignees',
        data: assigneesError
      })
    }

    const taskIdsInProject = new Set((tasks || []).map(t => t.id))
    const projectStaffIds = Array.from(new Set((assigneesRecords || [])
      .filter(r => taskIdsInProject.has(r.task_id))
      .map(r => r.assigned_to_staff_id)))
    const staffIds = projectStaffIds.filter(id => visibleStaffIds.includes(id))

    // Fetch staff details only for visible staff
    const { data: staffList, error: staffError2 } = await supabase
      .from('staff')
      .select('id, fullname')
      .in('id', staffIds)

    if (staffError2) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff details',
        data: staffError2
      })
    }

    // Calculate performance metrics for each team member
    const teamPerformance: TeamMemberPerformance[] = []
    
    for (const staff of staffList || []) {
      // Get tasks assigned to this staff member
      const { data: assigneeRecords } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('assigned_to_staff_id', staff.id)
        .eq('is_active', true)
        .is('deleted_at', null)

      const assignedTaskIds = assigneeRecords?.map(ar => ar.task_id) || []
      const assignedTasks = tasks.filter(t => assignedTaskIds.includes(t.id))

      // Calculate task counts by status
      const tasksCompleted = assignedTasks.filter(t => t.status === 'completed').length
      const tasksInProgress = assignedTasks.filter(t => t.status === 'in-progress').length
      const tasksNotStarted = assignedTasks.filter(t => t.status === 'not-started').length
      const tasksBlocked = assignedTasks.filter(t => t.status === 'blocked').length
      const totalTasks = assignedTasks.length

      // Calculate completion rate
      const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0

      // Calculate total hours logged
      let totalHoursLogged = 0
      for (const task of assignedTasks) {
        if (task.completed_at && task.created_at) {
          const created = new Date(task.created_at)
          const completed = new Date(task.completed_at)
          const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60)
          totalHoursLogged += hours
        }
      }

      teamPerformance.push({
        staff_id: staff.id,
        fullname: staff.fullname,
        tasks_completed: tasksCompleted,
        tasks_in_progress: tasksInProgress,
        tasks_not_started: tasksNotStarted,
        tasks_blocked: tasksBlocked,
        total_tasks: totalTasks,
        completion_rate: parseFloat(completionRate.toFixed(1)),
        total_hours_logged: parseFloat(totalHoursLogged.toFixed(2))
      })
    }

    // Sort by completion rate (descending) to identify top performers
    const topPerformers = [...teamPerformance]
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, 5)

    // Calculate team workload distribution
    const totalTeamTasks = teamPerformance.reduce((sum, member) => sum + member.total_tasks, 0)
    const avgTasksPerMember = staffList.length > 0 ? totalTeamTasks / staffList.length : 0
    
    const workloadDistribution = teamPerformance.map(member => ({
      staff_id: member.staff_id,
      fullname: member.fullname,
      task_count: member.total_tasks,
      percentage: totalTeamTasks > 0 ? (member.total_tasks / totalTeamTasks) * 100 : 0,
      variance_from_avg: member.total_tasks - avgTasksPerMember
    }))

    // Calculate overall completion rate
    const totalCompletedTasks = statusBreakdown.completed
    const overallCompletionRate = statusBreakdown.total > 0 
      ? (totalCompletedTasks / statusBreakdown.total) * 100 
      : 0

    return {
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description
        },
        metrics: {
          statusBreakdown,
          overallCompletionRate: parseFloat(overallCompletionRate.toFixed(1)),
          overdueTaskCount: overdueTasks.length,
          totalTeamMembers: staffList.length,
          avgTasksPerMember: parseFloat(avgTasksPerMember.toFixed(1)),
          totalHoursLogged: parseFloat(
            teamPerformance.reduce((sum, m) => sum + m.total_hours_logged, 0).toFixed(2)
          )
        },
        completionTrends,
        topPerformers,
        teamPerformance,
        workloadDistribution,
        filters: {
          ...filters,
          projectName: project.name
        },
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error
    }
    
    console.error('Error generating team summary report:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error
    })
  }
})

