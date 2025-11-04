import { defineEventHandler, getRouterParam, createError } from 'h3'
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

  const taskId = getRouterParam(event, 'id')
  const commentId = getRouterParam(event, 'commentId')
  
  if (!taskId || !commentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID and Comment ID are required'
    })
  }

  try {
    // Get current user's role booleans
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('is_manager, is_admin')
      .eq('user_id', user.id)
      .single() as { data: { is_manager: boolean, is_admin: boolean } | null, error: any }

    if (staffError || !staffData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff information'
      })
    }

    const isManager = !!staffData.is_manager
    const isAdmin = !!staffData.is_admin

    // Verify comment exists and belongs to the task
    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .select('id, task_id, staff_id')
      .eq('id', commentId)
      .eq('task_id', taskId)
      .is('deleted_at', null)
      .single() as { data: { id: number; task_id: number; staff_id: number } | null, error: any }

    if (commentError || !comment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Comment not found'
      })
    }
    // Check permission: managers or admins can delete comments
    if (!isManager && !isAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - Only managers or admins can delete comments'
      })
    }

    // Soft delete the comment
    const deletedAt = new Date().toISOString()
    
    const { data: updateData, error: deleteError } = await (supabase as any)
      .from('task_comments')
      .update({
        deleted_at: deletedAt
      })
      .eq('id', commentId)
      .select()

    if (deleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete comment',
        data: deleteError
      })
    }

    if (!updateData || updateData.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Comment not found or already deleted'
      })
    }

    return {
      success: true,
      message: 'Comment deleted successfully'
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
