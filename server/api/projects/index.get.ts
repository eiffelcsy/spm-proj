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

    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false }) as { data: Project[] | null, error: any }

    if (projectsError) {
        throw createError({ statusCode: 500, statusMessage: projectsError.message })
    }

    return projects || []
})
