import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface StaffRow {
  id: number
  fullname: string
  user_id: string
  contact_number?: string
  dob?: string
  date_joined?: string
  staff_type?: string
  designation?: string
  department?: string
  address?: string
  created_at?: string
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Check if user is authenticated and is admin
  const user = await serverSupabaseUser(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  // Check if the user is an admin
  const { data: currentStaff, error: staffError } = await supabase
    .from('staff')
    .select('id, staff_type')
    .eq('user_id', user.id)
    .maybeSingle() as { data: { id: number, staff_type: string } | null, error: any }

  if (staffError) {
    throw createError({ statusCode: 500, statusMessage: staffError.message })
  }

  if (!currentStaff || currentStaff.staff_type !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Access denied. Admin privileges required.' })
  }

  // Get all staff members with their details
  const { data: staffData, error: staffFetchError } = await supabase
    .from('staff')
    .select('id, fullname, user_id, contact_number, dob, date_joined, staff_type, designation, department, address, created_at')
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
    dob: staff.dob,
    date_joined: staff.date_joined,
    staff_type: staff.staff_type || 'staff',
    designation: staff.designation,
    department: staff.department,
    address: staff.address,
    user_id: staff.user_id,
    created_at: staff.created_at
  }))
})
