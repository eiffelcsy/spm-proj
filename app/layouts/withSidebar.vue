<template>
  <SidebarProvider>
    <AppSidebar 
      @create-task="openCreateTaskModal"
      @create-project="openCreateProjectModal"
    />
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4 hidden sm:block" />
        <Breadcrumb class="flex-1">
          <BreadcrumbList>
            <ClientOnly>
              <template v-for="(item, index) in breadcrumbs" :key="index">
                <BreadcrumbItem v-if="!item.isCurrentPage" class="hidden sm:block">
                  <BreadcrumbLink 
                    :href="item.href" 
                    @click.prevent="item.href && navigateTo(item.href)"
                    class="cursor-pointer hover:text-foreground transition-colors"
                  >
                    {{ item.label }}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem v-else>
                  <BreadcrumbPage class="truncate max-w-[200px] sm:max-w-none">{{ item.label }}</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator 
                  v-if="index < breadcrumbs.length - 1" 
                  class="hidden sm:block" 
                />
              </template>
              <template #fallback>
                <!-- Fallback for SSR - shows minimal breadcrumb -->
                <BreadcrumbItem>
                  <BreadcrumbPage>Loading...</BreadcrumbPage>
                </BreadcrumbItem>
              </template>
            </ClientOnly>
          </BreadcrumbList>
        </Breadcrumb>
        <!-- Notification bell button -->
        <Button 
          variant="ghost" 
          @click="goToNotifications" 
          class="text-foreground hover:bg-amber-100 shrink-0 mr-4 font-normal"
        >
          <Bell class="h-4 w-4 mr-0.5" />
          <span>Notifications</span>
        </Button>
      </header>
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/app-sidebar'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { Bell } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

// Use the breadcrumbs composable
const { breadcrumbs } = useBreadcrumbs()

function openCreateTaskModal() {
  // Check if we're on a dashboard page
  const isDashboardPage = route.path === '/personal/dashboard' || 
                          route.path === '/project/dashboard' || 
                          route.path.match(/^\/project\/\d+$/)
  
  if (isDashboardPage) {
    // If already on a dashboard, just open the modal
    window.dispatchEvent(new CustomEvent('open-create-task-modal'))
  } else {
    // If not on a dashboard, redirect to personal dashboard with a query parameter
    router.push('/personal/dashboard?openCreateTask=true')
  }
}

function openCreateProjectModal() {
  // Check if we're on a project dashboard page
  const isProjectDashboardPage = route.path === '/project/dashboard' || 
                                  route.path.match(/^\/project\/\d+$/)
  
  if (isProjectDashboardPage) {
    // If already on a project dashboard, just open the modal
    window.dispatchEvent(new CustomEvent('open-create-project-modal'))
  } else {
    // If not on a project dashboard, redirect to project dashboard with a query parameter
    router.push('/project/dashboard?openCreateProject=true')
  }
}

function goToNotifications() {
  router.push('/notifications')
}
</script>

