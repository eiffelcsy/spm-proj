import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getVisibleStaffIds } from '../../utils/departmentHierarchy'

interface StaffRow {
  id: number
  fullname: string
  user_id: string
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

  // Get current user's department
  const { data: currentStaffData, error: currentStaffError } = await supabase
    .from('staff')
    .select('department')
    .eq('user_id', user.id)
    .single()

  if (currentStaffError) {
    throw createError({
      statusCode: 500,
      statusMessage: currentStaffError.message,
    })
  }

  const currentDepartment = (currentStaffData as { department: string | null }).department

  // Get staff IDs from departments visible to current user based on hierarchy
  const visibleStaffIds = await getVisibleStaffIds(supabase, currentDepartment)

  if (visibleStaffIds.length === 0) {
    return []
  }

  // Fetch only visible staff
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, fullname, user_id')
    .in('id', visibleStaffIds)
    .order('fullname', { ascending: true })

  if (staffError) {
    throw createError({
      statusCode: 500,
      statusMessage: staffError.message,
    })
  }

  if (!staffData) return []

  const typedStaff = staffData as StaffRow[]

  const userIds = typedStaff.map((s) => s.user_id)

  const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) {
    throw createError({
      statusCode: 500,
      statusMessage: userError.message,
    })
  }

  const users = userData?.users ?? []
  const emailMap = new Map(
    users
      .filter((u) => userIds.includes(u.id))
      .map((u) => [u.id, u.email])
  )

  return typedStaff.map((staff) => ({
    id: staff.id,
    fullname: staff.fullname,
    email: emailMap.get(staff.user_id) ?? null
  }))
})
