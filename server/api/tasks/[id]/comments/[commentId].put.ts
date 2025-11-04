import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getVisibleStaffIds } from '../../../../utils/departmentHierarchy'
import type { TaskCommentWithStaff } from '~/types'

// Define interfaces for Supabase responses
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
  const commentId = getRouterParam(event, 'commentId')
  
  if (!taskId || !commentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID and Comment ID are required'
    })
  }

  const body = await readBody(event) as { content: string }

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

    // Verify task exists and user has department-based access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .is('deleted_at', null)
      .single()

    if (taskError || !task) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Task not found'
      })
    }

    // Get task assignees
    const { data: assigneeRows } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id')
      .eq('task_id', taskId)
      .eq('is_active', true)

    // Check visibility: user can only edit comments if someone from visible departments is assigned
    // Get staff IDs from departments visible to current user based on hierarchy
    const visibleStaffIds = await getVisibleStaffIds(supabase, currentDepartment)
    
    if (visibleStaffIds.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to edit comments on this task'
      })
    }
    
    // Check if any assignee is from visible departments
    const hasVisibleAssignee = assigneeRows?.some((row: any) => 
      visibleStaffIds.includes(row.assigned_to_staff_id)
    )
    
    if (!hasVisibleAssignee) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to edit comments on this task'
      })
    }

    // Verify comment exists and belongs to the task
    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .select('id, task_id, staff_id, content, created_at, updated_at, deleted_at')
      .eq('id', commentId)
      .eq('task_id', taskId)
      .is('deleted_at', null)
      .single() as { data: any | null, error: any }

    if (commentError || !comment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Comment not found'
      })
    }

    // Check if user is the author of the comment
    if (comment.staff_id !== currentStaffId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - You can only edit your own comments'
      })
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await (supabase as any)
      .from('task_comments')
      .update({
        content: body.content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
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
      .single()

    if (updateError || !updatedComment) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update comment',
        data: updateError
      })
    }

    // Transform the response to match our type structure
    const transformedComment: TaskCommentWithStaff = {
      id: updatedComment.id,
      task_id: updatedComment.task_id,
      staff_id: updatedComment.staff_id,
      content: updatedComment.content,
      created_at: updatedComment.created_at,
      updated_at: updatedComment.updated_at,
      deleted_at: updatedComment.deleted_at,
      staff: {
        id: updatedComment.staff.id,
        fullname: updatedComment.staff.fullname,
        email: null
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
