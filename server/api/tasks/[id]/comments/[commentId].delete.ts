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
    // Check if user is a managing director
    /////// change this once the admin role is implemented so that only admin can delete comments
    const isManagingDirector = currentDepartment === 'managing director'
    
    if (!isManagingDirector) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - Only managing directors can delete comments'
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
