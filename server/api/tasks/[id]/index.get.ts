import { defineEventHandler, getRouterParam, createError } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getVisibleStaffIds } from '../../../utils/departmentHierarchy'

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

  // Get current user's staff ID, department, and role
  const { data: staffIdData, error: staffIdError } = await supabase
    .from('staff')
    .select('id, department, is_manager, is_admin')
    .eq('user_id', user.id)
    .single()

  if (staffIdError || !staffIdData) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff ID',
      data: staffIdError
    })
  }
  const currentStaffId = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).id
  const currentDepartment = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).department
  const isManager = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).is_manager
  const isAdmin = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).is_admin

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  try {
    // Main task (fetch without join first, excluding soft-deleted tasks)
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .is('deleted_at', null)
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
    
    // Fetch project information (excluding soft-deleted projects)
    let project = null
    if (task && task.project_id) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', task.project_id)
        .is('deleted_at', null)
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

    // Check visibility: user can only see task if someone from visible departments is assigned
    // Get staff IDs from departments visible to current user based on hierarchy
    const visibleStaffIds = await getVisibleStaffIds(supabase, currentDepartment)
    
    if (visibleStaffIds.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to view this task'
      })
    }
    
    // Check if any assignee is from visible departments
    const hasVisibleAssignee = assignees.some((assignee: any) => 
      assignee.assigned_to.id && visibleStaffIds.includes(assignee.assigned_to.id)
    )
    
    if (!hasVisibleAssignee) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to view this task'
      })
    }

    // Fetch activity timeline for this task
    const { data: history, error: timelineError } = await supabase
      .from('activity_timeline')
      .select('*, staff:staff_id (fullname)')
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
        .is('deleted_at', null)
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
    const isAssigned = assignees.some((assignee: any) => assignee.assigned_to.id === currentStaffId)

    let canEdit = false
    let canDelete = false
    
    if (isManager) {
      // Managers can edit and delete any task they can view
      canEdit = true
      canDelete = true
    } else if (isAssigned) {
      // Assigned users can edit and delete the task
      canEdit = true
      canDelete = true
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