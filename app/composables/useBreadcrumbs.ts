import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { BreadcrumbItem } from '@/types'

/**
 * useBreadcrumbs composable
 * 
 * Generates dynamic breadcrumbs based on the current route, including:
 * - Support for 'from' query parameter to track navigation context
 * - Fetches task titles from the API for task pages
 * - Fetches project names from the API for project pages
 * - Handles personal dashboard, project dashboard, and task detail pages
 * 
 * @example
 * ```vue
 * <script setup>
 * const { breadcrumbs, isLoading } = useBreadcrumbs()
 * </script>
 * ```
 */
export function useBreadcrumbs() {
  const route = useRoute()
  const taskTitle = ref<string | null>(null)
  const projectName = ref<string | null>(null)
  const isLoading = ref(false)

  /**
   * Fetches task details from API to get the task title
   */
  async function fetchTaskTitle(taskId: string | string[]) {
    if (!taskId || Array.isArray(taskId)) return
    
    try {
      isLoading.value = true
      const response = await $fetch<{ task: any }>(`/api/tasks/${taskId}`)
      if (response?.task?.title) {
        taskTitle.value = response.task.title
      }
    } catch (error) {
      console.error('Failed to fetch task title:', error)
      taskTitle.value = 'Task'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetches project details from API to get the project name
   */
  async function fetchProjectName(projectId: string | string[]) {
    if (!projectId || Array.isArray(projectId)) return
    
    try {
      isLoading.value = true
      const response = await $fetch<any[]>('/api/projects')
      const project = response.find((p: any) => p.id.toString() === projectId)
      if (project?.name) {
        projectName.value = project.name
      } else {
        projectName.value = `Project #${projectId}`
      }
    } catch (error) {
      // Silently handle auth errors - user might not be on an authenticated page yet
      // Just use a fallback project name
      projectName.value = `Project #${projectId}`
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Generates breadcrumbs based on the current route
   */
  const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = []
    const pathSegments = route.path.split('/').filter(Boolean)
    const fromQuery = route.query.from as string | undefined
    const projectIdQuery = route.query.projectId as string | undefined

    // Root/Home is always first (hidden on some pages)
    // items.push({
    //   label: 'Home',
    //   href: '/',
    //   isCurrentPage: false
    // })

    // Handle different route patterns
    if (pathSegments.length === 0) {
      // Root page
      items.push({
        label: 'Home',
        href: '/',
        isCurrentPage: true
      })
    } else if (pathSegments[0] === 'personal') {
      // Personal Dashboard
      items.push({
        label: 'Personal Dashboard',
        href: '/personal/dashboard',
        isCurrentPage: pathSegments.length === 2 && pathSegments[1] === 'dashboard'
      })
    } else if (pathSegments[0] === 'project') {
      // Project routes
      if (pathSegments[1] === 'dashboard') {
        // Project Dashboard
        items.push({
          label: 'Projects Dashboard',
          href: '/project/dashboard',
          isCurrentPage: true
        })
      } else if (pathSegments[1] && pathSegments[1] !== 'dashboard') {
        // Specific Project Page
        items.push({
          label: 'Projects Dashboard',
          href: '/project/dashboard',
          isCurrentPage: false
        })
        items.push({
          label: projectName.value || `Project #${pathSegments[1]}`,
          href: `/project/${pathSegments[1]}`,
          isCurrentPage: true
        })
      }
    } else if (pathSegments[0] === 'task' && pathSegments[1]) {
      // Task Detail Page
      // Determine the context based on 'from' query parameter
      if (fromQuery === 'personal') {
        items.push({
          label: 'Personal Dashboard',
          href: '/personal/dashboard',
          isCurrentPage: false
        })
      } else if (fromQuery === 'project') {
        items.push({
          label: 'Projects',
          href: '/project/dashboard',
          isCurrentPage: false
        })
        
        // If we have a projectId, add the project breadcrumb
        if (projectIdQuery) {
          items.push({
            label: projectName.value || `Project #${projectIdQuery}`,
            href: `/project/${projectIdQuery}`,
            isCurrentPage: false
          })
        }
      } else {
        // Default to personal dashboard if no 'from' parameter
        items.push({
          label: 'Personal Dashboard',
          href: '/personal/dashboard',
          isCurrentPage: false
        })
      }

      // Add the task itself as the current page
      items.push({
        label: taskTitle.value || `Loading...`,
        href: undefined, // Current page shouldn't be clickable
        isCurrentPage: true
      })
    } else {
      // Fallback for unknown routes
      items.push({
        label: 'Unknown Page',
        href: undefined,
        isCurrentPage: true
      })
    }

    return items
  })

  /**
   * Watch for route changes to fetch required data
   */
  watch(
    () => [route.path, route.query],
    async () => {
      const pathSegments = route.path.split('/').filter(Boolean)
      const projectIdQuery = route.query.projectId as string | undefined

      // Reset cached values
      taskTitle.value = null
      projectName.value = null

      // Fetch task title if on task page
      if (pathSegments[0] === 'task' && pathSegments[1]) {
        await fetchTaskTitle(pathSegments[1])
      }

      // Fetch project name if we have a projectId query parameter
      if (projectIdQuery) {
        await fetchProjectName(projectIdQuery)
      }

      // Fetch project name if on a specific project page
      if (pathSegments[0] === 'project' && pathSegments[1] && pathSegments[1] !== 'dashboard') {
        await fetchProjectName(pathSegments[1])
      }
    },
    { immediate: true, deep: true }
  )

  return {
    breadcrumbs,
    isLoading
  }
}

