import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { ProjectDB, TaskDB } from '~/types'

interface ArchivedTask extends Pick<
  TaskDB,
  'id' | 'title' | 'status' | 'deleted_at' | 'project_id' | 'creator_id' | 'parent_task_id' | 'priority'
> {
  project?: {
    id: number
    name: string | null
    deleted_at: string | null
  } | null
}

interface ArchivedProject extends Pick<
  ProjectDB,
  'id' | 'name' | 'status' | 'priority' | 'deleted_at' | 'owner_id' | 'created_at'
> {
  task_count?: number
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const user = await serverSupabaseUser(event)

  if (!user || !user.id) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  // Ensure the authenticated user belongs to a staff record and has admin privileges
  const { data: staffRecord, error: staffError } = await supabase
    .from('staff')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (staffError) {
    throw createError({ statusCode: 500, statusMessage: staffError.message })
  }

  const currentStaff = (staffRecord as { id: number; is_admin: boolean } | null) ?? null

  if (!currentStaff || !currentStaff.is_admin) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied. Admin privileges required.' })
  }

  // Fetch all soft-deleted tasks (including subtasks) so admins can review them
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, status, deleted_at, project_id, creator_id, parent_task_id, priority')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (tasksError) {
    throw createError({ statusCode: 500, statusMessage: tasksError.message || 'Failed to load archived tasks' })
  }

  // Fetch all soft-deleted projects to surface in the archive dashboard
  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status, priority, deleted_at, owner_id, created_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (projectsError) {
    throw createError({ statusCode: 500, statusMessage: projectsError.message || 'Failed to load archived projects' })
  }

  const archivedTasks = (tasksData as ArchivedTask[] | null) ?? []
  const archivedProjects = (projectsData as ArchivedProject[] | null) ?? []

  // Collect project IDs referenced by archived tasks so we can attach project names
  const projectIdsFromTasks = Array.from(
    new Set(
      archivedTasks
        .map((task) => task.project_id)
        .filter((projectId): projectId is number => projectId !== null)
    )
  )

  // Fetch project data for archived tasks (may include both archived and active projects)
  // This allows us to label task rows with project names and flag if the project itself is archived
  const { data: projectsLookupData, error: projectsLookupError } = projectIdsFromTasks.length
    ? await supabase
        .from('projects')
        .select('id, name, deleted_at')
        .in('id', projectIdsFromTasks)
    : { data: null, error: null }

  if (projectsLookupError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load project details for archived tasks.' })
  }

  const projectMap = new Map<number, { id: number; name: string | null; deleted_at: string | null }>(
    ((projectsLookupData as Array<{ id: number; name: string | null; deleted_at: string | null }> | null) ?? []).map((project) => [project.id, project])
  )

  // Build a quick map of archived task counts per project so the UI can show totals
  const taskCountsByProject = archivedTasks.reduce((acc, task) => {
    if (task.project_id) {
      const currentCount = acc.get(task.project_id) ?? 0
      acc.set(task.project_id, currentCount + 1)
    }
    return acc
  }, new Map<number, number>())

  const tasksWithRelations = archivedTasks.map((task) => ({
    ...task,
    project: task.project_id ? projectMap.get(task.project_id) ?? null : null,
  }))

  const projectsWithRelations = archivedProjects.map((project) => ({
    ...project,
    task_count: taskCountsByProject.get(project.id) ?? 0,
  }))

  return {
    tasks: tasksWithRelations,
    projects: projectsWithRelations,
  }
})

