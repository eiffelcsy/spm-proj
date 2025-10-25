import { defineEventHandler } from 'h3'
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
    // Soft delete all read notifications for this staff member
    const { error: deleteError } = await (supabase as any)
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('staff_id', currentStaffId)
      .eq('is_read', true)
      .is('deleted_at', null) // Only update if not already deleted

    if (deleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete read notifications',
        data: deleteError
      })
    }

    return {
      success: true,
      message: 'All read notifications deleted successfully'
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
