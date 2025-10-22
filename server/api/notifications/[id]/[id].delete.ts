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

  const notificationId = getRouterParam(event, 'id')
  if (!notificationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Notification ID is required'
    })
  }

  // Get current user's staff ID
  const { data: staffIdData, error: staffIdError } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (staffIdError || !staffIdData) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff ID',
      data: staffIdError
    })
  }
  const currentStaffId = (staffIdData as { id: number }).id
  
  try {
    // Verify notification belongs to current user and soft delete it
    const { error: deleteError } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('staff_id', currentStaffId)
      .is('deleted_at', null) // Only update if not already deleted

    if (deleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete notification',
        data: deleteError
      })
    }

    return {
      success: true,
      message: 'Notification deleted successfully'
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
