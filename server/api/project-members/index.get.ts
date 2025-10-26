import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getVisibleStaffIds } from '../../utils/departmentHierarchy'

interface StaffRow {
  id: number
  fullname: string
  user_id: string
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const projectId = query.project_id ? Number(query.project_id) : null

  // Require authenticated user
  const user = await serverSupabaseUser(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  // Get current user's staff ID and department
  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('id, department')
    .eq('user_id', user.id)
    .maybeSingle() as { data: { id: number; department: string | null } | null, error: any }

  if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
  if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

  const currentDepartment = staffRow.department

  // Get staff IDs from departments visible to current user based on hierarchy
  const visibleStaffIds = await getVisibleStaffIds(supabase, currentDepartment)

  // If no project_id is provided, return empty array (no assignees available)
  if (!projectId) {
    return []
  }

  // Fetch project members for the given project
  const { data: projectMembers, error: membersError } = await supabase
    .from('project_members')
    .select('staff_id')
    .eq('project_id', projectId)

  if (membersError) {
    throw createError({
      statusCode: 500,
      statusMessage: membersError.message,
    })
  }

  if (!projectMembers || projectMembers.length === 0) {
    return []
  }

  // Get staff IDs from project members and filter by visible staff
  const allStaffIds = projectMembers.map((pm: any) => pm.staff_id)
  const staffIds = allStaffIds.filter((id: number) => visibleStaffIds.includes(id))

  // If no visible staff in this project, return empty
  if (staffIds.length === 0) {
    return []
  }

  // Fetch staff details for visible members only
  const { data: staffData, error: staffDataError } = await supabase
    .from('staff')
    .select('id, fullname, user_id')
    .in('id', staffIds)
    .order('fullname', { ascending: true })

  if (staffDataError) {
    throw createError({
      statusCode: 500,
      statusMessage: staffDataError.message,
    })
  }

  if (!staffData) return []

  const typedStaff = staffData as StaffRow[]

  // Fetch user emails
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

