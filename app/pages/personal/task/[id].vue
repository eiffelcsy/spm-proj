<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header with breadcrumb and close -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-2 text-sm text-muted-foreground">
        <button @click="goToDashboard" class="hover:text-foreground transition-colors">
          Dashboard
        </button>
        <ChevronRightIcon class="h-4 w-4" />
        <span v-if="isSubtask && task?.parentTask" class="hover:text-foreground transition-colors cursor-pointer" @click="goToParentTask(task.parentId)">
          {{ task.parentTask }}
        </span>
        <ChevronRightIcon v-if="isSubtask && task?.parentTask" class="h-4 w-4" />
        <span class="text-foreground font-medium">{{ task?.title || 'Task Details' }}</span>
      </div>
      <Button variant="ghost" size="icon" @click="goToDashboard">
        <Cross2Icon class="h-4 w-4" />
      </Button>
    </div>

    <div v-if="task" class="space-y-6">
      <!-- Main Task Card -->
      <Card>
        <CardHeader>
          <div class="flex items-start justify-between">
            <div class="space-y-2 flex-1">
              <div class="flex items-center space-x-2">
                <div :class="getStatusClasses(task.status)" class="capitalize">
                  {{ task.status.replace('-', ' ') }}
                </div>
                <Badge v-if="isSubtask" variant="outline" class="text-xs">
                  Subtask
                </Badge>
              </div>
              <CardTitle class="text-2xl">{{ task.title }}</CardTitle>
              <CardDescription v-if="task.description">
                {{ task.description }}
              </CardDescription>
            </div>
            <Button
              v-if="canEdit"
              variant="outline"
              size="sm"
              @click="openEditModal"
              class="ml-4"
            >
              <Pencil1Icon class="mr-2 h-4 w-4" />
              Edit {{ isSubtask ? 'Subtask' : 'Task' }}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Dates -->
            <div class="space-y-4">
              <div>
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <CalendarIcon class="h-4 w-4" />
                  Start Date
                </div>
                <div class="text-sm">{{ formatDate(task.startDate) }}</div>
              </div>
              <div>
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <CalendarIcon class="h-4 w-4" />
                  Due Date
                </div>
                <div class="text-sm" :class="{ 'text-red-600': isOverdue(task.dueDate) }">
                  {{ formatDate(task.dueDate) }}
                  <div v-if="isOverdue(task.dueDate)" class="inline-block ml-2 px-2.5 py-0.5 rounded-full text-xs text-center font-medium bg-red-500 text-white">
                    Overdue
                  </div>
                </div>
              </div>
            </div>

            <!-- People -->
            <div class="space-y-4">
              <div>
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <PersonIcon class="h-4 w-4" />
                  Creator
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {{ getInitials(task.creator) }}
                  </div>
                  <span class="text-sm">{{ task.creator }}</span>
                </div>
              </div>
              <div>
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <PersonIcon class="h-4 w-4" />
                  Assignee
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                    {{ getInitials(task.assignee) }}
                  </div>
                  <span class="text-sm">{{ task.assignee }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="md:col-span-2">
              <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                <FileTextIcon class="h-4 w-4" />
                Notes
              </div>
              <div class="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                {{ task.notes || 'No additional notes' }}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Subtasks Card (only for main tasks) -->
      <Card v-if="!isSubtask && task.subtasks && task.subtasks.length > 0">
        <CardHeader>
          <CardTitle class="flex items-center space-x-2">
            <ListBulletIcon class="h-5 w-5" />
            <span>Subtasks</span>
            <Badge variant="secondary" class="ml-2">{{ task.subtasks.length }}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            :columns="subtaskColumns"
            :data="subtaskRows"
            @rowClick="row => goToSubtask(row.id)"
            isSubtaskTable
            :hideToolbar="true"
          />
        </CardContent>
      </Card>

      <!-- Activity Timeline Card -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center space-x-2">
            <ClockIcon class="h-5 w-5" />
            <span>Activity Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div v-for="(log, idx) in task.history" :key="log.timestamp" class="relative flex items-start space-x-3">
              <!-- Timeline dot and line -->
              <div class="flex flex-col items-center">
                <div class="w-2 h-2 bg-primary rounded-full"></div>
                <div v-if="idx < task.history.length - 1" class="w-px h-12 bg-border mt-2"></div>
              </div>
              
              <!-- Content -->
              <div class="flex-1 min-w-0 pb-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-foreground">
                    {{ log.action }}
                  </p>
                  <time class="text-xs text-muted-foreground">
                    {{ formatDate(log.timestamp) }}
                  </time>
                </div>
                <p class="text-sm text-muted-foreground">
                  by {{ log.user }}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Read-only notice -->
      <div v-if="!canEdit" class="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
        <InfoCircledIcon class="h-4 w-4" />
        <span>This view is read-only. Only the creator or assignee can edit this {{ isSubtask ? 'subtask' : 'task' }}.</span>
      </div>
    </div>

    <!-- Task not found -->
    <Card v-else>
      <CardContent class="pt-6">
        <div class="text-center space-y-2">
          <ExclamationTriangleIcon class="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 class="text-lg font-semibold">Task Not Found</h3>
          <p class="text-muted-foreground">The task you're looking for doesn't exist or has been removed.</p>
          <Button @click="goToDashboard" class="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
    
    <!-- Edit Task Modal -->
    <EditTaskModal
      :isOpen="isEditModalOpen"
      :task="task"
      :isSubtask="isSubtask"
      @close="closeEditModal"
      @task-updated="handleTaskUpdated"
    />
  </div>
</template>

<script setup lang="ts">

import { useRoute, useRouter } from 'vue-router'
import { ref, computed, h } from 'vue'
import { 
  Pencil1Icon, 
  Cross2Icon, 
  ChevronRightIcon, 
  CalendarIcon, 
  PersonIcon, 
  FileTextIcon, 
  ListBulletIcon, 
  ClockIcon, 
  InfoCircledIcon, 
  ExclamationTriangleIcon 
} from '@radix-icons/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import DataTable from '@/components/tasks/data-table.vue'
import EditTaskModal from '~/components/task-modals/edit-task-modal.vue'
import tasksJson from '@/components/tasks/data/example.json'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

function formatDate(date: string | Date | undefined | null) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status: string) {
  if (status === 'not-started') return 'text-red-500';
  if (status === 'in-progress') return 'text-yellow-500';
  if (status === 'completed') return 'text-green-500';
  return 'text-gray-500';
}

function statusBubbleClass(status: string) {
  if (status === 'not-started') return 'bg-red-100 text-red-700';
  if (status === 'in-progress') return 'bg-yellow-100 text-yellow-700';
  if (status === 'completed') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
}

function getStatusClasses(status: string): string {
  const statusClasses = {
    'not-started': 'bg-red-100 text-red-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
  }[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  
  return `w-22 items-center px-2.5 py-0.5 rounded-full text-xs text-center font-medium ${statusClasses}`
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

function isOverdue(dueDate: string | Date | undefined | null): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (!(due instanceof Date) || isNaN(due.getTime())) return false;
  return due < new Date() && task.value?.status !== 'completed';
}

const currentUser = 'john.doe'

const task = ref<any>(null)
const isSubtask = ref(false)
const isEditModalOpen = ref(false)

function findTaskById(id: string): any {
  // Search main tasks
  let found = tasksJson.find((t: any) => String(t.id) === String(id))
  if (found) {
    isSubtask.value = false
    return found
  }
  // Search subtasks recursively
  for (const t of tasksJson) {
    if (Array.isArray(t.subtasks)) {
      for (const sub of t.subtasks) {
        if (String(sub.id) === String(id)) {
          isSubtask.value = true
          return {
            ...sub,
            parentTask: t.title,
            parentId: t.id
          }
        }
        // Support nested subtasks (if any)
        if (Array.isArray(sub.subtasks) && sub.subtasks.length > 0) {
          for (const subsub of sub.subtasks as any[]) {
            if (subsub && typeof subsub === 'object' && 'id' in subsub && String(subsub.id) === String(id)) {
              isSubtask.value = true
              return {
                ...(subsub as object),
                parentTask: sub.title,
                parentId: sub.id
              }
            }
          }
        }
      }
    }
  }
  return null
}

task.value = findTaskById(String(taskId))

function goToDashboard() {
  router.push('/personal/dashboard')
}

function goToSubtask(subtaskId: string) {
  router.push(`/personal/task/${subtaskId}`)
}

const canEdit = computed(() => {
  if (!task.value) return false
  // User can edit if they are the assignee OR the creator
  return task.value.assignee === currentUser || task.value.creator === currentUser
})

function goToParentTask(parentId: string) {
  router.push(`/personal/task/${parentId}`)
}

function openEditModal() {
  isEditModalOpen.value = true
}

function closeEditModal() {
  isEditModalOpen.value = false
}

function handleTaskUpdated(updatedTask: any) {
  // Update the local task data
  task.value = { ...task.value, ...updatedTask }
  closeEditModal()
}

// Subtask table columns (use row.original for compatibility)
const subtaskColumns = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }: any) => row.original?.title ?? '—',
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    cell: ({ row }: any) => formatDate(row.original?.startDate),
    enableSorting: true,
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }: any) => formatDate(row.original?.dueDate),
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: any) => h(
      'div',
      {
        class: getStatusClasses(row.original?.status ?? '')
      },
      row.original?.status ? row.original.status.replace('-', ' ') : '—'
    ),
    enableSorting: true,
    enableFiltering: true,
  },
]

// Subtask rows for DataTable (no transformation needed)
const subtaskRows = computed(() => {
  if (!task.value || !Array.isArray(task.value.subtasks)) return [];
  return task.value.subtasks;
});
</script>
