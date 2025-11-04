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
    // Verify notification belongs to current user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, staff_id')
      .eq('id', notificationId)
      .eq('staff_id', currentStaffId)
      .single()

    if (fetchError || !notification) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Notification not found'
      })
    }

    // Mark notification as read
    const { error: updateError } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('staff_id', currentStaffId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to mark notification as read',
        data: updateError
      })
    }

    return {
      success: true,
      message: 'Notification marked as read'
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
