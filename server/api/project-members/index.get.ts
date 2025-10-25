import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

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

  // Get current user's staff ID
  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle() as { data: { id: number } | null, error: any }

  if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
  if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

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

  // Get staff IDs from project members
  const staffIds = projectMembers.map((pm: any) => pm.staff_id)

  // Fetch staff details for these members
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

