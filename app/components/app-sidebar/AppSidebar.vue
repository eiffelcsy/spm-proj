<template>
  <Sidebar collapsible="icon" :class="cn('border-r', props.class)">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <div class="flex items-center gap-2">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayoutDashboard class="size-4" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">G9 Scrummies Dashboard</span>
                <span class="truncate text-xs">Project Management</span>
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <!-- Navigation Section -->
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isPersonalActive" class="no-hover">
                <NuxtLink to="/personal/dashboard">
                  <User class="size-4" />
                  <span>Personal Dashboard</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="isProjectActive" class="no-hover">
                <NuxtLink to="/project/dashboard">
                  <FolderKanban class="size-4" />
                  <span>Project Dashboard</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <!-- Quick Actions Section -->
      <SidebarGroup>
        <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton @click="$emit('create-task')" class="no-hover">
                <PlusCircle class="size-4" />
                <span>New Task</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton @click="$emit('create-project')" class="no-hover">
                <FolderPlus class="size-4" />
                <span>New Project</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton @click="handleLogout" class="no-hover">
            <User class="size-4" />
            <span>User</span>
            <LogOut class="ml-auto size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  User,
  FolderKanban,
  PlusCircle,
  FolderPlus,
  LogOut,
} from 'lucide-vue-next'

interface Props {
  class?: string
}

const props = defineProps<Props>()
const route = useRoute()
const router = useRouter()

defineEmits(['create-task', 'create-project'])

const isPersonalActive = computed(() => route.path.startsWith('/personal'))
const isProjectActive = computed(() => route.path.startsWith('/project'))

async function handleLogout() {
  try {
    await $fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<style scoped>
.no-hover:hover {
  background-color: transparent !important;
  color: inherit !important;
}

.no-hover:hover * {
  color: inherit !important;
}
</style>

