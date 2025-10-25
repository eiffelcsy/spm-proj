import { defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * Remove a collaborator/member from a project
 * DELETE /api/project-members
 * Body: { project_id: number, staff_id: number }
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
  if (!body.staff_id) {
    throw createError({ statusCode: 400, statusMessage: 'Staff ID is required' })
  }

  const projectId = Number(body.project_id)
  const staffIdToRemove = Number(body.staff_id)

  // Check if user is the project owner or a manager
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single() as { data: { owner_id: number } | null, error: any }

  if (projectError || !project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  // Prevent removing the project owner
  if (project.owner_id === staffIdToRemove) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot remove the project owner from the project' })
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
    throw createError({ statusCode: 403, statusMessage: 'Only project owners and managers can remove members' })
  }

  // Remove the member
  const { error: deleteError } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('staff_id', staffIdToRemove)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: deleteError.message })
  }

  return { 
    success: true, 
    message: 'Member removed from project successfully'
  }
})

