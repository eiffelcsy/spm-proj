<script setup lang="ts">
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  CollapsibleTrigger,
  CollapsibleContent,
  Collapsible,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
    CheckSquare,
    PlusSquare,
    Folder,
    FolderOpen,
    FolderPlus,
    ChevronsUpDown,
    LayoutDashboard,
    ChevronRight,
    User,
    Bell,
    LogOut,
    UserCog,
    FileChartColumn,
} from "lucide-vue-next"
import { NotificationDropdown } from "~/components/notification-modals"

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const currentUser = ref<{ id: number; fullname: string; email: string | null; staff_type: string } | null>(null)
const router = useRouter()
const route = useRoute()
const supabase = useSupabaseClient()
const isManager = computed(() => currentUser.value?.staff_type === 'manager')
const isAdmin = computed(() => currentUser.value?.staff_type === 'admin') // <-- 2. ADDED ADMIN CHECK

// ============================================================================
// ROUTE DETECTION & HIGHLIGHTING
// ============================================================================

/**
 * Determine if the current route matches the dashboard or task details from personal
 */
const isDashboardActive = computed(() => {
  if (route.path === '/personal/dashboard') return true
  if (route.path.startsWith('/task') && route.query.from === 'personal') return true
  return false
})

/**
 * Determine if the current route is within the projects section
 */
const isProjectsActive = computed(() => {
  if (route.path.startsWith('/project')) return true
  if (route.path.startsWith('/task') && route.query.from === 'project') return true
  return false
})

/**
 * Determine if the current route is the projects dashboard or a specific project page
 */
const isProjectsDashboardActive = computed(() => {
  if (route.path === '/project/dashboard') return true
  if (route.path.match(/^\/project\/\d+$/)) return true
  if (route.path.startsWith('/task') && route.query.from === 'project') return true
  return false
})

/**
 * Determine if the current route is within the admin section
 */
const isAdminPanelActive = computed(() => route.path.startsWith('/admin')) // <-- 3. ADDED ACTIVE CHECK FOR ADMIN

/**
 * Determine if the current route is within the manager section
 */
const isManagerPanelActive = computed(() => route.path.startsWith('/manager'))

/**
 * Get highlighting classes for sidebar menu buttons
 */
const getActiveClasses = (isActive: boolean) => {
  return isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchCurrentUser() {
  try {
    const user = await $fetch<{ id: number; fullname: string; email: string | null; staff_type: string }>('/api/user/me')
    currentUser.value = user
  } catch (err) {
    console.error('Failed to fetch current user:', err)
    currentUser.value = null
  }
}

// ============================================================================
// USER ACTIONS
// ============================================================================

async function handleLogout() {
  try {
    await $fetch('/api/logout/logout', {
      method: 'POST',
    })
    await supabase.auth.signOut()
    router.push('/')
  } catch (error) {
    console.error('Error logging out:', error)
    alert('Logout failed. Please try again.')
  }
}

function navigateToNotifications() {
  // Get current route to determine context
  const currentRoute = useRoute()
  const from = currentRoute.path.includes('/task/') ? 'task' :
               currentRoute.path.includes('/project/') ? 'project' :
               currentRoute.path.includes('/personal/') ? 'personal' :
               'dashboard'
  
  // If coming from a task page, also pass the task ID
  let queryParams = `from=${from}`
  if (currentRoute.path.includes('/task/')) {
    const taskId = currentRoute.params.id
    if (taskId) {
      queryParams += `&taskId=${taskId}`
    }
    
    // If the task has a projectId in the query params, pass it along
    const projectId = currentRoute.query.projectId
    if (projectId) {
      queryParams += `&projectId=${projectId}`
    }
  }
  // If coming from a project page (not dashboard), also pass the project ID
  if (currentRoute.path.includes('/project/') && !currentRoute.path.includes('/project/dashboard')) {
    const projectId = currentRoute.params.id
    if (projectId) {
      queryParams += `&projectId=${projectId}`
    }
  }
  
  router.push(`/notifications?${queryParams}`)
}

// Fetch user data on component mount
onMounted(() => {
  fetchCurrentUser()
})

</script>

<template>
  <Sidebar>
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <NuxtLink to="/personal/dashboard">
              <div class="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CheckSquare class="size-6" />
              </div>
              <div class="flex flex-col gap-0.5 leading-none">
                <span class="font-semibold text-xl">TaskAIO</span>
                <span class="text-xs text-sidebar-muted-foreground">Task Management System</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem key="Dashboard">
              <SidebarMenuButton as-child :class="getActiveClasses(isDashboardActive)">
                <NuxtLink to="/personal/dashboard">
                  <LayoutDashboard class="size-4" />
                  <span>Personal Dashboard</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem key="CreateTask">
              <SidebarMenuButton @click="$emit('create-task')">
                <PlusSquare class="size-4" />
                <span>Create New Task</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <Collapsible key="Projects" title="Projects" default-open class="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger as-child>
                  <SidebarMenuButton :class="getActiveClasses(isProjectsActive)">
                    <Folder class="size-4" />
                    <span>Projects</span>
                    <ChevronRight
                      class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild :class="getActiveClasses(isProjectsDashboardActive)">
                        <NuxtLink to="/project/dashboard">
                          <FolderOpen class="size-4" />
                          <span>Project Dashboard</span>
                        </NuxtLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem :title="!isManager ? 'Only managers can create projects' : ''">
                      <SidebarMenuSubButton @click="isManager ? $emit('create-project') : null"
                      :class="!isManager ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'">
                          <FolderPlus class="size-4" />
                          <span>Create Project</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            <SidebarMenuItem v-if="isManager" key="ManagerPanel">
              <SidebarMenuButton as-child :class="getActiveClasses(isManagerPanelActive)">
                <NuxtLink to="/manager/reports">
                  <FileChartColumn class="size-4" />
                  <span>Manage Reports</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem> 

            <SidebarMenuItem v-if="isAdmin" key="AdminPanel">
              <SidebarMenuButton as-child :class="getActiveClasses(isAdminPanelActive)">
                <NuxtLink to="/admin/users">
                  <UserCog class="size-4" />
                  <span>User Management</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarSeparator />
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg" class="cursor-pointer">
                <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <User class="size-4" />
                </div>
                <div class="flex flex-col gap-0.5 leading-none">
                  <span class="font-semibold">{{ currentUser?.fullname || 'Loading...' }}</span>
                  <span class="text-xs text-sidebar-muted-foreground">{{ currentUser?.email || 'Loading...' }}</span>
                </div>
                <ChevronsUpDown class="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" align="end" side="top">
              <DropdownMenuItem @click="navigateToNotifications" class="cursor-pointer">
                <Bell class="mr-2 size-4" />
                <span>View All Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="handleLogout" class="cursor-pointer">
                <LogOut class="mr-2 size-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>