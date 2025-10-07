<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header with breadcrumb and close -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center space-x-2 text-sm text-muted-foreground">
        <button @click="goToDashboard" class="hover:text-foreground transition-colors">
          Dashboard
        </button>
        <ChevronRight class="h-4 w-4" />
        <span v-if="isSubtask && task?.parentTask" class="hover:text-foreground transition-colors cursor-pointer" @click="goToParentTask(task.parentId)">
          {{ task.parentTask }}
        </span>
        <ChevronRight v-if="isSubtask && task?.parentTask" class="h-4 w-4" />
        <span class="text-foreground font-medium">{{ task?.title || 'Task Details' }}</span>
      </div>
      <Button variant="ghost" size="icon" @click="goToDashboard">
        <X class="h-4 w-4" />
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
            </div>
            <div v-if="canEdit || canDelete" class="ml-4 flex flex-col gap-2">
              <Button
                v-if="canEdit"
                variant="outline"
                size="sm"
                @click="openEditModal"
              >
                <Pencil class="mr-2 h-4 w-4" />
                Edit {{ isSubtask ? 'Subtask' : 'Task' }}
              </Button>
              <Button
                v-if="canDelete"
                variant="outline"
                size="sm"
                @click="openDeleteModal"
                class="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
              >
                <Trash2 class="mr-2 h-4 w-4" />
                Delete {{ isSubtask ? 'Subtask' : 'Task' }}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Dates -->
            <div class="space-y-4">
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                  <Calendar class="h-4 w-4" />
                  <span>Start Date</span>
                </div>
                <div class="text-sm">{{ formatDate(task.start_date) }}</div>
              </div>
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                  <Calendar class="h-4 w-4" />
                  <span>Due Date</span>
                </div>
                <div class="text-sm" :class="{ 'text-red-600': isOverdue(task.due_date) }">
                  {{ formatDate(task.due_date) }}
                  <div v-if="isOverdue(task.due_date)" class="inline-block ml-2 px-2.5 py-0.5 rounded-full text-xs text-center font-medium bg-red-500 text-white">
                    Overdue
                  </div>
                </div>
              </div>
            </div>

            <!-- People -->
            <div class="space-y-4">
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                  <User class="h-4 w-4" />
                  <span>Creator</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {{ getInitials(task.creator?.fullname) }}
                  </div>
                  <span class="text-sm">{{ task.creator?.fullname || '?' }}</span>
                </div>
              </div>
               <div>
                <div class="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                  <User class="h-4 w-4" />
                  <span>Assignee</span>
                </div>
                <div v-if="task.assignees && task.assignees.length" class="flex flex-col space-y-1">
                  <template v-for="(assignee, idx) in task.assignees" :key="idx">
                    <div class="flex items-center space-x-2">
                      <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                        {{ getInitials(assignee.assigned_to?.fullname) }}
                      </div>
                      <span class="text-sm">{{ assignee.assigned_to?.fullname || 'Unassigned' }}</span>
                      <span v-if="assignee.assigned_by" class="text-xs text-muted-foreground ml-1">
                        (assigned by {{ assignee.assigned_by.fullname }})
                      </span>
                      <span v-if="assignee.assigned_at" class="text-xs text-muted-foreground ml-1">
                        on {{ formatDate(assignee.assigned_at) }}
                      </span>
                      <span v-if="idx < task.assignees.length - 1"></span>
                    </div>
                  </template>
                </div>
                <div v-else class="flex items-center space-x-2">
                  <div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                    ?
                  </div>
                  <span class="text-sm">Unassigned</span>
                </div>
              </div>
            </div>

            <!-- Priority -->
            <div class="space-y-4">
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                  <AlertCircle class="h-4 w-4" />
                  <span>Priority</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 rounded-full" :class="getPriorityColorClass(task.priority)"></div>
                  <span class="text-sm font-medium">{{ getPriorityDisplay(task.priority) }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="md:col-span-2">
              <div class="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
                <FileText class="h-4 w-4" />
                <span>Notes</span>
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
            <List class="h-5 w-5" />
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
            <Clock class="h-5 w-5" />
            <span>Activity Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="task.history && task.history.length > 0" class="space-y-4">
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
                  by {{ log.staff?.fullname || '?' }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="flex items-center justify-center py-8">
            <div class="text-center">
              <Clock class="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p class="text-sm text-muted-foreground">No activities available</p>
              <p class="text-xs text-muted-foreground mt-1">Activity timeline will appear here as the task progresses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Read-only notice -->
      <div v-if="!canEdit && !canDelete" class="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info class="h-4 w-4" />
        <span>This view is read-only. Only assigned staff can edit or delete this {{ isSubtask ? 'subtask' : 'task' }}.</span>
      </div>
    </div>

    <!-- Task not found -->
    <Card v-else>
      <CardContent class="pt-6">
        <div class="text-center space-y-2">
          <AlertTriangle class="h-12 w-12 text-muted-foreground mx-auto" />
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

    <!-- Delete Task Modal -->
    <DeleteTaskModal
      :isOpen="isDeleteModalOpen"
      :isSubtask="isSubtask"
      @close="closeDeleteModal"
      @undo="undoDelete"
      @delete-complete="handleDeleteComplete"
    />
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  layout: 'task-detail'
})

// ...existing code...
import DataTable from '@/components/tasks/data-table.vue'
import EditTaskModal from '~/components/task-modals/edit-task-modal.vue'
import { DeleteTaskModal } from '~/components/task-modals/delete-task-modal'
import { 
  List, 
  Clock, 
  Info, 
  AlertTriangle, 
  X, 
  Pencil, 
  Calendar, 
  User, 
  FileText, 
  ChevronRight, 
  Trash2,
  AlertCircle
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

const { data, pending, error, refresh } = await useFetch(`/api/tasks/${taskId}`)

const task = computed(() => {
  return (data.value as any)?.task || null
})
const isSubtask = computed(() => {
  if (!task.value) return false
  // A task is a subtask if it has a parent_task_id
  return task.value.parent_task_id !== null && task.value.parent_task_id !== undefined
})
const isEditModalOpen = ref(false)
// Local ref for editing task in modal
const editableTask = ref<any>(null)

// Delete functionality state
const isDeleteModalOpen = ref(false)

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

function getPriorityDisplay(priority: number | string | undefined | null): string {
  if (!priority) return 'Not Set';
  
  const priorityNum = typeof priority === 'string' ? parseInt(priority) : priority;
  if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 10) return 'Not Set';
  
  const priorityOptions = [
    { level: 1, label: 'Lowest' },
    { level: 2, label: 'Very Low' },
    { level: 3, label: 'Low' },
    { level: 4, label: 'Medium Low' },
    { level: 5, label: 'Medium' },
    { level: 6, label: 'Medium High' },
    { level: 7, label: 'High' },
    { level: 8, label: 'Very High' },
    { level: 9, label: 'Critical' },
    { level: 10, label: 'Emergency' }
  ];
  
  const option = priorityOptions.find(p => p.level === priorityNum);
  return option ? `Level ${option.level} (${option.label})` : 'Not Set';
}

function getPriorityColorClass(priority: number | string | undefined | null): string {
  if (!priority) return 'bg-gray-400';
  
  const priorityNum = typeof priority === 'string' ? parseInt(priority) : priority;
  if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 10) return 'bg-gray-400';
  
  const colorClasses = [
    'bg-blue-400',    // Level 1 - Lowest
    'bg-blue-500',    // Level 2 - Very Low
    'bg-indigo-500',  // Level 3 - Low
    'bg-green-500',   // Level 4 - Medium Low
    'bg-yellow-500',  // Level 5 - Medium
    'bg-orange-500',  // Level 6 - Medium High
    'bg-red-400',     // Level 7 - High
    'bg-red-500',     // Level 8 - Very High
    'bg-red-600',     // Level 9 - Critical
    'bg-purple-600'   // Level 10 - Emergency
  ];
  
  return colorClasses[priorityNum - 1] || 'bg-gray-400';
}




function goToDashboard() {
  const from = route.query.from
  const projectId = route.query.projectId
  
  if (from === 'project' && projectId) {
    // Return to specific project page
    router.push(`/project/${projectId}`)
  } else if (from === 'project') {
    // Return to general project dashboard
    router.push('/project/dashboard')
  } else {
    router.push('/personal/dashboard') // default to personal
  }
}

function goToSubtask(subtaskId: string) {
  // Preserve the project context when navigating to subtasks
  const from = route.query.from
  const projectId = route.query.projectId
  
  if (from && projectId) {
    router.push(`/task/${subtaskId}?from=${from}&projectId=${projectId}`)
  } else if (from) {
    router.push(`/task/${subtaskId}?from=${from}`)
  } else {
    router.push(`/task/${subtaskId}`)
  }
}

// Use permissions from the API response
const canEdit = computed(() => {
  if (!task.value || !task.value.permissions) return false
  return task.value.permissions.canEdit
})

const canDelete = computed(() => {
  if (!task.value || !task.value.permissions) return false
  return task.value.permissions.canDelete
})

function goToParentTask(parentId: string) {
  // Preserve the project context when navigating to parent task
  const from = route.query.from
  const projectId = route.query.projectId
  
  if (from && projectId) {
    router.push(`/task/${parentId}?from=${from}&projectId=${projectId}`)
  } else if (from) {
    router.push(`/task/${parentId}?from=${from}`)
  } else {
    router.push(`/task/${parentId}`)
  }
}

function openEditModal() {
  // Copy current task to editableTask for modal editing
  editableTask.value = task.value ? { ...task.value } : null
  isEditModalOpen.value = true
}

function closeEditModal() {
  isEditModalOpen.value = false
}

function handleTaskUpdated(updatedTask: any) {
  // Update the editable task data
  if (editableTask.value) {
    editableTask.value = { ...editableTask.value, ...updatedTask }
  }
  refresh()
  closeEditModal()
}

// Delete functionality
function openDeleteModal() {
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
}

function undoDelete() {
  closeDeleteModal()
}

async function handleDeleteComplete() {
  // Perform the actual deletion after countdown completes
  try {
    await performDelete()
  } catch (error) {
    // Don't redirect if deletion failed
  }
}

async function performDelete() {
  try {
    if (!task.value || !task.value.id) {
      throw new Error('Task ID is missing')
    }

    const response = await $fetch<{ success: boolean; message: string }>(`/api/tasks/${task.value.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      // Close modal and navigate back to dashboard
      closeDeleteModal()
      router.push('/personal/dashboard')
    } else {
      throw new Error('Failed to delete task')
    }
  } catch (error) {
    closeDeleteModal()
    // You might want to show an error message to the user here
  }
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
    cell: ({ row }: any) => formatDate(row.original?.start_date || row.original?.startDate),
    enableSorting: true,
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }: any) => {
      const dueDate = row.original?.due_date || row.original?.dueDate;
      const isOverdueDate = isOverdue(dueDate);
      return h('div', {
        class: isOverdueDate ? 'text-red-600 font-semibold' : ''
      }, formatDate(dueDate));
    },
    enableSorting: true,
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }: any) => h(
      'div',
      { class: 'flex items-center space-x-2' },
      [
        h('div', {
          class: `w-2 h-2 rounded-full ${getPriorityColorClass(row.original?.priority)}`
        }),
        h('span', { class: 'text-sm' }, getPriorityDisplay(row.original?.priority))
      ]
    ),
    enableSorting: true,
    enableFiltering: true,
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
  return task.value.subtasks || [];
});
</script>
