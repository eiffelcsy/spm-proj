<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-5xl xl:max-w-7xl">
      <div v-if="task" class="space-y-6">
          <!-- Main Task Card -->
          <Card>
              <CardHeader>
                  <div class="flex items-start justify-between">
                      <div class="space-y-3 flex-1">
                          <!-- Badges and Project Link -->
                          <div class="flex items-center flex-wrap gap-2">
                              <Badge :class="getStatusClasses(task.status)" class="capitalize">
                                  {{ task.status.replace('-', ' ') }}
                              </Badge>
                              <Badge v-if="isSubtask" variant="outline" class="text-xs">
                                  Subtask
                              </Badge>
                              <Badge v-if="isRecurringTask" variant="secondary" class="text-xs">
                                  <RefreshCwIcon class="h-3 w-3 mr-1" />
                                  Recurring
                              </Badge>
                          </div>
                          
                          <!-- Title -->
                          <CardTitle class="text-2xl">{{ task.title }}</CardTitle>
                          
                          <!-- Project Link (if task belongs to a project) -->
                          <div v-if="task.project" class="flex items-center space-x-2">
                              <FolderIcon class="h-4 w-4 text-muted-foreground" />
                              <span class="text-sm text-muted-foreground">Project:</span>
                              <Button 
                                  variant="link" 
                                  class="h-auto p-0 text-sm font-medium text-primary hover:underline"
                                  @click="goToProject(task.project.id)">
                                  {{ task.project.name }}
                              </Button>
                          </div>
                      </div>
                      
                      <!-- Action Buttons -->
                      <div v-if="canEdit" class="ml-4 flex flex-col gap-2">
                          <Button variant="outline" size="sm" @click="openEditModal">
                              <Pencil1Icon class="mr-2 h-4 w-4" />
                              Edit {{ isSubtask ? 'Subtask' : 'Task' }}
                          </Button>
                          <Button variant="outline" size="sm" @click="openDeleteModal"
                              class="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300">
                              <TrashIcon class="mr-2 h-4 w-4" />
                              Delete {{ isSubtask ? 'Subtask' : 'Task' }}
                          </Button>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <!-- Dates Section -->
                      <div class="space-y-4">
                          <h3 class="text-sm font-semibold text-foreground mb-3">Timeline</h3>
                          <div>
                              <div class="flex items-center text-sm font-medium text-muted-foreground mb-1">
                                  <CalendarIcon class="h-4 w-4 mr-2" />
                                  Start Date
                              </div>
                              <div class="text-sm ml-6">{{ formatDate(task.start_date) }}</div>
                          </div>
                          <div>
                              <div class="flex items-center text-sm font-medium text-muted-foreground mb-1">
                                  <CalendarIcon class="h-4 w-4 mr-2" />
                                  Due Date
                              </div>
                              <div class="text-sm ml-6" :class="{ 'text-red-600 font-semibold': isTaskOverdue }">
                                  {{ formatDate(task.due_date) }}
                                  <Badge v-if="isTaskOverdue" variant="destructive" class="ml-2 text-xs">
                                      Overdue
                                  </Badge>
                              </div>
                          </div>
                      </div>

                      <!-- Priority and Recurrence Section -->
                      <div class="space-y-4">
                          <h3 class="text-sm font-semibold text-foreground mb-3">Details</h3>
                          <div>
                              <div class="flex items-center text-sm font-medium text-muted-foreground mb-1">
                                  <TargetIcon class="h-4 w-4 mr-2" />
                                  Priority
                              </div>
                              <div class="flex items-center space-x-2 ml-6">
                                  <div :class="`w-2 h-2 rounded-full ${getPriorityColorClass(task.priority)}`"></div>
                                  <span class="text-sm">{{ getPriorityDisplay(task.priority) }}</span>
                              </div>
                          </div>
                          <div>
                              <div class="flex items-center text-sm font-medium text-muted-foreground mb-1">
                                  <RefreshCwIcon class="h-4 w-4 mr-2" />
                                  Repeat Interval
                              </div>
                              <div class="text-sm ml-6">
                                  {{ getRepeatFrequencyDisplay(task.repeat_interval) }}
                              </div>
                          </div>
                      </div>

                      <!-- People Section -->
                      <div class="space-y-4">
                          <h3 class="text-sm font-semibold text-foreground mb-3">People</h3>
                          <div>
                              <div class="flex items-center text-sm font-medium text-muted-foreground mb-1">
                                  <PersonIcon class="h-4 w-4 mr-2" />
                                  Creator
                              </div>
                              <div class="flex items-center space-x-2 ml-6">
                                  <div
                                      class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                      {{ getInitials(task.creator?.fullname) }}
                                  </div>
                                  <span class="text-sm">{{ task.creator?.fullname || 'Unknown' }}</span>
                              </div>
                          </div>
                          <div>
                              <div class="flex items-center text-sm font-medium text-muted-foreground mb-1">
                                  <PersonIcon class="h-4 w-4 mr-2" />
                                  Assignees
                              </div>
                              <div v-if="task.assignees && task.assignees.length" class="flex flex-col space-y-2 ml-6">
                                  <div v-for="(assignee, idx) in task.assignees" :key="idx" class="flex items-center space-x-2">
                                      <div
                                          class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                                          {{ getInitials(assignee.assigned_to?.fullname) }}
                                      </div>
                                      <div class="flex flex-col">
                                          <span class="text-sm">{{ assignee.assigned_to?.fullname || 'Unassigned' }}</span>
                                          <span v-if="assignee.assigned_by" class="text-xs text-muted-foreground">
                                              by {{ assignee.assigned_by.fullname }}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              <div v-else class="flex items-center space-x-2 ml-6">
                                  <div
                                      class="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                                      ?
                                  </div>
                                  <span class="text-sm text-muted-foreground">Unassigned</span>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <!-- Notes Section (Full Width) -->
                  <div v-if="task.notes" class="mt-6 pt-6 border-t">
                      <div class="flex items-center text-sm font-medium text-muted-foreground mb-2">
                          <FileTextIcon class="h-4 w-4 mr-2" />
                          Notes
                      </div>
                      <div class="text-sm text-foreground bg-muted/30 rounded-lg p-4 ml-6">
                          {{ task.notes }}
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
                  <DataTable :columns="subtaskColumns" :data="subtaskRows" @rowClick="row => goToSubtask(row.id)"
                      isSubtaskTable :hideToolbar="true" />
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
                      <div v-for="(log, idx) in task.history" :key="log.timestamp"
                          class="relative flex items-start space-x-3">
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
          <div v-if="!canEdit"
              class="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <InfoCircledIcon class="h-4 w-4" />
              <span>This view is read-only. Only the creator or assignee can edit this {{ isSubtask ? 'subtask' :
                  'task'
                  }}.</span>

              <div>
                DEBUG: {{ task }}
              </div>
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

      <!-- Create Task Modal -->
      <CreateTaskModal
        :isOpen="isModalOpen"
        role="staff"
        :currentUser="currentUserStaffId ? String(currentUserStaffId) : undefined"
        @close="isModalOpen = false"
        @task-created="handleTaskChange"
      />

      <!-- Create Project Modal -->
      <CreateProjectModal
        :isOpen="isCreateProjectModalOpen"
        @close="isCreateProjectModalOpen = false"
        @project-created="handleProjectCreated"
      />
      
      <!-- Edit Task Modal -->
      <EditTaskModal :open="isEditModalOpen" :task="task" :isSubtask="isSubtask" @update:open="closeEditModal"
          @task-updated="handleTaskUpdated" />

      <!-- Delete Task Modal -->
      <DeleteTaskModal :open="isDeleteModalOpen" :task="{ id: task?.id as string, title: task?.title }" @update:open="closeDeleteModal"
          @confirm="handleDeleteComplete" />
  </div>
</template>

<script setup lang="ts">

definePageMeta({
  layout: 'with-sidebar'
})

import DataTable from '@/components/tasks-table/data-table.vue'
import { CreateTaskModal } from "@/components/task-modals/create-task/";
import { CreateProjectModal } from "@/components/project-modals/create-project";
import { EditTaskModal } from '@/components/task-modals/edit-task'
import { DeleteTaskModal } from '@/components/task-modals/delete-task'
import {
    ListBulletIcon,
    ClockIcon,
    InfoCircledIcon,
    ExclamationTriangleIcon,
    Pencil1Icon,
    CalendarIcon,
    PersonIcon,
    FileTextIcon,
    TrashIcon,
    TargetIcon
} from '@radix-icons/vue'
import { RefreshCwIcon, FolderIcon } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  createTitleColumn,
  createStartDateColumn,
  createDueDateColumn,
  createStatusColumn,
  createPriorityColumn,
  formatDate,
  isOverdue,
  getStatusClasses,
  getPriorityDisplay,
  getPriorityColorClass
} from '@/components/tasks-table/columns/column-helpers'

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const isModalOpen = ref<boolean>(false);
const isCreateProjectModalOpen = ref<boolean>(false);
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const editableTask = ref<any>(null)
const currentUserStaffId = ref<number | null>(null)

// ============================================================================
// ROUTING & DATA FETCHING
// ============================================================================

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

const { data, pending, error, refresh } = await useFetch(`/api/tasks/${taskId}`)

function fetchTask() {
  refresh();
}

// Fetch current user
async function fetchCurrentUser() {
  try {
    const user = await $fetch('/api/user/me')
    currentUserStaffId.value = user.id
  } catch (err) {
    console.error('Failed to fetch current user:', err)
    currentUserStaffId.value = null
  }
}

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

const task = computed(() => {
  return (data.value as any)?.task || null
})

const isSubtask = computed(() => {
  if (!task.value) return false
  return task.value.parent_task_id !== null && task.value.parent_task_id !== undefined
})

const isRecurringTask = computed(() => {
  if (!task.value) return false
  return task.value.repeat_interval && task.value.repeat_interval !== 0
})

const isTaskOverdue = computed(() => {
  if (!task.value || !task.value.due_date || task.value.status === 'completed') return false
  return isOverdue(task.value.due_date, task.value.status)
})

const canEdit = computed(() => {
  if (!task.value || !task.value.permissions) return false
  return task.value.permissions.canEdit
})

const canDelete = computed(() => {
  if (!task.value || !task.value.permissions) return false
  return task.value.permissions.canDelete
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get initials from a person's name
 */
function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

/**
 * Display repeat frequency in human-readable format
 */
function getRepeatFrequencyDisplay(frequency: string | null | undefined): string {
  if (!frequency || frequency === 'never' || frequency === '0') {
    return 'Does not repeat'
  }
  
  // Handle numeric values (legacy format - days)
  const numericFrequency = parseInt(frequency)
  if (!isNaN(numericFrequency) && numericFrequency > 0) {
    if (numericFrequency === 1) return 'Daily'
    if (numericFrequency === 7) return 'Weekly'
    if (numericFrequency === 30) return 'Monthly'
    if (numericFrequency === 365) return 'Yearly'
    return `Every ${numericFrequency} days`
  }
  
  // Handle string values (new format)
  const frequencyMap: Record<string, string> = {
    'daily': 'Daily',
    'weekly': 'Weekly',
    'monthly': 'Monthly',
    'yearly': 'Yearly'
  }
  
  return frequencyMap[frequency.toLowerCase()] || 'Does not repeat'
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

/**
 * Open the edit task modal
 */
function openEditModal() {
  editableTask.value = task.value ? { ...task.value } : null
  isEditModalOpen.value = true
}

/**
 * Close the edit task modal
 */
function closeEditModal() {
  isEditModalOpen.value = false
}

/**
 * Handle successful task update from modal
 */
function handleTaskUpdated(updatedTask: any) {
  if (editableTask.value) {
    editableTask.value = { ...editableTask.value, ...updatedTask }
  }
  refresh()
  closeEditModal()
}

/**
 * Open the delete task modal
 */
function openDeleteModal() {
  isDeleteModalOpen.value = true
}

/**
 * Close the delete task modal
 */
function closeDeleteModal() {
  isDeleteModalOpen.value = false
}

/**
 * Handle successful task deletion
 */
async function handleDeleteComplete() {
  try {
    await performDelete()
  } catch (error) {
    console.error('Failed to delete task:', error)
  }
}

/**
 * Perform the actual task deletion API call
 */
async function performDelete() {
  try {
    if (!task.value || !task.value.id) {
      throw new Error('Task ID is missing')
    }

    const response = await $fetch<{ success: boolean; message: string }>(`/api/tasks/${task.value.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      closeDeleteModal()
      router.push('/personal/dashboard')
    } else {
      throw new Error('Failed to delete task')
    }
  } catch (error) {
    closeDeleteModal()
    throw error
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Unified handler for task changes (create, update, delete)
 */
 function handleTaskChange() {
  fetchTask();
  isModalOpen.value = false;
}

/**
 * Project creation handler
 */
function handleProjectCreated(project: any) {
  isCreateProjectModalOpen.value = false;
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

/**
 * Navigate to project detail page
 */
 function goToProject(projectId: number) {
  router.push(`/project/${projectId}`)
}

/**
 * Navigate back to appropriate dashboard based on context
 */
function goToDashboard() {
  const from = route.query.from
  const projectId = route.query.projectId
  
  if (from === 'project' && projectId) {
    router.push(`/project/${projectId}`)
  } else if (from === 'project') {
    router.push('/project/dashboard')
  } else {
    router.push('/personal/dashboard')
  }
}

/**
 * Navigate to subtask detail page while preserving context
 */
function goToSubtask(subtaskId: string) {
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

// ============================================================================
// SUBTASK TABLE CONFIGURATION
// ============================================================================

/**
 * Column definitions for subtask table
 */
const subtaskColumns = [
  createTitleColumn(),
  createStartDateColumn(),
  createDueDateColumn({ showOverdue: true }),
  createPriorityColumn(),
  createStatusColumn(),
]

/**
 * Transform subtasks data for table display
 */
const subtaskRows = computed(() => {
  if (!task.value || !Array.isArray(task.value.subtasks)) return []
  return task.value.subtasks.map((subtask: any) => ({
    ...subtask,
    startDate: subtask.start_date || subtask.startDate,
    dueDate: subtask.due_date || subtask.dueDate,
  }))
})

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Set up event listeners for quick actions
 */
 onMounted(() => {
  fetchCurrentUser();
  window.addEventListener("task-updated", handleTaskChange);
  window.addEventListener("task-deleted", handleTaskChange);
  window.addEventListener("open-create-task-modal", () => {
    isModalOpen.value = true;
  });
  window.addEventListener("open-create-project-modal", () => {
    isCreateProjectModalOpen.value = true;
  });
});

onUnmounted(() => {
  window.removeEventListener("task-updated", handleTaskChange);
  window.removeEventListener("task-deleted", handleTaskChange);
  window.removeEventListener("open-create-task-modal", () => {
    isModalOpen.value = true;
  });
  window.removeEventListener("open-create-project-modal", () => {
    isCreateProjectModalOpen.value = true;
  });
});
</script>
