<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Archived Items</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Review soft-deleted tasks and projects. Only administrators can access this audit history.
        </p>
      </div>
    </div>

    <div v-if="isForbidden" class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-6">
      You need administrator permissions to view archived tasks and projects.
    </div>

    <div v-else>
      <div v-if="error" class="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6 flex items-start justify-between gap-4">
        <span>{{ error }}</span>
        <Button variant="outline" size="sm" @click="fetchArchive">Try again</Button>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-12 text-muted-foreground">
        Loading archive…
      </div>

      <div v-else class="space-y-10">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm text-muted-foreground uppercase tracking-wide">Archived Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-3xl font-semibold">{{ filteredTasks.length }}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm text-muted-foreground uppercase tracking-wide">Archived Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="text-3xl font-semibold">{{ filteredProjects.length }}</div>
            </CardContent>
          </Card>
        </div>
        <div class="flex justify-end mb-4 gap-2">
          <Input
            v-model="taskSearch"
            placeholder="Search tasks or projects…"
            class="w-full sm:w-64"
          />
          <Button
            variant="outline"
            size="sm"
            @click="taskSearch = ''"
            :disabled="!searchQuery.length"
          >
            Reset
          </Button>
        </div>
        <Card>
          <CardHeader class="pb-4 space-y-2">
            <CardTitle class="text-xl font-semibold">Archived Tasks</CardTitle>
            <p class="text-sm text-muted-foreground">Tasks removed via soft-delete stay visible here until permanently deleted.</p>
          </CardHeader>
          <CardContent>
            <div v-if="filteredTasks.length === 0" class="py-10 text-center text-muted-foreground">
              <p v-if="searchQuery.length">No archived tasks matched "{{ taskSearch }}".</p>
              <p v-else>No archived tasks found.</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-muted-foreground border-b">
                  <tr>
                    <th class="py-3 pr-6 font-medium">Task</th>
                    <th class="py-3 pr-6 font-medium">Project</th>
                    <th class="py-3 pr-6 font-medium">Priority</th>
                    <th class="py-3 pr-6 font-medium">Status</th>
                    <th class="py-3 pr-6 font-medium">Deleted On</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="task in filteredTasks"
                    :key="task.id"
                    class="border-b last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td class="py-3 pr-6">
                      <div class="font-medium text-foreground">{{ task.title }}</div>
                      <div v-if="task.parentTaskId" class="text-xs text-muted-foreground mt-1">
                        Subtask of #{{ task.parentTaskId }}
                      </div>
                    </td>
                    <td class="py-3 pr-6">
                      <div class="flex items-center gap-2">
                        <span>{{ task.projectName }}</span>
                        <Badge
                          v-if="task.projectDeleted"
                          variant="outline"
                          class="text-xs text-amber-700 border-amber-300 bg-amber-50"
                        >
                          Project Archived
                        </Badge>
                      </div>
                    </td>
                    <td class="py-3 pr-6">{{ task.priority ?? '—' }}</td>
                    <td class="py-3 pr-6">
                      <Badge
                        variant="secondary"
                        :class="statusBadgeClass(task.status)"
                        class="capitalize"
                      >
                        {{ formatStatus(task.status) }}
                      </Badge>
                    </td>
                    <td class="py-3 pr-6">
                      <div class="whitespace-nowrap">{{ formatDeletedDate(task.deletedAt) }}</div>
                      <div class="whitespace-nowrap">{{ formatDeletedTime(task.deletedAt) }}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-4 space-y-2">
            <CardTitle class="text-xl font-semibold">Archived Projects</CardTitle>
            <p class="text-sm text-muted-foreground">Projects removed via soft-delete stay visible here until permanently deleted.</p>
          </CardHeader>
          <CardContent>
            <div v-if="filteredProjects.length === 0" class="py-10 text-center text-muted-foreground">
              <p v-if="searchQuery.length">No archived projects matched "{{ taskSearch }}".</p>
              <p v-else>No archived projects found.</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-muted-foreground border-b">
                  <tr>
                    <th class="py-3 pr-6 font-medium w-1/3">Project</th>
                    <th class="py-3 pr-6 font-medium">Archived Tasks</th>
                    <th class="py-3 pr-6 font-medium">Priority</th>
                    <th class="py-3 pr-6 font-medium">Status</th>
                    <th class="py-3 pr-6 font-medium w-32">Deleted On</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="project in filteredProjects"
                    :key="project.id"
                    class="border-b last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td class="py-3 pr-6 w-1/3">
                      <div class="font-medium text-foreground">{{ project.name }}</div>
                      <div class="text-xs text-muted-foreground mt-1">Created {{ formatDateTime(project.createdAt) }}</div>
                    </td>
                    <td class="py-3 pr-6">{{ project.taskCount }}</td>
                    <td class="py-3 pr-6 capitalize">{{ project.priority || '—' }}</td>
                    <td class="py-3 pr-6">
                      <Badge
                        variant="secondary"
                        :class="statusBadgeClass(project.status)"
                        class="capitalize"
                      >
                        {{ formatStatus(project.status) }}
                      </Badge>
                    </td>
                    <td class="py-3 pr-6 w-32">{{ formatDateTime(project.deletedAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

definePageMeta({
  layout: 'with-sidebar'
})

interface ArchivedTaskResponse {
  id: number
  title: string
  status: string
  deleted_at: string
  project_id: number | null
  creator_id: number | null
  parent_task_id: number | null
  priority: number | null
  project?: {
    id: number
    name: string | null
    deleted_at: string | null
  } | null
}

interface ArchivedProjectResponse {
  id: number
  name: string
  status: string
  priority: string | null
  deleted_at: string
  owner_id: number | null
  created_at: string
  task_count?: number
}

interface ArchivedTaskUI {
  id: number
  title: string
  status: string
  deletedAt: string
  projectName: string
  projectDeleted: boolean
  priority: number | null
  parentTaskId: number | null
}

interface ArchivedProjectUI {
  id: number
  name: string
  status: string
  priority: string | null
  deletedAt: string
  createdAt: string
  taskCount: number
}

interface ArchiveResponse {
  tasks: ArchivedTaskResponse[]
  projects: ArchivedProjectResponse[]
}

const archivedTasksRaw = ref<ArchivedTaskResponse[]>([])
const archivedProjectsRaw = ref<ArchivedProjectResponse[]>([])
const isLoading = ref(false)
const error = ref('')
const isForbidden = ref(false)
const taskSearch = ref('')

const archivedTasks = computed<ArchivedTaskUI[]>(() =>
  archivedTasksRaw.value.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    deletedAt: task.deleted_at,
    projectName: task.project?.name ?? (task.project_id ? `Project #${task.project_id}` : 'Personal workspace'),
    projectDeleted: Boolean(task.project?.deleted_at || (task.project_id && !task.project)),
    priority: task.priority,
    parentTaskId: task.parent_task_id
  }))
)

const searchQuery = computed(() => taskSearch.value.trim().toLowerCase())

const filteredTasks = computed(() => {
  if (!searchQuery.value) {
    return archivedTasks.value
  }

  return archivedTasks.value.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.value)
  )
})

const archivedProjects = computed<ArchivedProjectUI[]>(() =>
  archivedProjectsRaw.value.map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    priority: project.priority,
    deletedAt: project.deleted_at,
    createdAt: project.created_at,
    taskCount: project.task_count ?? 0
  }))
)

const filteredProjects = computed(() => {
  if (!searchQuery.value) {
    return archivedProjects.value
  }

  return archivedProjects.value.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.value)
  )
})

function formatStatus(value: string): string {
  if (!value) return '—'
  const normalized = value.replace(/_/g, '-').toLowerCase()
  if (normalized === 'todo') {
    return 'To Do'
  }
  return normalized
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

function formatDateTime(value: string | null): string {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDeletedDate(value: string | null): string {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ','
}

function formatDeletedTime(value: string | null): string {
  const date = parseDate(value)
  if (!date) return '—'
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    case 'in-progress':
      return 'bg-blue-100 text-blue-700 border border-blue-200'
    case 'blocked':
      return 'bg-rose-100 text-rose-700 border border-rose-200'
    case 'not-started':
      return 'bg-slate-100 text-slate-700 border border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

async function fetchArchive() {
  try {
    isLoading.value = true
    error.value = ''
    isForbidden.value = false

    const response = await $fetch<ArchiveResponse>('/api/admin/archive')
    archivedTasksRaw.value = response.tasks ?? []
    archivedProjectsRaw.value = response.projects ?? []
  } catch (err: any) {
    console.error('Error fetching archive:', err)
    archivedTasksRaw.value = []
    archivedProjectsRaw.value = []

    const status = err?.statusCode ?? err?.response?.status ?? err?.data?.statusCode
    if (status === 403) {
      isForbidden.value = true
      error.value = 'Access denied. Only administrators can view archived items.'
      return
    }

    error.value = err?.data?.statusMessage || err?.message || 'Failed to load archived items.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchArchive()
})
</script>

