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

    // Get current user's staff ID
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: StaffResponse | null, error: any }

    if (staffError || !staffData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID'
      })
    }

    const currentStaffId = staffData.id

    // Check if user has access to this task (creator or assignee)
    const { data: assigneeData } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('task_id', taskId)
      .eq('assigned_to_staff_id', currentStaffId)
      .eq('is_active', true)
      .single()

    const isCreator = task.creator_id === currentStaffId
    const isAssignee = !!assigneeData

    if (!isCreator && !isAssignee) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - You can only view comments on tasks you created or are assigned to'
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
