import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface StaffRow {
  id: number
  fullname: string
  user_id: string
  contact_number?: string
  staff_type?: string
  is_manager?: boolean
  is_admin?: boolean
  designation?: string
  department?: string
  created_at?: string
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Check if user is authenticated and is admin
  const user = await serverSupabaseUser(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  // Check if the user is an admin (boolean)
  const { data: currentStaff, error: staffError } = await supabase
    .from('staff')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .maybeSingle() as { data: { id: number, is_admin: boolean } | null, error: any }

  if (staffError) {
    throw createError({ statusCode: 500, statusMessage: staffError.message })
  }

  if (!currentStaff || !currentStaff.is_admin) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied. Admin privileges required.' })
  }

  // Get all staff members with their details
  const { data: staffData, error: staffFetchError } = await supabase
    .from('staff')
    .select('id, fullname, user_id, contact_number, is_manager, is_admin, designation, department,  created_at')
    .order('fullname', { ascending: true })

  if (staffFetchError) {
    throw createError({
      statusCode: 500,
      statusMessage: staffFetchError.message,
    })
  }

  if (!staffData) return []

  const typedStaff = staffData as StaffRow[]
  const userIds = typedStaff.map((s) => s.user_id)

  // Get user data from auth
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
    email: emailMap.get(staff.user_id) ?? null,
    contact_number: staff.contact_number,
    // Keep legacy single-role field for compatibility
    staff_type: staff.is_admin ? 'admin' : staff.is_manager ? 'manager' : 'staff',
    // Also expose boolean flags so UI can show multiple roles
    is_admin: !!staff.is_admin,
    is_manager: !!staff.is_manager,
    designation: staff.designation,
    department: staff.department,
    user_id: staff.user_id,
    created_at: staff.created_at
  }))
})