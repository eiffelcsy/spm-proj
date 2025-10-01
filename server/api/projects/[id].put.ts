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
    const projectId = getRouterParam(event, 'id')
    const body = await readBody(event)

    // Authentication & authorization
    const user = await serverSupabaseUser(event)
    if (!user?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    }

    // Get staff record
    const { data: staffRow, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
    if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

    // Validate project ID
    if (!projectId || isNaN(Number(projectId))) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid project ID' })
    }

    // Validate required fields
    if (!body.name || !body.name.trim()) {
        throw createError({ statusCode: 400, statusMessage: 'Project title is required.' })
    }

    // Check if project exists and user owns it
    const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('owner_id', staffRow.id)
        .maybeSingle()

    if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })
    if (!existingProject) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

    // Check for duplicate project names (excluding current project)
    const { data: duplicateProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('name', body.name.trim())
        .eq('owner_id', staffRow.id)
        .neq('id', projectId)
        .maybeSingle()

    if (checkError) throw createError({ statusCode: 500, statusMessage: checkError.message })
    if (duplicateProject) {
        throw createError({ statusCode: 400, statusMessage: 'A project with this name already exists.' })
    }

    // Update project
    const updatePayload = {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        due_date: body.due_date || null,
        status: body.status || 'active',
        updated_at: new Date().toISOString()
    }

    const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId)
        .select('*')
        .single()

    if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

    return { success: true, project: updatedProject }
})
