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
            <div v-if="canEdit" class="ml-4 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="openEditModal"
              >
                <Pencil1Icon class="mr-2 h-4 w-4" />
                Edit {{ isSubtask ? 'Subtask' : 'Task' }}
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="openDeleteModal"
                class="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
              >
                <TrashIcon class="mr-2 h-4 w-4" />
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
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <CalendarIcon class="h-4 w-4" />
                  Start Date
                </div>
                <div class="text-sm">{{ formatDate(task.start_date) }}</div>
              </div>
              <div>
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <CalendarIcon class="h-4 w-4" />
                  Due Date
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
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <PersonIcon class="h-4 w-4" />
                  Creator
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {{ getInitials(task.creator?.fullname) }}
                  </div>
                  <span class="text-sm">{{ task.creator?.fullname || '?' }}</span>
                </div>
              </div>
               <div>
                <div class="flex items-center space-x-2 text-sm font-medium text-muted-foreground mb-1">
                  <PersonIcon class="h-4 w-4" />
                  Assignee
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
                  by {{ log.staff?.fullname || '?' }}
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

// ...existing code...
import DataTable from '@/components/tasks/data-table.vue'
import EditTaskModal from '~/components/task-modals/edit-task-modal.vue'
import { DeleteTaskModal } from '~/components/task-modals/delete-task-modal'
import {
  ListBulletIcon,
  ClockIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
  Cross2Icon,
  Pencil1Icon,
  CalendarIcon,
  PersonIcon,
  FileTextIcon,
  ChevronRightIcon,
  TrashIcon
} from '@radix-icons/vue'

// Register Radix icons for template usage
const components = {
  ListBulletIcon,
  ClockIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
  Cross2Icon,
  Pencil1Icon,
  CalendarIcon,
  PersonIcon,
  FileTextIcon,
  ChevronRightIcon,
  TrashIcon
}

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

const { data, pending, error, refresh } = await useFetch(`/api/tasks/${taskId}`)
const task = computed(() => data.value?.task || null)
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




function goToDashboard() {
  const from = route.query.from
  if (from === 'project') {
    router.push('/project/dashboard')
  } else {
    router.push('/personal/dashboard') // default to personal
  }
}

function goToSubtask(subtaskId: string) {
  router.push(`/task/${subtaskId}`)
}

// edit this when we can verify the current user

// const currentUser = 'Alice Smith'
// const canEdit = computed(() => {
//   if (!task.value) return false
//   // User can edit if they are the assignee OR the creator
//   return task.value.assignee === currentUser || task.value.creator === currentUser
// })

const canEdit = computed(() => true)

function goToParentTask(parentId: string) {
  router.push(`/task/${parentId}`)
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
    console.error('Error during delete completion:', error)
    // Don't redirect if deletion failed
  }
}

async function performDelete() {
  try {
    console.log('performDelete - Starting deletion process')
    console.log('performDelete - Task:', task.value)
    
    if (!task.value || !task.value.id) {
      throw new Error('Task ID is missing')
    }

    console.log('performDelete - Deleting task with ID:', task.value.id)

    const response = await $fetch<{ success: boolean; message: string }>(`/api/tasks/${task.value.id}`, {
      method: 'DELETE'
    })

    console.log('performDelete - API response:', response)

    if (response.success) {
      console.log('performDelete - Deletion successful, redirecting to dashboard')
      // Close modal and navigate back to dashboard
      closeDeleteModal()
      router.push('/personal/dashboard')
    } else {
      throw new Error('Failed to delete task')
    }
  } catch (error) {
    console.error('Error deleting task:', error)
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
    cell: ({ row }: any) => formatDate(row.original?.due_date || row.original?.dueDate),
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
  return task.value.subtasks || [];
});
</script>
