import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { NotificationWithRelations } from '~/types'

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
    // Fetch notifications with related data (excluding soft-deleted)
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        triggered_by:triggered_by_staff_id (
          id,
          fullname
        ),
        related_task:related_task_id (
          id,
          title,
          project_id
        ),
        related_project:related_project_id (
          id,
          name
        )
      `)
      .eq('staff_id', currentStaffId)
      .is('deleted_at', null) // Exclude soft-deleted notifications
      .order('created_at', { ascending: false })
      .limit(50) // Limit to last 50 notifications

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch notifications',
        data: error
      })
    }

    return {
      notifications: notifications || []
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
