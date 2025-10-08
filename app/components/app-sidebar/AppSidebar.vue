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
    Settings,
    LogOut,
} from "lucide-vue-next"

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const currentUser = ref<{ id: number; fullname: string; email: string | null } | null>(null)
const router = useRouter()
const supabase = useSupabaseClient()

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchCurrentUser() {
  try {
    const user = await $fetch('/api/user/me')
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

function navigateToSettings() {
  router.push('/personal/settings')
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
            <a href="/personal/dashboard">
              <div class="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CheckSquare class="size-6" />
              </div>
              <div class="flex flex-col gap-0.5 leading-none">
                <span class="font-semibold text-xl">TaskAIO</span>
                <span class="text-xs text-sidebar-muted-foreground">Task Management System</span>
              </div>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem key="Dashboard">
              <SidebarMenuButton as-child>
                <a href="/personal/dashboard">
                  <LayoutDashboard class="size-4" />
                  <span>Dashboard</span>
                </a>
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
                  <SidebarMenuButton>
                    <Folder class="size-4" />
                    <span>Projects</span>
                    <ChevronRight
                      class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <a href="/project/dashboard">
                          <FolderOpen class="size-4" />
                          <span>Projects Dashboard</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton @click="$emit('create-project')">
                          <FolderPlus class="size-4" />
                          <span>Create Project</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
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
              <DropdownMenuItem @click="navigateToSettings" class="cursor-pointer">
                <Settings class="mr-2 size-4" />
                <span>Settings</span>
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