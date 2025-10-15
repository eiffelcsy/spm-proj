import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const staffId = getRouterParam(event, 'id')

  if (!staffId) {
    throw createError({ statusCode: 400, statusMessage: 'Staff ID is required' })
  }

  // Check if user is authenticated and is admin
  const user = await serverSupabaseUser(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  // Check if the current user is an admin
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

  // Prevent admin from changing their own staff type
  if (currentStaff.id === Number(staffId)) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot modify your own admin status' })
  }

  const body = await readBody(event)
  const { 
    staff_type, 
    fullname, 
    contact_number, 
    dob, 
    designation, 
    department, 
    address 
  } = body

  // Validate staff_type
  if (staff_type && !['admin', 'manager', 'staff'].includes(staff_type)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid staff type. Must be "admin", "manager", or "staff"' })
  }

  // Build update object
  const updateData: Record<string, any> = {}
  if (staff_type !== undefined) updateData.staff_type = staff_type
  if (fullname !== undefined) updateData.fullname = fullname
  if (contact_number !== undefined) updateData.contact_number = contact_number
  if (dob !== undefined) updateData.dob = dob
  if (designation !== undefined) updateData.designation = designation
  if (department !== undefined) updateData.department = department
  if (address !== undefined) updateData.address = address

  if (Object.keys(updateData).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  // Update the staff member
  const { data, error } = await (supabase as any)
    .from('staff')
    .update(updateData)
    .eq('id', staffId)
    .select()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  if (!data || data.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
  }

  return { 
    success: true, 
    message: 'Staff member updated successfully',
    data: data[0]
  }
})
