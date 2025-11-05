import { defineEventHandler, createError } from 'h3'
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
  
  try {
    // For personal dashboard, only show tasks assigned to the current user
    // Get task IDs where the current user is an assignee
    const { data: assignedTaskIds, error: assigneeError } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('assigned_to_staff_id', currentStaffId)
      .eq('is_active', true)

    if (assigneeError && assigneeError.code !== 'PGRST116') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch assigned tasks',
        data: assigneeError
      })
    }

    const assignedTaskIdList = assignedTaskIds?.map((row: any) => row.task_id) || []

    // Fetch overdue tasks assigned to current user (excluding soft-deleted tasks)
    let query = supabase
      .from('tasks')
      .select('*')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .neq('status', 'completed')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    // Only show tasks where the current user is assigned
    if (assignedTaskIdList.length > 0) {
      query = query.in('id', assignedTaskIdList)
    } else {
      // If no assigned tasks, return empty result
      query = query.eq('id', -1) // This will return no results
    }

    const { data: tasks, error } = await query

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          tasks: [],
          count: 0
        }
      } else {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch overdue tasks',
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
