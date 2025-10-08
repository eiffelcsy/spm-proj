<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-5xl xl:max-w-7xl space-y-8">
    <!-- Header Section -->
    <div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div class="space-y-1">
        <h1 class="text-3xl font-bold tracking-tight">Projects Dashboard</h1>
      </div>
      <div class="flex items-center space-x-2">
        <Input v-model="searchQuery" placeholder="Search projects" />
        <Button size="sm" @click="openCreateProjectModal">
          <Plus class="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <div class="text-gray-500">Loading projects...</div>
    </div>

    <!-- Projects Grid -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-end">
        <div class="flex items-center space-x-2">
          <Button variant="ghost" size="sm" @click="viewMode = 'grid'" :class="{ 'bg-accent': viewMode === 'grid' }">
            <LayoutGrid class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" @click="viewMode = 'list'" :class="{ 'bg-accent': viewMode === 'list' }">
            <List class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card 
          v-for="project in filteredProjects" 
          :key="project.id"
          class="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
          @click="selectProject(project.id)"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <CardTitle>{{ project.name }}</CardTitle>
              </div>
              <Badge :variant="getStatusVariant(project.status)" class="ml-2">
                {{ capitalizeStatus(project.status) }}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent class="space-y-4">
            <!-- Progress indicator -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Progress</span>
                <span class="font-medium">{{ getProjectProgress(project) }}%</span>
              </div>
              <Progress :model-value="getProjectProgress(project)" />
            </div>

            <!-- Task count -->
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center space-x-2 text-muted-foreground">
                <ListTodo class="h-4 w-4" />
                <span>{{ getProjectTaskCount(project.id) }} tasks</span>
              </div>
              <div class="flex items-center space-x-2 text-muted-foreground">
                <Calendar class="h-4 w-4" />
                <span>{{ formatDateShort(project.dueDate) }}</span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter v-if="project.dueDate" class="pt-0">
            <div class="flex items-center justify-between w-full text-xs text-muted-foreground">
              <span>Due {{ formatDateShort(project.dueDate) }}</span>
              <Badge v-if="isOverdue(project.dueDate)" variant="destructive" class="text-xs px-1">
                Overdue
              </Badge>
            </div>
          </CardFooter>
        </Card>
      </div>

      <!-- List View -->
      <div v-else class="space-y-2">
        <Card 
          v-for="project in filteredProjects" 
          :key="project.id"
          class="cursor-pointer transition-all duration-200 hover:shadow-md"
          @click="selectProject(project.id)"
        >
          <CardContent class="py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 flex-1">
                <div class="flex-1 space-y-1">
                  <div class="flex items-center space-x-2">
                    <h3 class="font-semibold">{{ project.name }}</h3>
                    <Badge :variant="getStatusVariant(project.status)">
                      {{ capitalizeStatus(project.status) }}
                    </Badge>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ project.description }}</p>
                </div>
                
                <div class="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div class="flex items-center space-x-1">
                    <ListTodo class="h-4 w-4" />
                    <span>{{ getProjectTaskCount(project.id) }}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <Calendar class="h-4 w-4" />
                    <span>{{ formatDateShort(project.dueDate) }}</span>
                  </div>
                  <div class="w-24">
                    <div class="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{{ getProjectProgress(project) }}%</span>
                    </div>
                    <Progress :model-value="getProjectProgress(project)" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <CreateTaskModal 
      :isOpen="isModalOpen" 
      role="manager" 
      :currentUser="currentUserStaffId ? String(currentUserStaffId) : undefined"
      @close="isModalOpen = false" 
      @task-created="addTask" 
    />

    <CreateProjectModal
      :isOpen="isCreateProjectModalOpen"
      @close="isCreateProjectModalOpen = false"
      @project-created="handleProjectCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { CreateTaskModal } from '@/components/task-modals/create-task'
import { CreateProjectModal } from '@/components/project-modals/create-project'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  ListTodo, 
  LayoutGrid, 
  List, 
  Calendar 
} from 'lucide-vue-next'
import type { Task } from '@/components/tasks-table/data/schema'

definePageMeta({
  layout: 'with-sidebar'
})

// ============================================================================
// ROUTING
// ============================================================================

const router = useRouter()

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const isModalOpen = ref(false)
const isLoading = ref(false)
const error = ref<string | null>(null)
const isCreateProjectModalOpen = ref(false)
const currentUserStaffId = ref<number | null>(null)
const viewMode = ref<'grid' | 'list'>('grid')
const searchQuery = ref('')

// Initialize with empty array - will be populated with real data
const projects = ref<any[]>([])
const rawTasks = ref<any[]>([])

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchCurrentUser() {
  try {
    const user = await $fetch('/api/user/me')
    currentUserStaffId.value = user.id
  } catch (err) {
    console.error('Failed to fetch current user:', err)
    currentUserStaffId.value = null
  }
}

async function fetchProjects() {
  try {
    const fetchedProjects = await $fetch('/api/projects')
    
    projects.value = fetchedProjects.map((project: any) => ({
      id: String(project.id),
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'active',
      createdAt: project.created_at || new Date().toISOString(),
      dueDate: project.due_date || null,
      isRealData: true
    }))
  } catch (err) {
    console.error('Failed to fetch projects:', err)
    projects.value = []
  }
}

async function fetchTasksForProjects() {
  try {
    // Fetch tasks for each project
    const allTasks: any[] = []
    
    for (const project of projects.value) {
      try {
        const response = await $fetch('/api/tasks/by-project', {
          params: { project_id: project.id }
        })
        
        if (response && response.tasks) {
          allTasks.push(...response.tasks)
        }
      } catch (err) {
        console.error(`Failed to fetch tasks for project ${project.id}:`, err)
        // Continue with other projects even if one fails
      }
    }
    
    rawTasks.value = allTasks
  } catch (err) {
    console.error('Failed to fetch tasks:', err)
    rawTasks.value = []
  }
}


// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Transform raw task data to match Task schema
 */
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

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

const filteredProjects = computed(() => {
  if (!searchQuery.value.trim()) {
    return projects.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter(project => 
    project.name.toLowerCase().includes(query) ||
    (project.description && project.description.toLowerCase().includes(query))
  )
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getProjectTaskCount(projectId: string): number {
  // Ensure rawTasks.value is an array before calling filter
  if (!Array.isArray(rawTasks.value)) {
    return 0
  }
  
  // Count tasks for the specified project
  // Compare both as numbers to ensure proper matching
  const projectIdNum = parseInt(projectId, 10)
  const count = rawTasks.value.filter(task => {
    const taskProjectId = typeof task.project_id === 'number' ? task.project_id : parseInt(task.project_id, 10)
    return taskProjectId === projectIdNum
  }).length
  
  return count
}


function capitalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default'
    case 'completed':
      return 'secondary'
    case 'archived':
      return 'outline'
    default:
      return 'default'
  }
}

function getProjectProgress(project: any): number {
  const taskCount = getProjectTaskCount(project.id)
  if (taskCount === 0) return 0
  
  // Count completed tasks for this project
  const projectIdNum = parseInt(project.id, 10)
  const completedTasks = Array.isArray(rawTasks.value) 
    ? rawTasks.value.filter(task => {
        const taskProjectId = typeof task.project_id === 'number' ? task.project_id : parseInt(task.project_id, 10)
        return taskProjectId === projectIdNum && task.status === 'completed'
      }).length
    : 0
  
  return Math.round((completedTasks / taskCount) * 100)
}

function formatDateShort(dateString: string | null): string {
  if (!dateString) {
    return 'No due date'
  }
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

function isOverdue(dueDateString: string | null): boolean {
  if (!dueDateString) return false
  
  const dueDate = new Date(dueDateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

function selectProject(projectId: string) {
  // Navigate to project detail page
  router.push(`/project/${projectId}`)
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

function openCreateProjectModal() {
  isCreateProjectModalOpen.value = true
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

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

async function handleProjectCreated(project: any) {
  isCreateProjectModalOpen.value = false
  // Add the new project to the local projects array
  if (project) {
    const newProject = {
      id: String(project.id),
      name: project.name,
      description: project.description || '',
      status: project.status || 'active',
      createdAt: project.created_at,
      dueDate: project.due_date || null,
      isRealData: true
    }
    projects.value.unshift(newProject)
    
    // Fetch tasks for the new project
    try {
      const response = await $fetch('/api/tasks/by-project', {
        params: { project_id: project.id }
      })
      
      if (response && response.tasks) {
        rawTasks.value.push(...response.tasks)
      }
    } catch (err) {
      console.error(`Failed to fetch tasks for new project ${project.id}:`, err)
    }
  }
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

onMounted(async () => {
  isLoading.value = true
  try {
    // First fetch user and projects
    await Promise.all([
      fetchCurrentUser(),
      fetchProjects()
    ])
    
    // Then fetch tasks for the projects (needs projects to be loaded first)
    await fetchTasksForProjects()
  } finally {
    isLoading.value = false
  }
  
  // Listen for task quick actions
  window.addEventListener('task-updated', fetchTasksForProjects)
  window.addEventListener('task-deleted', fetchTasksForProjects)
  
  // Listen for sidebar events
  window.addEventListener('open-create-task-modal', () => {
    isModalOpen.value = true
  })
  window.addEventListener('open-create-project-modal', () => {
    isCreateProjectModalOpen.value = true
  })
})

onUnmounted(() => {
  window.removeEventListener('task-updated', fetchTasksForProjects)
  window.removeEventListener('task-deleted', fetchTasksForProjects)
  window.removeEventListener('open-create-task-modal', () => {
    isModalOpen.value = true
  })
  window.removeEventListener('open-create-project-modal', () => {
    isCreateProjectModalOpen.value = true
  })
})
</script>