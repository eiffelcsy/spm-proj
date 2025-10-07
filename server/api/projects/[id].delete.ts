import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const supabase = await serverSupabaseServiceRole(event)
    const projectId = getRouterParam(event, 'id')

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

    const numericProjectId = Number(projectId)

    // Check if project exists and user owns it
    const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', numericProjectId)
        .eq('owner_id', staffRow.id)
        .is('deleted_at', null)
        .maybeSingle()

    if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })
    if (!existingProject) {
        // Let's also check if the project exists at all (without owner check)
        const { data: anyProject, error: anyError } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', numericProjectId)
            .is('deleted_at', null)
            .maybeSingle()
        
        if (anyProject) {
            throw createError({ statusCode: 403, statusMessage: 'You do not have permission to delete this project' })
        } else {
            throw createError({ statusCode: 404, statusMessage: 'Project not found' })
        }
    }

    try {
        // Soft delete all tasks associated with this project
        const { error: tasksSoftDeleteError } = await (supabase as any)
            .from('tasks')
            .update({ deleted_at: new Date().toISOString() })
            .eq('project_id', numericProjectId)
            .is('deleted_at', null)

        if (tasksSoftDeleteError) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to soft delete associated tasks' })
        }

        // Soft delete the project
        const { error: projectSoftDeleteError } = await (supabase as any)
            .from('projects')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', numericProjectId)

        if (projectSoftDeleteError) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to soft delete project' })
        }

        return { 
            success: true, 
            message: 'Project and all associated tasks have been successfully deleted.' 
        }

    } catch (error: any) {
        // Provide more specific error messages
        if (error?.message) {
            throw createError({ 
                statusCode: 500, 
                statusMessage: error.message 
            })
        } else {
            throw createError({ 
                statusCode: 500, 
                statusMessage: 'An error occurred while deleting the project' 
            })
        }
    }
})
