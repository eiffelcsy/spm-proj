import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface Project {
    id: number
    name: string
    description: string | null
    due_date: string | null
    owner_id: number
    status: string
    created_at: string
    updated_at: string
}

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

    // If user is not a member of any projects, return empty array
    if (!projectMembers || projectMembers.length === 0) {
        return []
    }

    // Get the project IDs
    const projectIds = projectMembers.map((pm: any) => pm.project_id)

    // Fetch only the projects where the user is a member
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false }) as { data: Project[] | null, error: any }

    if (projectsError) {
        throw createError({ statusCode: 500, statusMessage: projectsError.message })
    }

    return projects || []
})
