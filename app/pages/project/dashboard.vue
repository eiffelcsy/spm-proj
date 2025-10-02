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
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div 
              v-for="project in projects" 
              :key="project.id"
              class="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer flex flex-col h-full transition-all duration-300 ease-in-out hover:border-gray-300 hover:scale-[1.01]"
              @click="selectProject(project.id)"
            >
              <!-- Project Info Section -->
              <div class="flex-grow">
                <h3 class="font-semibold text-lg mb-2">{{ project.name }}</h3>
                <p class="text-gray-600 text-sm mb-3">{{ project.description }}</p>
              </div>
              
              <!-- Bottom Section - Status, Tasks, and Dates -->
              <div class="mt-auto">
                <!-- Status and Task Count -->
                <div class="flex justify-between items-center text-sm mb-2">
                  <span 
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="{
                      'bg-yellow-100 text-yellow-800': project.status === 'active',
                      'bg-green-100 text-green-800': project.status === 'completed',
                      'bg-gray-100 text-gray-800': project.status === 'archived'
                    }"
                  >
                    {{ capitalizeStatus(project.status) }}
                  </span>
                  <span class="text-gray-500">
                    {{ getProjectTaskCount(project.id) }} tasks
                  </span>
                </div>
                
                <!-- Created and Due Dates -->
                <div class="space-y-1">
                  <div class="text-xs text-gray-400">
                    <span class="inline-block w-16 text-left">Created on:</span> {{ getProjectCreatedDate(project) }}
                  </div>
                  <div class="text-xs text-gray-400">
                    <span class="inline-block w-16 text-left">Due date:</span> {{ getProjectDueDate(project) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Overdue Tasks Section -->
        <div class="mb-6">
          <div 
            v-if="overdueTasks.length > 0" 
            class="border-l-4 border-red-500 pl-4 mb-4 bg-red-50/70 p-4 rounded-r-lg"
          >
            <h3 class="text-lg font-semibold pb-2 text-red-600 flex items-center">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd" />
              </svg>
              Overdue Tasks ({{ overdueTasks.length }})
            </h3>
            <DataTable :columns="overdueColumns" :data="overdueTasks" @rowClick="goToTask"
              :hideToolbar="true" />
          </div>
        </div>

        <!-- All Tasks Section -->
        <div>
          <h3 class="text-lg font-semibold py-2 flex items-center justify-between">
            <span>
              All Tasks ({{ allTasks.length }})
            </span>
          </h3>
          <div>
            <DataTable :columns="columns" :data="allTasks" @rowClick="goToTask" :showCreateButton="true"
              :showRefreshButton="true" @create-task="openCreateModal" @refresh-tasks="fetchData" />
          </div>
        </div>
      </div>

      <CreateTaskModal :isOpen="isModalOpen" role="manager" :currentUser="'me@example.com'"
        :projectId="''" @close="isModalOpen = false" @task-created="addTask" />

      <!-- Edit Project Modal removed - editing now happens on project detail pages -->

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, FolderPlus } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { CalendarDate } from '@internationalized/date'
import { parseDate, getLocalTimeZone } from '@internationalized/date'

// Import the example data
import exampleData from '@/components/tasks/data/example.json'

const router = useRouter()

const isModalOpen = ref(false)
// Removed selectedProjectId as projects now navigate to detail pages
const isLoading = ref(false)
const error = ref<string | null>(null)

// Project creation modal state
const isCreateProjectModalOpen = ref(false)
const projectName = ref('')
const projectDescription = ref('')
const projectDueDate = ref<any>(null)
const projectStatus = ref('active')
const projectSuccessMessage = ref('')
const projectErrorMessage = ref('')
const isCreatingProject = ref(false)

// Removed project editing modal state as editing now happens on detail pages


// Initialize with empty array - will be populated with real data
const projects = ref<any[]>([])
const rawTasks = ref<any[]>([])

// Transform tasks to match expected format
function transformTask(task: any): Task {
  return {
    id: task.id,
    title: task.title,
    startDate: new Date(task.start_date),
    dueDate: new Date(task.due_date),
    project: task.project,
    status: task.status
  }
}

const allTasks = computed(() => {
  // Ensure rawTasks.value is an array before calling map
  if (!Array.isArray(rawTasks.value)) {
    return []
  }
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

// Removed filtered tasks as main dashboard now shows all tasks

function getProjectTaskCount(projectId: string): number {
  // Ensure rawTasks.value is an array before calling filter
  if (!Array.isArray(rawTasks.value)) {
    return 0
  }
  
  // Count tasks for the specified project
  
  const count = rawTasks.value.filter(task => task.project_id === parseInt(projectId)).length
  // Return task count for project
  return count
}


function selectProject(projectId: string) {
  // Navigate to project detail page
  router.push(`/project/${projectId}`)
}

// Removed selected project functions as they're no longer needed

function getProjectCreatedDate(project: any): string {
  if (!project.isRealData) {
    return 'Fake data'
  }
  return formatDate(project.createdAt)
}

function getProjectDueDate(project: any): string {
  if (!project.isRealData) {
    return 'Fake data'
  }
  if (!project.dueDate) {
    return 'No due date'
  }
  return formatDate(project.dueDate)
}

function goToTask(task: Task) {
  router.push(`/task/${task.id}?from=project`)
}

function openCreateModal() {
  isModalOpen.value = true
}

async function fetchData() {
  try {
    isLoading.value = true
    error.value = null
    
    // Fetch real tasks from Supabase
    const fetchedTasks = await $fetch('/api/tasks')
    console.log('Raw fetched tasks from API:', fetchedTasks)
    
    // Handle the API response structure { tasks: [...], count: number }
    if (fetchedTasks && Array.isArray(fetchedTasks.tasks)) {
      rawTasks.value = fetchedTasks.tasks
      console.log('Set rawTasks.value to fetchedTasks.tasks array:', fetchedTasks.tasks.length, 'tasks')
    } else if (Array.isArray(fetchedTasks)) {
      rawTasks.value = fetchedTasks
      console.log('Set rawTasks.value to fetchedTasks array:', fetchedTasks.length, 'tasks')
    } else {
      rawTasks.value = []
      console.log('Set rawTasks.value to empty array - no valid task data found')
    }
    
  } catch (err) {
    console.error('Failed to fetch tasks:', err)
    error.value = 'Failed to load tasks. Please try again.'
    rawTasks.value = []
  } finally {
    isLoading.value = false
  }
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
    projectId: 'proj-001', // Default project for tasks created from main dashboard
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
  projectStatus.value = 'active'
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

// Project editing functions
// Removed edit project modal functions as editing now happens on detail pages

// Removed handleProjectUpdated function as project editing now happens on detail pages


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

    // Add the new project to the local projects array
    if (response.project) {
      const newProject = {
        id: String(response.project.id),
        name: response.project.name,
        description: response.project.description || '',
        status: response.project.status || 'active',
        createdAt: response.project.created_at,
        dueDate: response.project.due_date || null,
        isRealData: true
      }
      projects.value.unshift(newProject)
    }

    projectSuccessMessage.value = 'Project created successfully!'
    
    // Auto-close success message after 1000ms
    setTimeout(() => {
      projectSuccessMessage.value = ''
      isCreateProjectModalOpen.value = false
    }, 1000)
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

function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

async function fetchProjects() {
  try {
    const fetchedProjects = await $fetch('/api/projects')
    console.log('Fetched projects:', fetchedProjects) // Debug log
    console.log('Number of projects:', fetchedProjects?.length) // Debug log
    
    projects.value = fetchedProjects.map((project: any) => ({
      id: String(project.id),
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'active',
      createdAt: project.created_at || new Date().toISOString(),
      dueDate: project.due_date || null,
      isRealData: true // Mark as real data from Supabase
    }))
  } catch (err) {
    console.error('Failed to fetch projects:', err)
    // If fetch fails, show empty array instead of example data
    projects.value = []
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

/* Custom animations for project cards */
.project-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.selected-project-card {
  animation: slideInFromTop 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInFromTop {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1.02);
  }
}

/* Smooth transitions for tasks section */
.tasks-section {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhanced slide-in animation */
.slide-in-from-top-2 {
  animation: slideInFromTop2 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInFromTop2 {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Smooth grid transitions */
.grid-transition {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Fade out animation for disappearing cards */
.fade-out {
  animation: fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fadeOut {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>