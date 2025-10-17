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

    // Check visibility: user can only delete comments if someone from their department is assigned
    if (currentDepartment) {
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
      const hasAssigneeFromDepartment = assigneeRows?.some((row: any) => 
        departmentStaffIds.includes(row.assigned_to_staff_id)
      )
      
      if (!hasAssigneeFromDepartment) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to delete comments on this task'
        })
      }
    } else {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to delete comments on this task'
      })
    }

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

    // Check if user is the author of the comment
    if (comment.staff_id !== currentStaffId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - You can only delete your own comments'
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
