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
      }
    } catch (error) {
      // Silently handle auth errors - user might not be on an authenticated page yet
      // Don't set a fallback project name
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
          label: 'Project Dashboard',
          href: '/project/dashboard',
          isCurrentPage: true
        })
      } else if (pathSegments[1] && pathSegments[1] !== 'dashboard') {
        // Specific Project Page
        items.push({
          label: 'Project Dashboard',
          href: '/project/dashboard',
          isCurrentPage: false
        })
        if (projectName.value) {
          items.push({
            label: projectName.value,
            href: `/project/${pathSegments[1]}`,
            isCurrentPage: true
          })
        }
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
        if (projectIdQuery && projectName.value) {
          items.push({
            label: projectName.value,
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
    } else if (pathSegments[0] === 'notifications') {
      // Notifications Page
      // Determine the context based on 'from' query parameter
      if (fromQuery === 'personal') {
        items.push({
          label: 'Personal Dashboard',
          href: '/personal/dashboard',
          isCurrentPage: false
        })
      } else if (fromQuery === 'project') {
        // Try to get project ID from query params first, then referrer
        let projectId: string | undefined = route.query.projectId as string | undefined
        
        if (!projectId && typeof document !== 'undefined' && document.referrer) {
          const referrerUrl = new URL(document.referrer)
          const pathname = referrerUrl.pathname
          const referrerSegments = pathname.split('/').filter(Boolean)
          if (pathname.includes('/project/') && referrerSegments.length >= 2 && !pathname.includes('/dashboard')) {
            projectId = referrerSegments[1]
          }
        }
        
        // Add Project Dashboard first
        items.push({
          label: 'Project Dashboard',
          href: '/project/dashboard',
          isCurrentPage: false
        })
        
        // Then add the specific project if we have the project ID and name
        if (projectId && projectName.value) {
          items.push({
            label: projectName.value,
            href: `/project/${projectId}`,
            isCurrentPage: false
          })
        }
      } else if (fromQuery === 'task') {
        // Try to get task ID from query params first, then referrer
        let taskId: string | undefined = route.query.taskId as string | undefined
        
        if (!taskId && typeof document !== 'undefined' && document.referrer) {
          const referrerUrl = new URL(document.referrer)
          const pathname = referrerUrl.pathname
          const referrerSegments = pathname.split('/').filter(Boolean)
          if (pathname.includes('/task/') && referrerSegments.length >= 2) {
            taskId = referrerSegments[1]
          }
        }
        
        // Determine if this task belongs to a project
        // For now, we'll check if we have a projectId in query params or if the task has project context
        const projectIdFromQuery = route.query.projectId as string | undefined
        
        if (projectIdFromQuery && projectName.value) {
          // Task is within a project - show full project context
          items.push({
            label: 'Project Dashboard',
            href: '/project/dashboard',
            isCurrentPage: false
          })
          
          items.push({
            label: projectName.value,
            href: `/project/${projectIdFromQuery}`,
            isCurrentPage: false
          })
        } else {
          // Task is from personal dashboard
          items.push({
            label: 'Personal Dashboard',
            href: '/personal/dashboard',
            isCurrentPage: false
          })
        }
        
        // Then add the task with its actual name
        if (taskId && taskTitle.value) {
          items.push({
            label: taskTitle.value,
            href: `/task/${taskId}`,
            isCurrentPage: false
          })
        }
      } else {
        // Fallback to referrer parsing if no 'from' parameter
        if (typeof document !== 'undefined' && document.referrer) {
          const referrerUrl = new URL(document.referrer)
          const pathname = referrerUrl.pathname
          const referrerSegments = pathname.split('/').filter(Boolean)

          // Skip if referrer is the same page (notifications)
          if (pathname.includes('/notifications')) {
            // If referrer is also notifications, use a generic fallback
            items.push({
              label: 'Dashboard',
              href: '/',
              isCurrentPage: false
            })
          } else if (pathname.includes('/personal/dashboard')) {
            items.push({
              label: 'Personal Dashboard',
              href: '/personal/dashboard',
              isCurrentPage: false
            })
          } else if (pathname.includes('/project/dashboard')) {
            items.push({
              label: 'Project Dashboard',
              href: '/project/dashboard',
              isCurrentPage: false
            })
          } else if (pathname.includes('/task/') && referrerSegments.length >= 2) {
            // Extract task ID from referrer and try to get task title
            const taskId = referrerSegments[1]
            
            // Add Personal Dashboard first
            items.push({
              label: 'Personal Dashboard',
              href: '/personal/dashboard',
              isCurrentPage: false
            })
            
            // Then add the task with its actual name
            if (taskTitle.value) {
              items.push({
                label: taskTitle.value,
                href: `/task/${taskId}`,
                isCurrentPage: false
              })
            }
          } else if (pathname.includes('/project/') && referrerSegments.length >= 2) {
            // Extract project ID from referrer and try to get project name
            const projectId = referrerSegments[1]
            if (projectName.value) {
              items.push({
                label: projectName.value,
                href: `/project/${projectId}`,
                isCurrentPage: false
              })
            }
          } else if (pathname === '/' || pathname === '') {
            items.push({
              label: 'Home',
              href: '/',
              isCurrentPage: false
            })
          } else if (pathname.includes('/timeline')) {
            items.push({
              label: 'Timeline',
              href: pathname,
              isCurrentPage: false
            })
          } else {
            // Try to create a more meaningful label from the path
            const lastSegment = referrerSegments[referrerSegments.length - 1]
            if (lastSegment) {
              const formattedLabel = lastSegment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
              items.push({
                label: formattedLabel,
                href: pathname,
                isCurrentPage: false
              })
            } else {
              items.push({
                label: 'Dashboard',
                href: '/',
                isCurrentPage: false
              })
            }
          }
        } else {
          // No referrer available, use a sensible default
          items.push({
            label: 'Dashboard',
            href: '/',
            isCurrentPage: false
          })
        }
      }

      // Add the notifications page as the current page
      items.push({
        label: 'Notifications',
        href: undefined, // Current page shouldn't be clickable
        isCurrentPage: true
      })
    } else if (pathSegments[0] === 'admin') {
      // Handle admin routes
      if (pathSegments[1] === 'users') {
        items.push({
          label: 'User Management',
          href: '/admin/users',
          isCurrentPage: true
        })
      }
    } else if (pathSegments[0] === 'manager') {
      // Handle admin routes
      if (pathSegments[1] === 'reports') {
        items.push({
          label: 'Manage Reports',
          href: '/manager/reports',
          isCurrentPage: true
        })
      }
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

      // For notifications page, also fetch data if we need to show task/project names
      if (pathSegments[0] === 'notifications') {
        // First try to get task ID from query parameters
        const taskIdFromQuery = route.query.taskId as string | undefined
        if (taskIdFromQuery) {
          await fetchTaskTitle(taskIdFromQuery)
        }
        
        // First try to get project ID from query parameters
        const projectIdFromQuery = route.query.projectId as string | undefined
        if (projectIdFromQuery) {
          await fetchProjectName(projectIdFromQuery)
        }
        
        // If no task ID from query, try to get it from referrer
        if (!taskIdFromQuery && typeof document !== 'undefined' && document.referrer) {
          const referrerUrl = new URL(document.referrer)
          const pathname = referrerUrl.pathname
          const referrerSegments = pathname.split('/').filter(Boolean)

          // If coming from a task page, fetch the task title
          if (pathname.includes('/task/') && referrerSegments.length >= 2) {
            const taskId = referrerSegments[1]
            if (taskId) {
              await fetchTaskTitle(taskId)
            }
          }

          // If coming from a project page, fetch the project name
          if (pathname.includes('/project/') && referrerSegments.length >= 2 && !pathname.includes('/dashboard')) {
            const projectId = referrerSegments[1]
            if (projectId) {
              await fetchProjectName(projectId)
            }
          }
        }
      }
    },
    { immediate: true, deep: true }
  )

  return {
    breadcrumbs,
    isLoading
  }
}

