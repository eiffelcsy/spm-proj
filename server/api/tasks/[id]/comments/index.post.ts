import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { CommentCreateInput, TaskCommentWithStaff } from '~/types'
import { createCommentNotification, getTaskDetails } from '../../../../utils/notificationService'

// Define interfaces for Supabase responses
interface TaskResponse {
  id: number
  creator_id: number
}

interface StaffResponse {
  id: number
  fullname: string
}

interface CommentResponse {
  id: number
  task_id: number
  staff_id: number
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  staff: StaffResponse
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

  const body = await readBody(event) as CommentCreateInput

  // Validate input
  if (!body.content || body.content.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Comment content is required'
    })
  }

  if (body.content.length > 2000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Comment content cannot exceed 2000 characters'
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
      .select('id, fullname, department')
      .eq('user_id', user.id)
      .single() as { data: { id: number; fullname: string; department: string | null } | null, error: any }

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

    // Check visibility: user can only comment if someone from their department is assigned
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
          statusMessage: 'You do not have permission to comment on this task'
        })
      }
    } else {
      // If user has no department, they can't comment on any tasks
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to comment on this task'
      })
    }

    // Create the comment
    const { data: newComment, error: commentError } = await supabase
      .from('task_comments')
      .insert([{
        task_id: parseInt(taskId),
        staff_id: currentStaffId,
        content: body.content.trim()
      }] as any)
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
      .single() as { data: CommentResponse | null, error: any }

    if (commentError || !newComment) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create comment',
        data: commentError
      })
    }

    // Transform the response to match our type structure
    const transformedComment: TaskCommentWithStaff = {
      id: newComment.id,
      task_id: newComment.task_id,
      staff_id: newComment.staff_id,
      content: newComment.content,
      created_at: newComment.created_at,
      updated_at: newComment.updated_at,
      deleted_at: newComment.deleted_at,
      staff: {
        id: newComment.staff.id,
        fullname: newComment.staff.fullname,
        email: null
      }
    }

    // Create notifications for new comment
    const taskDetails = await getTaskDetails(supabase, Number(taskId))
    if (taskDetails) {
        // Get all assignees for this task
        const { data: assignees } = await supabase
          .from('task_assignees')
          .select('assigned_to_staff_id')
          .eq('task_id', Number(taskId))
          .eq('is_active', true) as { data: Array<{ assigned_to_staff_id: number }> | null }

      if (assignees && assignees.length > 0) {
        // Notify all assignees
        for (const assignee of assignees) {
          await createCommentNotification(
            supabase,
            Number(taskId),
            assignee.assigned_to_staff_id,
            currentStaffId,
            taskDetails.title,
            body.content,
            taskDetails.projectName
          )
        }
      }
    }

    return {
      success: true,
      comment: transformedComment
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
