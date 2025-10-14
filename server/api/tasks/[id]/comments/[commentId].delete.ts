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
    // Verify comment exists and belongs to the task
    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .select('id, task_id, staff_id')
      .eq('id', commentId)
      .eq('task_id', taskId)
      .is('deleted_at', null)
      .single()

    if (commentError || !comment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Comment not found'
      })
    }

    // Soft delete the comment
    const deletedAt = new Date().toISOString()
    console.log(`Attempting to soft delete comment ${commentId} with deleted_at: ${deletedAt}`)
    
    const { data: updateData, error: deleteError } = await supabase
      .from('task_comments')
      .update({
        deleted_at: deletedAt
      })
      .eq('id', commentId)
      .select()

    console.log('Update result:', { updateData, deleteError })

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete comment',
        data: deleteError
      })
    }

    if (!updateData || updateData.length === 0) {
      console.error('No rows were updated')
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
