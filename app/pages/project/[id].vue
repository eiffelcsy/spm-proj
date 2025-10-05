<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-6xl xl:max-w-7xl">

    <!-- Back Button -->
    <div class="mb-6">
      <button 
        @click="goBack"
        class="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        Back to Projects Dashboard
      </button>
    </div>

    <div class="mb-4">
      <!-- Error message -->
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
        <button @click="fetchData" class="ml-2 underline">Try again</button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="text-gray-500">Loading project details...</div>
      </div>

      <div v-else-if="project">
        <!-- Project Header -->
        <div class="mb-8">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h1 class="text-3xl font-bold mb-2">{{ project.name }}</h1>
              <p class="text-gray-600 text-lg">{{ project.description }}</p>
            </div>
            <div v-if="isProjectOwner" class="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                class="h-8 bg-white text-black border-gray-300 hover:bg-gray-50 hover:text-black"
                @click="openEditProjectModal"
              >
                <svg class="md:mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                <span class="hidden md:block">Edit Project</span>
              </Button>
              <Button 
                variant="outline"
                size="sm"
                class="h-8 bg-white text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                @click="openDeleteProjectModal"
              >
                <svg class="md:mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span class="hidden md:block">Delete Project</span>
              </Button>
            </div>
          </div>

          <!-- Project Info Card -->
          <div class="bg-white border rounded-lg p-6 shadow-sm mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Status and Task Count -->
              <div class="flex flex-col">
                <span class="text-sm text-gray-500 mb-1">Status</span>
                <span 
                  class="px-3 py-1 rounded-full text-sm font-medium inline-block w-fit"
                  :class="{
                    'bg-yellow-100 text-yellow-800': project.status === 'active',
                    'bg-green-100 text-green-800': project.status === 'completed',
                    'bg-gray-100 text-gray-800': project.status === 'archived'
                  }"
                >
                  {{ capitalizeStatus(project.status) }}
                </span>
              </div>
              
              <div class="flex flex-col">
                <span class="text-sm text-gray-500 mb-1">Total Tasks</span>
                <span class="text-lg font-semibold">{{ getProjectTaskCount() }} tasks</span>
              </div>
              
              <div class="flex flex-col">
                <span class="text-sm text-gray-500 mb-1">Due Date</span>
                <span class="text-lg font-semibold">{{ getProjectDueDate(project) }}</span>
              </div>
            </div>
            
            <!-- Created Date -->
            <div class="mt-4 pt-4 border-t">
              <span class="text-sm text-gray-500">Created on: {{ getProjectCreatedDate(project) }}</span>
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
              Overdue Tasks ({{ filteredOverdueTasks.length }})
            </h3>
            <DataTable :columns="overdueColumns" :data="filteredOverdueTasks" @rowClick="goToTask"
              :hideToolbar="true" />
          </div>
        </div>

        <!-- All Tasks Section -->
        <div class="transition-all duration-300 ease-in-out">
          <h3 class="text-lg font-semibold py-2 flex items-center justify-between transition-all duration-200">
            <span>
              Tasks ({{ filteredTasks.length }})
            </span>
          </h3>
          <div class="transition-all duration-300 ease-in-out">
            <DataTable :columns="columns" :data="filteredTasks" @rowClick="goToTask" :showCreateButton="true"
              :showRefreshButton="true" @create-task="openCreateModal" @refresh-tasks="fetchData" />
          </div>
        </div>
      </div>

      <!-- Project Not Found -->
      <div v-else-if="!isLoading" class="text-center py-12">
        <div class="text-gray-500 text-lg">Project not found</div>
        <div class="mt-2 text-sm text-gray-400">Looking for project ID: {{ projectId }}</div>
        <button @click="goBack" class="mt-4 text-blue-600 hover:text-blue-800 underline">
          Back to Projects Dashboard
        </button>
      </div>
    </div>

    <!-- Task Creation Modal -->
    <CreateTaskModal 
      :isOpen="isModalOpen" 
      role="manager" 
      :currentUser="'me@example.com'"
      :projectId="projectId" 
      @close="isModalOpen = false" 
      @task-created="addTask" 
    />

    <!-- Edit Project Modal -->
    <EditProjectModal 
      :isOpen="isEditProjectModalOpen" 
      :project="project"
      @close="closeEditProjectModal" 
      @project-updated="handleProjectUpdated" 
    />

    <!-- Delete Project Modal -->
    <DeleteProjectModal 
      :isOpen="isDeleteProjectModalOpen" 
      :project="project"
      @close="closeDeleteProjectModal" 
      @project-deleted="handleProjectDeleted" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getLocalTimeZone } from '@internationalized/date'

definePageMeta({
  layout: 'dashboard'
})
import { columns } from '@/components/tasks/columns'
import { overdueColumns } from '@/components/tasks/overdue-columns'
import type { Task } from '@/components/tasks/data/schema'
import DataTable from '@/components/tasks/data-table.vue'
import CreateTaskModal from '~/components/task-modals/create-task-modal.vue'
import EditProjectModal from '~/components/project-modals/edit-project-modal.vue'
import DeleteProjectModal from '~/components/project-modals/delete-project-modal.vue'
import { Button } from '@/components/ui/button'

const router = useRouter()
const route = useRoute()

// Get project ID from route params
const projectId = computed(() => route.params.id as string)

const isLoading = ref(false)
const error = ref<string | null>(null)
const project = ref<any>(null)
const rawTasks = ref<any[]>([])
const currentUserStaffId = ref<number | null>(null)

// Modal states
const isModalOpen = ref(false)
const isEditProjectModalOpen = ref(false)
const isDeleteProjectModalOpen = ref(false)

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

// Filtered tasks based on selected project (excluding overdue tasks)
const filteredTasks = computed(() => {
  const tasksToFilter = nonOverdueTasks.value

  // Ensure rawTasks.value is an array
  if (!Array.isArray(rawTasks.value)) {
    return []
  }
  
  return tasksToFilter.filter(task => {
    const rawTask = rawTasks.value.find(rt => rt.id === task.id)
    return rawTask?.project_id === parseInt(projectId.value)
  })
})

// Filtered overdue tasks based on selected project
const filteredOverdueTasks = computed(() => {
  // Ensure rawTasks.value is an array
  if (!Array.isArray(rawTasks.value)) {
    return []
  }
  
  return overdueTasks.value.filter(task => {
    const rawTask = rawTasks.value.find(rt => rt.id === task.id)
    return rawTask?.project_id === parseInt(projectId.value)
  })
})

// Check if current user is the project owner
const isProjectOwner = computed(() => {
  return currentUserStaffId.value !== null && 
         project.value?.owner_id !== null && 
         currentUserStaffId.value === project.value.owner_id
})

function getProjectTaskCount(): number {
  // Ensure rawTasks.value is an array before calling filter
  if (!Array.isArray(rawTasks.value)) {
    return 0
  }
  return rawTasks.value.filter(task => task.project_id === parseInt(projectId.value)).length
}

function goBack() {
  router.push('/project/dashboard')
}

function goToTask(task: Task) {
  router.push(`/task/${task.id}?from=project&projectId=${projectId.value}`)
}

function openCreateModal() {
  isModalOpen.value = true
}

async function fetchData() {
  try {
    error.value = null
    
    // Fetch real tasks from Supabase
    const fetchedTasks = await $fetch('/api/tasks')
    
    // Handle the API response structure { tasks: [...], count: number }
    if (fetchedTasks && Array.isArray(fetchedTasks.tasks)) {
      rawTasks.value = fetchedTasks.tasks
    } else if (Array.isArray(fetchedTasks)) {
      rawTasks.value = fetchedTasks
    } else {
      rawTasks.value = []
    }
    
  } catch (err) {
    console.error('Failed to fetch tasks:', err)
    error.value = 'Failed to load tasks. Please try again.'
    rawTasks.value = []
  }
}

async function fetchCurrentUser() {
  try {
    const user = await $fetch('/api/user/me')
    currentUserStaffId.value = user.id
  } catch (err) {
    console.error('Failed to fetch current user:', err)
    currentUserStaffId.value = null
  }
}

async function fetchProject() {
  try {
    error.value = null
    
    // Fetch all projects and find the specific one
    const fetchedProjects = await $fetch('/api/projects')
    const foundProject = fetchedProjects.find((p: any) => p.id.toString() === projectId.value)
    
    if (foundProject) {
      project.value = {
        id: String(foundProject.id),
        name: foundProject.name || '',
        description: foundProject.description || '',
        status: foundProject.status || 'active',
        createdAt: foundProject.created_at || new Date().toISOString(),
        dueDate: foundProject.due_date || null,
        owner_id: foundProject.owner_id || null,
        isRealData: true
      }
    } else {
      project.value = null
    }
    
  } catch (err) {
    console.error('Failed to fetch project:', err)
    error.value = 'Failed to load project. Please try again.'
    project.value = null
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
    projectId: projectId.value,
    project: newTask.project,
    status: newTask.status,
    creator: 'me@example.com',
    assignee: 'me@example.com',
    subtasks: [],
    history: []
  })
  isModalOpen.value = false
}

function getProjectCreatedDate(project: any): string {
  if (!project?.isRealData) {
    return 'Fake data'
  }
  return formatDate(project.createdAt)
}

function getProjectDueDate(project: any): string {
  if (!project?.isRealData) {
    return 'Fake data'
  }
  if (!project.dueDate) {
    return 'No due date'
  }
  return formatDate(project.dueDate)
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

// Project editing functions
function openEditProjectModal() {
  isEditProjectModalOpen.value = true
}

function closeEditProjectModal() {
  isEditProjectModalOpen.value = false
}

// Project deletion functions
function openDeleteProjectModal() {
  isDeleteProjectModalOpen.value = true
}

function closeDeleteProjectModal() {
  isDeleteProjectModalOpen.value = false
}

async function handleProjectDeleted() {
  // Close modal first
  closeDeleteProjectModal()
  
  // Redirect to projects dashboard
  router.push('/project/dashboard')
}

function handleProjectUpdated(updatedProject: any) {
  // Update the project data
  project.value = {
    ...project.value,
    name: updatedProject.name,
    description: updatedProject.description,
    dueDate: updatedProject.due_date,
    status: updatedProject.status
  }
  
  // Don't close modal immediately - let it close after success message timeout
}

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([fetchData(), fetchProject(), fetchCurrentUser()])
  } finally {
    isLoading.value = false
  }
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
