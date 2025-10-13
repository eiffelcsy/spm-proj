<template>
  <SidebarProvider>
    <AppSidebar 
      @create-task="openCreateTaskModal"
      @create-project="openCreateProjectModal"
    />
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <Breadcrumb class="flex-1">
          <BreadcrumbList>
            <ClientOnly>
              <template v-for="(item, index) in breadcrumbs" :key="index">
                <BreadcrumbItem v-if="!item.isCurrentPage" class="hidden md:block">
                  <BreadcrumbLink 
                    :href="item.href" 
                    @click.prevent="item.href && navigateTo(item.href)"
                    class="cursor-pointer hover:text-foreground transition-colors"
                  >
                    {{ item.label }}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem v-else>
                  <BreadcrumbPage>{{ item.label }}</BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator 
                  v-if="index < breadcrumbs.length - 1" 
                  class="hidden md:block" 
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
        <!-- Exit button for task and project detail pages -->
        <Button 
          v-if="route.path.startsWith('/task/') || route.path.match(/^\/project\/\d+$/)"
          variant="ghost" 
          size="icon" 
          @click="handleExitDetailPage" 
          class="text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X class="h-4 w-4" />
        </Button>
      </header>
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/app-sidebar'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// Use the breadcrumbs composable
const { breadcrumbs } = useBreadcrumbs()

function openCreateTaskModal() {
  window.dispatchEvent(new CustomEvent('open-create-task-modal'))
}

function openCreateProjectModal() {
  window.dispatchEvent(new CustomEvent('open-create-project-modal'))
}

function handleExitDetailPage() {
  const from = route.query.from
  const projectId = route.query.projectId
  
  // For task pages
  if (route.path.startsWith('/task/')) {
    if (from === 'project' && projectId) {
      router.push(`/project/${projectId}`)
    } else if (from === 'project') {
      router.push('/project/dashboard')
    } else {
      router.push('/personal/dashboard')
    }
  }
  // For project detail pages
  else if (route.path.match(/^\/project\/\d+$/)) {
    router.push('/project/dashboard')
  }
}
</script>

