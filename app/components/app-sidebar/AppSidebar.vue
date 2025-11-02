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
    CheckSquare,
    PlusSquare,
    Folder,
    FolderOpen,
    FolderPlus,
    LayoutDashboard,
    ChevronRight,
    User,
    LogOut,
    UserCog,
    FileChartColumn,
    Archive,
} from "lucide-vue-next"

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const currentUser = ref<{ id: number; fullname: string; email: string | null; isManager: boolean; isAdmin: boolean; department?: string | null } | null>(null)
const router = useRouter()
const route = useRoute()
const supabase = useSupabaseClient()
const isManager = computed(() => !!currentUser.value?.isManager)
const isAdmin = computed(() => !!currentUser.value?.isAdmin)

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
const isAdminUsersActive = computed(() => route.path.startsWith('/admin/users'))
const isAdminArchiveActive = computed(() => route.path.startsWith('/admin/archive'))

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
    const user = await $fetch<{ id: number; fullname: string; email: string | null; isManager: boolean; isAdmin: boolean }>('/api/user/me')
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

            <SidebarMenuItem v-if="isAdmin" key="AdminUsers">
              <SidebarMenuButton as-child :class="getActiveClasses(isAdminUsersActive)">
                <NuxtLink to="/admin/users">
                  <UserCog class="size-4" />
                  <span>User Management</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem v-if="isAdmin" key="AdminArchive">
              <SidebarMenuButton as-child :class="getActiveClasses(isAdminArchiveActive)">
                <NuxtLink to="/admin/archive">
                  <Archive class="size-4" />
                  <span>Archived Items</span>
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
          <div class="flex items-center gap-2 px-2 py-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <User class="size-4" />
              </div>
              <div class="flex flex-col gap-0.5 leading-none min-w-0">
                <span class="font-semibold text-sm">{{ currentUser?.fullname || 'Loading...' }}</span>
                <span class="text-xs text-sidebar-muted-foreground truncate">{{ currentUser?.email || 'Loading...' }}</span>
                <span v-if="currentUser?.department" class="text-xs text-sidebar-muted-foreground truncate">{{ currentUser.department }}</span>
              </div>
            </div>
            <button 
              @click="handleLogout" 
              class="flex items-center justify-center p-2.5 rounded-md hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut class="size-4" />
            </button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>