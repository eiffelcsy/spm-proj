<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">
    <h1 class="text-3xl font-bold mb-6">Personal Dashboard</h1>
    
    <div class="mb-4">
      <!-- Error message -->
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
        <button @click="fetchTasks" class="ml-2 underline">Try again</button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoadingAny" class="flex justify-center items-center py-8">
        <div class="text-gray-500">Loading tasks...</div>
      </div>

      <div v-else>
        <!-- Overdue Tasks Section -->
        <div v-if="overdueTasks.length > 0" class="mb-6">
          <div class="border-l-4 border-red-500 pl-4 mb-4 bg-red-50/70 p-4 rounded-r-lg">
            <h3 class="text-lg font-semibold pb-2 text-red-600 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Overdue Tasks ({{ overdueTasks.length }})
          </h3>
            <DataTable 
              :columns="overdueColumns" 
              :data="overdueTasks" 
              @rowClick="goToTask" 
              :hideToolbar="true"
            />
          </div>
        </div>

        <!-- Regular Tasks Section -->
        <div>
          <h3 class="text-lg font-semibold py-2 flex items-center justify-between">
            <span>My Tasks</span>
          </h3>
          <DataTable 
            :columns="columns" 
            :data="tasks" 
            @rowClick="goToTask" 
            :showCreateButton="true"
            :showRefreshButton="true"
            @create-task="isModalOpen = true"
            @refresh-tasks="fetchTasks"
          />
        </div>
      </div>

      <CreateTaskModal
        :isOpen="isModalOpen"
        role="staff"
        :currentUser="'me@example.com'"
        :projectId="null"
        @close="isModalOpen = false"
        @task-created="addTask"
      />

      <!-- Create Project Modal -->
      <div v-if="isCreateProjectModalOpen"
        class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" @click="closeCreateProjectModal">

        <!-- Modal content -->
        <div class="relative bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 overflow-y-auto z-10 flex flex-col h-[65vh]" @click.stop>
          <h2 class="text-xl font-semibold mb-4">Create New Project</h2>

          <!-- Feedback Messages -->
          <div v-if="projectSuccessMessage" class="flex-1 flex items-center justify-center">
            <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 text-green-800 rounded-xl p-8 flex flex-col items-center justify-center gap-6 min-w-[320px] min-h-[140px] shadow-lg">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span class="text-lg font-semibold text-center">{{ projectSuccessMessage }}</span>
              </div>
              <Button variant="outline" @click="handleProjectSuccessOk" class="bg-white hover:bg-green-50 border-green-300 text-green-700 hover:text-green-800 px-6 py-2">OK</Button>
            </div>
          </div>
          <div v-if="projectErrorMessage" class="mb-4 p-3 rounded bg-red-100 text-red-700">
            {{ projectErrorMessage }}
          </div>

          <form v-if="!projectSuccessMessage" @submit.prevent="createProject" class="space-y-4">

            <!-- Project Title -->
            <div>
              <Label class="block text-sm font-medium mb-1">Project Title *</Label>
              <Input v-model="projectName" type="text" required placeholder="Enter project title"
                class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <!-- Description -->
            <div>
              <Label class="block text-sm font-medium mb-1">Description</Label>
              <textarea v-model="projectDescription" rows="4" placeholder="Enter project description (optional)"
                class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            <!-- Due Date -->
            <div>
              <Label class="block text-sm font-medium mb-1">Due Date</Label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button variant="outline" :class="cn(
                    'w-full justify-start text-left font-normal',
                    !projectDueDate && 'text-muted-foreground',
                  )">
                    <CalendarIcon class="mr-2 h-4 w-4" />
                    {{ projectDueDate ? formatDate(projectDueDate) : "Select due date (optional)" }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0">
                  <Calendar v-model="projectDueDate" />
                </PopoverContent>
              </Popover>
            </div>

            <!-- Status -->
            <div>
              <Label class="block text-sm font-medium mb-1">Status</Label>
              <Select v-model="projectStatus">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select project status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-green-400"></span>
                      Completed
                    </div>
                  </SelectItem>
                  <SelectItem value="archived">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                      Archived
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Footer with buttons -->
            <div class="mt-auto pt-8">
              <div class="flex justify-end gap-2">
                <Button variant="outline" @click="closeCreateProjectModal">
                  Cancel
                </Button>
                <Button type="submit" @click="createProject" :disabled="isCreatingProject">
                  {{ isCreatingProject ? 'Creating...' : 'Create Project' }}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onUnmounted } from 'vue'
import { columns } from '@/components/tasks/columns'
import { overdueColumns } from '@/components/tasks/overdue-columns'
import type { Task } from '@/components/tasks/data/schema'
import DataTable from '@/components/tasks/data-table.vue'
import DataTableColumnHeader from '@/components/tasks/data-table-column-header.vue'
// import tasksJson from '@/components/tasks/data/example.json' // TODO: Replace with actual tasks from API
import CreateTaskModal from '~/components/task-modals/create-task-modal.vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { CalendarDate } from '@internationalized/date'
import { parseDate, getLocalTimeZone } from '@internationalized/date'

definePageMeta({
  layout: 'dashboard'
})

const router = useRouter()
const isModalOpen = ref(false)

// Project creation modal state
const isCreateProjectModalOpen = ref(false)
const projectName = ref('')
const projectDescription = ref('')
const projectDueDate = ref<any>(null)
const projectStatus = ref('active')
const projectSuccessMessage = ref('')
const projectErrorMessage = ref('')
const isCreatingProject = ref(false)

// // TODO: Replace with actual tasks from API
// const tasks = ref<Task[]>(
//   tasksJson.map(task => ({
//     ...task,
//     startDate: new Date(task.startDate),
//     dueDate: new Date(task.dueDate)
//   }))
// )

// Fetch regular tasks
const { data: tasksResponse, pending: isLoading, error: fetchError, refresh: refreshTasks } = await useFetch<{ tasks: any[], count: number }>('/api/tasks')

// Fetch overdue tasks
const { data: overdueTasksResponse, pending: isLoadingOverdue, error: fetchOverdueError, refresh: refreshOverdueTasks } = await useFetch<{ tasks: any[], count: number }>('/api/tasks/overdue')

// Transform and separate tasks
function transformTask(task: any): Task {
  return {
    id: task.id,
    title: task.title,
    startDate: new Date(task.start_date || task.startDate),
    dueDate: new Date(task.due_date || task.dueDate),
    project: task.project || '',
    status: task.status || 'pending'
  }
}

const overdueTasks = computed(() => {
  if (!overdueTasksResponse.value?.tasks) return []
  return overdueTasksResponse.value.tasks.map(transformTask).filter(task => task.status !== 'completed')
})

const tasks = computed(() => {
  if (!tasksResponse.value?.tasks) return []
  
  const allTasks = tasksResponse.value.tasks.map(transformTask)
  const overdueTaskIds = new Set(overdueTasks.value.map(task => task.id))
  
  // Return only non-overdue tasks to avoid duplicates
  return allTasks.filter(task => !overdueTaskIds.has(task.id))
})

const error = computed(() => {
  if (fetchError.value) return 'Failed to load tasks. Please try again. ' + fetchError.value.message
  if (fetchOverdueError.value) return 'Failed to load overdue tasks. Please try again.'
  return null
})

const isLoadingAny = computed(() => isLoading.value || isLoadingOverdue.value)


function fetchTasks() {
  refreshTasks()
  refreshOverdueTasks()
}

async function addTask(newTask: Task) {
  await fetchTasks() // This will refresh both regular and overdue tasks
  isModalOpen.value = false
}

function goToTask(task: Task) {
  router.push(`/task/${task.id}?from=personal`)
}

// Event listeners for task updates and deletions from dropdown actions
function handleTaskUpdate() {
  fetchTasks()
}

function handleTaskDelete() {
  fetchTasks()
}

// Project creation functions
function openCreateProjectModal() {
  isCreateProjectModalOpen.value = true
  resetProjectForm()
}

function closeCreateProjectModal() {
  isCreateProjectModalOpen.value = false
  resetProjectForm()
}

function resetProjectForm() {
  projectName.value = ''
  projectDescription.value = ''
  projectDueDate.value = null
  projectStatus.value = 'active'
  projectSuccessMessage.value = ''
  projectErrorMessage.value = ''
  isCreatingProject.value = false
}

function handleProjectSuccessOk() {
  resetProjectForm()
  isCreateProjectModalOpen.value = false
}

async function createProject() {
  try {
    if (!projectName.value.trim()) {
      projectErrorMessage.value = 'Project title is required.'
      return
    }

    projectErrorMessage.value = ''
    projectSuccessMessage.value = ''
    isCreatingProject.value = true

    const projectData = {
      name: projectName.value.trim(),
      description: projectDescription.value.trim() || null,
      due_date: projectDueDate.value ? projectDueDate.value.toString() : null,
      status: projectStatus.value
    }

    const response = await $fetch('/api/projects', {
      method: 'POST',
      body: projectData
    })

    if (!response || !response.success) {
      throw new Error('Failed to create project')
    }

    projectSuccessMessage.value = 'Project created successfully!'
  } catch (err: any) {
    console.error('Error creating project:', err)
    projectErrorMessage.value = err?.data?.statusMessage || err?.message || 'Something went wrong. Project was not created.'
    projectSuccessMessage.value = ''
  } finally {
    isCreatingProject.value = false
  }
}

function formatDate(date: any): string {
  if (typeof date === 'string') {
    const jsDate = new Date(date)
    const day = String(jsDate.getDate()).padStart(2, '0')
    const month = String(jsDate.getMonth() + 1).padStart(2, '0')
    const year = jsDate.getFullYear()
    return `${day}/${month}/${year}`
  }
  if (date && typeof date.toDate === 'function') {
    const jsDate = date.toDate(getLocalTimeZone())
    const day = String(jsDate.getDate()).padStart(2, '0')
    const month = String(jsDate.getMonth() + 1).padStart(2, '0')
    const year = jsDate.getFullYear()
    return `${day}/${month}/${year}`
  }
  return ''
}

// Set up event listeners for quick actions
onMounted(() => {
  window.addEventListener('task-updated', handleTaskUpdate)
  window.addEventListener('task-deleted', handleTaskDelete)
  window.addEventListener('open-create-task-modal', () => {
    isModalOpen.value = true
  })
  window.addEventListener('open-create-project-modal', () => {
    isCreateProjectModalOpen.value = true
  })
})

onUnmounted(() => {
  window.removeEventListener('task-updated', handleTaskUpdate)
  window.removeEventListener('task-deleted', handleTaskDelete)
  window.removeEventListener('open-create-task-modal', () => {
    isModalOpen.value = true
  })
  window.removeEventListener('open-create-project-modal', () => {
    isCreateProjectModalOpen.value = true
  })
})
</script>

<style scoped>
.modal-backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@supports not (backdrop-filter: blur(8px)) {
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.6);
  }
}
</style>