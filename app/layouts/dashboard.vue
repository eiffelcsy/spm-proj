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
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">{{ pageTitle }}</span>
        </div>
      </header>
      <main class="flex-1 overflow-auto">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from '@/components/app-sidebar'

const route = useRoute()

const pageTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/personal') || (path.startsWith('/task') && from === 'personal')) return 'Personal Dashboard'
  if (path.startsWith('/project') || (path.startsWith('/task') && from === 'project')) return 'Project Dashboard'
  
  return 'Dashboard'
})

function openCreateTaskModal() {
  window.dispatchEvent(new CustomEvent('open-create-task-modal'))
}

function openCreateProjectModal() {
  window.dispatchEvent(new CustomEvent('open-create-project-modal'))
}
</script>

