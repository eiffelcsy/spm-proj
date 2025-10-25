import { defineEventHandler } from 'h3'
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
        .select('id, department')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: number; department: string | null } | null, error: any }

    if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
    if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

    const currentStaffId = staffRow.id
    const currentDepartment = staffRow.department

    // If user has no department, they can't see any projects
    if (!currentDepartment) {
        return []
    }

    // Get all staff IDs in the same department
    const { data: departmentStaff, error: deptError } = await supabase
        .from('staff')
        .select('id')
        .eq('department', currentDepartment)

    if (deptError) {
        throw createError({ statusCode: 500, statusMessage: deptError.message })
    }

    const departmentStaffIds = departmentStaff?.map((s: any) => s.id) || []

    if (departmentStaffIds.length === 0) {
        return []
    }

    // Fetch all projects (excluding soft-deleted projects)
    // We no longer filter by membership here - visibility is determined by task assignments
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }) as { data: ProjectDB[] | null, error: any }

    if (projectsError) {
        throw createError({ statusCode: 500, statusMessage: projectsError.message })
    }

    if (!projects || projects.length === 0) {
        return []
    }

    // Filter projects: only include projects that have at least one task assigned to someone in the user's department
    const visibleProjectIds = new Set<number>()

    for (const project of projects) {
        // Get all tasks for this project
        const { data: projectTasks, error: tasksError } = await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', project.id)
            .is('deleted_at', null)

        if (tasksError || !projectTasks || projectTasks.length === 0) {
            continue
        }

        const taskIds = projectTasks.map((t: any) => t.id)

        // Get task assignees for all tasks in this project
        const { data: taskAssignees, error: assigneeError } = await supabase
            .from('task_assignees')
            .select('assigned_to_staff_id')
            .in('task_id', taskIds)
            .eq('is_active', true)

        if (assigneeError) {
            continue
        }

        // Check if any assignee is from the user's department
        if (taskAssignees) {
            const hasDepartmentAssignee = taskAssignees.some((assignee: any) => 
                departmentStaffIds.includes(assignee.assigned_to_staff_id)
            )

            if (hasDepartmentAssignee) {
                visibleProjectIds.add(project.id)
            }
        }
    }

    // Filter projects to only include visible ones
    const visibleProjects = projects.filter((project: ProjectDB) => visibleProjectIds.has(project.id))

    return visibleProjects
})
