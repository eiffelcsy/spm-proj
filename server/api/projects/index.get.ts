import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { ProjectDB } from '~/types'

// Using ProjectDB from types instead of local interface

export default defineEventHandler(async (event) => {
    const supabase = await serverSupabaseServiceRole(event)

    // require authenticated user and find staff.id
    const user = await serverSupabaseUser(event)
    if (!user || !user.id) {
        throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    }

    const { data: staffRow, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: number } | null, error: any }

    if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
    if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

    // Get project IDs where the user is a member
    const { data: projectMembers, error: membersError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('staff_id', staffRow.id)

    if (membersError) {
        throw createError({ statusCode: 500, statusMessage: membersError.message })
    }

    // Get projects where user is the owner
    const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', staffRow.id)
        .is('deleted_at', null)

    if (ownedError) {
        throw createError({ statusCode: 500, statusMessage: ownedError.message })
    }

    // Combine member project IDs and owned project IDs
    const memberProjectIds = projectMembers ? projectMembers.map((pm: any) => pm.project_id) : []
    const ownedProjectIds = ownedProjects ? ownedProjects.map((p: any) => p.id) : []
    const allProjectIds = [...new Set([...memberProjectIds, ...ownedProjectIds])]

    // If user has no projects (not member or owner of any), return empty array
    if (allProjectIds.length === 0) {
        return []
    }

    // Fetch all projects where user is either member or owner (excluding soft-deleted projects)
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', allProjectIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }) as { data: ProjectDB[] | null, error: any }

    if (projectsError) {
        throw createError({ statusCode: 500, statusMessage: projectsError.message })
    }

    return projects || []
})
