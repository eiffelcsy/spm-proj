<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-5xl xl:max-w-7xl">
    <h1 class="text-3xl font-bold mb-6">Project Dashboard</h1>

    <div class="mb-4">
      <!-- Error message -->
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
        <button @click="fetchData" class="ml-2 underline">Try again</button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="text-gray-500">Loading projects and tasks...</div>
      </div>

      <div v-else>
        <!-- Projects Overview Section -->
        <div class="mb-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-semibold">Projects Overview</h2>
            <div class="flex gap-2">
              <!-- Clear filter button - always rendered to prevent layout shift -->
              <button 
                :class="[
                  'px-4 py-2 text-sm rounded-md transition-all duration-200',
                  selectedProjectId 
                    ? 'bg-gray-100 hover:bg-gray-200 opacity-100' 
                    : 'opacity-0 pointer-events-none'
                ]"
                @click="clearProjectFilter"
              >
                Show All Projects
              </button>
              <!-- Create Project Button -->
              <Button 
                variant="default"
                size="sm"
                class="h-8"
                @click="openCreateProjectModal"
              >
                <FolderPlus class="md:mr-2 h-4 w-4" />
                <span class="hidden md:block">Create New Project</span>
              </Button>
              
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div v-for="project in projects" :key="project.id"
              class="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer" :class="{
                'ring-2 ring-blue-500 bg-blue-50 scale-[1.02]': selectedProjectId === project.id,
                'hover:border-gray-300 hover:scale-[1.01]': selectedProjectId !== project.id
              }" @click="selectProject(project.id)">
              <h3 class="font-semibold text-lg mb-2">{{ project.name }}</h3>
              <p class="text-gray-600 text-sm mb-3">{{ project.description }}</p>
              <div class="flex justify-between items-center text-sm">
                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {{ project.status }}
                </span>
                <span class="text-gray-500">
                  {{ getProjectTaskCount(project.id) }} tasks
                </span>
              </div>
              <div class="text-xs text-gray-400 mt-2">
                Created: {{ formatDate(project.createdAt) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Overdue Tasks Section -->
        <div class="mb-6 transition-all duration-300 ease-in-out">
          <div 
            v-if="filteredOverdueTasks.length > 0" 
            class="border-l-4 border-red-500 pl-4 mb-4 bg-red-50/70 p-4 rounded-r-lg animate-in slide-in-from-top-2 duration-300"
          >
            <h3 class="text-lg font-semibold pb-2 text-red-600 flex items-center">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd" />
              </svg>
              Overdue Tasks
              <span v-if="selectedProjectId" class="ml-2 text-sm font-normal">
                ({{ getSelectedProjectName() }})
              </span>
              ({{ filteredOverdueTasks.length }})
            </h3>
            <DataTable :columns="overdueColumns" :data="filteredOverdueTasks" @rowClick="goToTask"
              :hideToolbar="true" />
          </div>
        </div>

        <!-- All Tasks Section -->
        <div class="transition-all duration-300 ease-in-out">
          <h3 class="text-lg font-semibold py-2 flex items-center justify-between transition-all duration-200">
            <span>
              {{ selectedProjectId ? `${getSelectedProjectName()} Tasks` : 'All Tasks' }}
              ({{ filteredTasks.length }})
            </span>
          </h3>
          <div class="transition-all duration-300 ease-in-out">
            <DataTable :columns="columns" :data="filteredTasks" @rowClick="goToTask" :showCreateButton="true"
              :showRefreshButton="true" @create-task="openCreateModal" @refresh-tasks="fetchData" />
          </div>
        </div>
      </div>

      <CreateTaskModal :isOpen="isModalOpen" role="manager" :currentUser="'me@example.com'"
        :projectId="selectedProjectId" @close="isModalOpen = false" @task-created="addTask" />

      <!-- Create Project Modal -->
      <div v-if="isCreateProjectModalOpen"
        class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" @click="$emit('close')">

        <!-- Modal content -->
        <div class="relative bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 overflow-y-auto z-10" @click.stop>
          <h2 class="text-xl font-semibold mb-4">Create New Project</h2>

          <!-- Feedback Messages -->
          <div v-if="projectSuccessMessage" class="mb-4 p-3 rounded bg-green-100 text-green-700">
            <span>{{ projectSuccessMessage }}</span>
            <Button variant="outline" @click="handleProjectSuccessOk" class="ml-4">OK</Button>
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

            <div class="flex justify-end gap-2">
              <Button variant="outline" @click="closeCreateProjectModal">
                Cancel
              </Button>
              <Button type="submit" :disabled="isCreatingProject">
                {{ isCreatingProject ? 'Creating...' : 'Create Project' }}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { columns } from '@/components/tasks/columns'
import { overdueColumns } from '@/components/tasks/overdue-columns'
import type { Task } from '@/components/tasks/data/schema'
import DataTable from '@/components/tasks/data-table.vue'
import CreateTaskModal from '~/components/task-modals/create-task-modal.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, FolderPlus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { CalendarDate } from '@internationalized/date'
import { parseDate, getLocalTimeZone } from '@internationalized/date'

// Import the example data
import exampleData from '@/components/tasks/data/example.json'

const router = useRouter()

const isModalOpen = ref(false)
const selectedProjectId = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

// Project creation modal state
const isCreateProjectModalOpen = ref(false)
const projectName = ref('')
const projectDescription = ref('')
const projectDueDate = ref<any>(null)
const projectSuccessMessage = ref('')
const projectErrorMessage = ref('')
const isCreatingProject = ref(false)

// Use the example data
const projects = ref(exampleData.projects)
const rawTasks = ref(exampleData.tasks)

// Transform tasks to match expected format
function transformTask(task: any): Task {
  return {
    id: task.id,
    title: task.title,
    startDate: new Date(task.startDate),
    dueDate: new Date(task.dueDate),
    project: task.project,
    status: task.status
  }
}

const allTasks = computed(() => {
  return rawTasks.value.map(transformTask)
})

// Helper function to check if a task is overdue
function isTaskOverdue(task: Task): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(task.dueDate)
  dueDate.setHours(0, 0, 0, 0)

  return dueDate < today && task.status !== 'completed'
}

const overdueTasks = computed(() => {
  return allTasks.value.filter(task => isTaskOverdue(task))
})

// Non-overdue tasks (for the "All Tasks" section)
const nonOverdueTasks = computed(() => {
  return allTasks.value.filter(task => !isTaskOverdue(task))
})

// Filtered tasks based on selected project (excluding overdue tasks)
const filteredTasks = computed(() => {
  const tasksToFilter = nonOverdueTasks.value

  if (!selectedProjectId.value) {
    return tasksToFilter
  }
  return tasksToFilter.filter(task => {
    const rawTask = rawTasks.value.find(rt => rt.id === task.id)
    return rawTask?.projectId === selectedProjectId.value
  })
})

// Filtered overdue tasks based on selected project
const filteredOverdueTasks = computed(() => {
  if (!selectedProjectId.value) {
    return overdueTasks.value
  }
  return overdueTasks.value.filter(task => {
    const rawTask = rawTasks.value.find(rt => rt.id === task.id)
    return rawTask?.projectId === selectedProjectId.value
  })
})

function getProjectTaskCount(projectId: string): number {
  return rawTasks.value.filter(task => task.projectId === projectId).length
}


function selectProject(projectId: string) {
  // Toggle selection - if same project clicked, deselect it
  selectedProjectId.value = selectedProjectId.value === projectId ? '' : projectId
}

function clearProjectFilter() {
  selectedProjectId.value = ''
}

function getSelectedProjectName(): string {
  if (!selectedProjectId.value) return ''
  const project = projects.value.find(p => p.id === selectedProjectId.value)
  return project?.name || ''
}

function goToTask(task: Task) {
  router.push(`/task/${task.id}?from=project`)
}

function openCreateModal() {
  isModalOpen.value = true
}

function fetchData() {
  isLoading.value = false
  error.value = null
}

async function addTask(newTask: Task) {
  const startDateStr = newTask.startDate.toISOString().split('T')[0]!
  const dueDateStr = newTask.dueDate.toISOString().split('T')[0]!
  
  rawTasks.value.push({
    id: String(rawTasks.value.length + 1),
    title: newTask.title,
    description: '',
    notes: '',
    startDate: startDateStr,
    dueDate: dueDateStr,
    projectId: selectedProjectId.value || 'proj-001',
    project: newTask.project,
    status: newTask.status,
    creator: 'me@example.com',
    assignee: 'me@example.com',
    subtasks: [],
    history: []
  })
  isModalOpen.value = false
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
  projectSuccessMessage.value = ''
  projectErrorMessage.value = ''
  isCreatingProject.value = false
}

function handleProjectSuccessOk() {
  resetProjectForm()
  isCreateProjectModalOpen.value = false
  // Refresh projects list
  fetchProjects()
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
      due_date: projectDueDate.value ? projectDueDate.value.toString() : null
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
    return new Date(date).toLocaleDateString()
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

async function fetchProjects() {
  try {
    const fetchedProjects = await $fetch('/api/projects')
    projects.value = fetchedProjects.map((project: any) => ({
      id: String(project.id),
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'active',
      createdAt: project.created_at || new Date().toISOString()
    }))
  } catch (err) {
    console.error('Failed to fetch projects:', err)
  }
}

onMounted(() => {
  fetchData()
  fetchProjects()
})
</script>

<style scoped>
.modal-backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  /* Safari support */
}

/* Fallback for browsers that don't support backdrop-filter */
@supports not (backdrop-filter: blur(8px)) {
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.6);
  }
}
</style>