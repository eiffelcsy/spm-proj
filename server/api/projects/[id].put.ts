import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { ProjectDB } from '~/types'

// Using ProjectDB from types instead of local interface

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
        .maybeSingle() as { data: { id: number } | null, error: any }

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

    // Check if project exists and user owns it (excluding soft-deleted projects)
    const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('owner_id', staffRow!.id)
        .is('deleted_at', null)
        .maybeSingle() as { data: ProjectDB | null, error: any }

    if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })
    if (!existingProject) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

    // Check for duplicate project names (excluding current project and soft-deleted projects)
    const { data: duplicateProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('name', body.name.trim())
        .eq('owner_id', staffRow!.id)
        .neq('id', projectId)
        .is('deleted_at', null)
        .maybeSingle() as { data: Pick<ProjectDB, 'id'> | null, error: any }

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

    const { data: updatedProject, error: updateError } = await (supabase as any)
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId)
        .select('*')
        .single() as { data: ProjectDB | null, error: any }

    if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

    return { success: true, project: updatedProject }
})
