import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { ProjectDB, TaskDB } from '~/types'

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

    // Check if project exists and user owns it (only non-deleted projects)
    const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', numericProjectId)
        .eq('owner_id', staffRow.id)
        .is('deleted_at', null)
        .maybeSingle() as { data: ProjectDB | null, error: any }

    if (fetchError) throw createError({ statusCode: 500, statusMessage: fetchError.message })
    if (!existingProject) {
        // Let's also check if the project exists at all (without owner check, including soft-deleted)
        const { data: anyProject, error: anyError } = await supabase
            .from('projects')
            .select('id, owner_id, deleted_at')
            .eq('id', numericProjectId)
            .maybeSingle() as { data: Pick<ProjectDB, 'id' | 'owner_id' | 'deleted_at'> | null, error: any }
        
        if (anyProject) {
            if (anyProject.deleted_at) {
                throw createError({ statusCode: 404, statusMessage: 'Project not found' })
            } else {
                throw createError({ statusCode: 403, statusMessage: 'You do not have permission to delete this project' })
            }
        } else {
            throw createError({ statusCode: 404, statusMessage: 'Project not found' })
        }
    }

    try {
        // First, get all tasks associated with this project (only non-deleted tasks)
        const { data: projectTasks, error: fetchTasksError } = await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', numericProjectId)
            .is('deleted_at', null) as { data: Pick<TaskDB, 'id'>[] | null, error: any }

        if (fetchTasksError) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to fetch associated tasks' })
        }

        // Soft delete related tasks first
        if (projectTasks && projectTasks.length > 0) {
            const taskIds = projectTasks.map(task => task.id)
            
            // Soft delete the tasks by setting deleted_at timestamp
            const { error: tasksDeleteError } = await (supabase as any)
                .from('tasks')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', taskIds)

            if (tasksDeleteError) {
                throw createError({ statusCode: 500, statusMessage: 'Failed to soft delete associated tasks' })
            }
        }

        // Soft delete the project by setting deleted_at timestamp
        const { error: projectDeleteError } = await (supabase as any)
            .from('projects')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', numericProjectId)

        if (projectDeleteError) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to soft delete project' })
        }

        return { 
            success: true, 
            message: 'Project and all associated tasks have been successfully soft deleted.' 
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
