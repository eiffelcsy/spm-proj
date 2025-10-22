import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { TaskCommentWithStaff } from '~/types'

// Define interfaces for Supabase responses
interface TaskResponse {
  id: number
  creator_id: number
}

interface StaffResponse {
  id: number
}

interface CommentResponse {
  id: number
  task_id: number
  staff_id: number
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  staff: {
    id: number
    fullname: string
  }
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

  const taskId = getRouterParam(event, 'id')
  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  try {
    // Verify task exists and user has access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, creator_id')
      .eq('id', taskId)
      .is('deleted_at', null)
      .single() as { data: TaskResponse | null, error: any }

    if (taskError || !task) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Task not found'
      })
    }

    // Get current user's staff ID and department
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, department')
      .eq('user_id', user.id)
      .single() as { data: { id: number; department: string | null } | null, error: any }

    if (staffError || !staffData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID'
      })
    }

    const currentStaffId = staffData.id
    const currentDepartment = staffData.department

    // Get task assignees
    const { data: assigneeRows } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id')
      .eq('task_id', taskId)
      .eq('is_active', true)

    // Check visibility: user can only view comments if someone from their department is assigned
    if (currentDepartment) {
      // Get all staff IDs in the same department
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
      
      const departmentStaffIds = departmentStaff?.map((s: any) => s.id) || []
      
      // Check if any assignee is from the user's department
      const hasAssigneeFromDepartment = assigneeRows?.some((row: any) => 
        departmentStaffIds.includes(row.assigned_to_staff_id)
      )
      
      if (!hasAssigneeFromDepartment) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to view comments on this task'
        })
      }
    } else {
      // If user has no department, they can't view any comments
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to view comments on this task'
      })
    }

    // Fetch comments with staff details, ordered by creation date (oldest first)
    const { data: comments, error: commentsError } = await supabase
      .from('task_comments')
      .select(`
        id,
        task_id,
        staff_id,
        content,
        created_at,
        updated_at,
        deleted_at,
        staff:staff_id (
          id,
          fullname
        )
      `)
      .eq('task_id', taskId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }) as { data: CommentResponse[] | null, error: any }

    if (commentsError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch comments',
        data: commentsError
      })
    }

    // Transform the data to match our type structure
    const transformedComments: TaskCommentWithStaff[] = comments?.map(comment => ({
      id: comment.id,
      task_id: comment.task_id,
      staff_id: comment.staff_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      deleted_at: comment.deleted_at,
      staff: {
        id: comment.staff.id,
        fullname: comment.staff.fullname,
        email: null // We don't need email for comments
      }
    })) || []

    return {
      success: true,
      comments: transformedComments
    }

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
