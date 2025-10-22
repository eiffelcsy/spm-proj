import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * Add collaborators/members to a project
 * POST /api/project-members
 * Body: { project_id: number, staff_ids: number[] }
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const body = await readBody(event)

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

  // Validate input
  if (!body.project_id) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID is required' })
  }
  if (!body.staff_ids || !Array.isArray(body.staff_ids) || body.staff_ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Staff IDs array is required' })
  }

  const projectId = Number(body.project_id)
  const staffIds = body.staff_ids.map((id: any) => Number(id))

  // Check if user is the project owner or a manager
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single() as { data: { owner_id: number } | null, error: any }

  if (projectError || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  // Check if user is owner or manager of the project
  const isOwner = project.owner_id === staffRow.id
  
  const { data: memberRole, error: memberError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('staff_id', staffRow.id)
    .maybeSingle() as { data: { role: string } | null, error: any }

  const isManager = memberRole?.role === 'manager'

  if (!isOwner && !isManager) {
    throw createError({ statusCode: 403, statusMessage: 'Only project owners and managers can add members' })
  }

  // Check which staff members are already in the project
  const { data: existingMembers, error: existingError } = await supabase
    .from('project_members')
    .select('staff_id')
    .eq('project_id', projectId)
    .in('staff_id', staffIds) as { data: { staff_id: number }[] | null, error: any }

  if (existingError) {
    throw createError({ statusCode: 500, statusMessage: existingError.message })
  }

  const existingStaffIds = new Set(existingMembers?.map(m => m.staff_id) || [])
  const newStaffIds = staffIds.filter((id: number) => !existingStaffIds.has(id))

  if (newStaffIds.length === 0) {
    return { success: true, message: 'All selected members are already in the project', added: 0 }
  }

  // Add new members with 'member' role
  const now = new Date().toISOString()
  const membersToAdd = newStaffIds.map((staff_id: number) => ({
    project_id: projectId,
    staff_id,
    role: 'member',
    invited_at: now,
    joined_at: now
  }))

  const { error: insertError } = await supabase
    .from('project_members')
    .insert(membersToAdd)

  if (insertError) {
    throw createError({ statusCode: 500, statusMessage: insertError.message })
  }

  return { 
    success: true, 
    message: `Successfully added ${newStaffIds.length} member(s) to the project`,
    added: newStaffIds.length
  }
})

