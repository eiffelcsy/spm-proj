import { defineEventHandler, readBody, getRouterParam, createError } from 'h3'
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
        .select('id, is_manager')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: number; is_manager: boolean } | null, error: any }

    if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
    if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

    // Check if user is a manager
    if (!staffRow.is_manager) {
        throw createError({
            statusCode: 403,
            statusMessage: "Only managers can edit projects.",
        });
    }
    
    // Validate project ID
    if (!projectId || isNaN(Number(projectId))) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid project ID' })
    }

    // Validate required fields
    if (!body.name || !body.name.trim()) {
        throw createError({ statusCode: 400, statusMessage: 'Project title is required.' })
    }

     // Validate priority if provided
    if (body.priority && !['low', 'medium', 'high'].includes(body.priority)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid priority value.",
        });
    }

    // Validate status if provided
    if (body.status && !['todo', 'in-progress', 'completed', 'blocked'].includes(body.status)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid status value.",
        });
    }

    // Check if project exists and user owns it (excluding soft-deleted projects)
    const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .is('deleted_at', null)
        .maybeSingle() as { data: ProjectDB | null, error: any }

    if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })
    if (!existingProject) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

    // Check for duplicate project names (excluding current project and soft-deleted projects)
    const { data: duplicateProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('name', body.name.trim())
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
        priority: body.priority || 'medium',
        due_date: body.due_date || null,
        tags: body.tags || [],
        status: body.status || 'todo',
        updated_at: new Date().toISOString()
    }

    const { data: updatedProject, error: updateError } = await (supabase as any)
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId)
        .select('*')
        .single() as { data: ProjectDB | null, error: any }

    if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

    // Membership table no longer used: skip assigned users update

    return { success: true, project: updatedProject }
})
