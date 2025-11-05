<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-5xl xl:max-w-7xl space-y-8">
    <!-- Header Section -->
    <div class="flex flex-col space-y-4">
      <div class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div class="space-y-1">
          <h1 class="text-3xl font-bold tracking-tight">Project Dashboard</h1>
        </div>
        <div class="flex items-center space-x-2">
          <Input v-model="searchQuery" placeholder="Search projects" class="w-full md:w-64" />
          <Button 
            size="sm" 
            @click="isManager ? openCreateProjectModal() : null"
            :disabled="!isManager"
            :class="!isManager ? 'cursor-not-allowed opacity-50' : ''"
            :title="!isManager ? 'Only managers can create projects' : ''"
          >
            <Plus class="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <!-- Filters and Sort -->
      <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div class="flex flex-wrap gap-2">
          <!-- Status Filter -->
          <Select v-model="selectedStatus">
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <!-- Tag Filter -->
          <Select v-model="selectedTag">
            <SelectTrigger class="w-[180px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem v-for="tag in availableTags" :key="tag" :value="tag">
                {{ tag }}
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- Clear Filters Button -->
          <Button 
            v-if="selectedStatus !== 'all' || selectedTag !== 'all'"
            variant="ghost" 
            size="sm" 
            @click="clearFilters"
          >
            Clear Filters
          </Button>
        </div>

        <!-- Sort Dropdown -->
        <div class="flex items-center space-x-2">
          <Select v-model="sortBy">
            <SelectTrigger class="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="created-desc">Newest First</SelectItem>
              <SelectItem value="created-asc">Oldest First</SelectItem>
              <SelectItem value="deadline-asc">Deadline (Earliest)</SelectItem>
              <SelectItem value="deadline-desc">Deadline (Latest)</SelectItem>
              <SelectItem value="tasks-desc">Most Tasks</SelectItem>
              <SelectItem value="tasks-asc">Fewest Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-8">
      <div class="text-gray-500">Loading projects...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredProjects.length === 0" class="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div class="rounded-full bg-muted p-6 mb-4">
        <LayoutGrid class="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 class="text-xl font-semibold mb-2">
        {{ projects.length === 0 ? 'No projects yet' : 'No projects found' }}
      </h3>
      <p class="text-muted-foreground mb-6 max-w-md">
        {{ projects.length === 0 
          ? 'Get started by creating your first project to organize your tasks and collaborate with your team.'
          : 'Try adjusting your filters or search query to find what you\'re looking for.'
        }}
      </p>
      <div class="flex gap-2">
        <Button 
          v-if="projects.length === 0 && isManager"
          @click="openCreateProjectModal()"
        >
          <Plus class="mr-2 h-4 w-4" />
          Create Your First Project
        </Button>
        <Button 
          v-if="projects.length > 0"
          variant="outline"
          @click="clearFilters"
        >
          Clear Filters
        </Button>
      </div>
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
          <div class="flex items-start justify-between mb-2">
            <CardTitle class="flex-1">{{ project.name }}</CardTitle>
            <Badge :variant="getStatusVariant(project.status)"  class="text-xs">
              {{ capitalizeStatus(project.status) }}
            </Badge>
          </div>

  
          <!-- Tags -->
          <div v-if="project.tags && project.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
            <Badge 
              v-for="tag in project.tags.slice(0, 3)" 
              :key="tag"
              variant="outline"
              class="text-xs"
            >
              {{ tag }}
            </Badge>
            <Badge 
              v-if="project.tags.length > 3"
              variant="outline"
              class="text-xs"
            >
              +{{ project.tags.length - 3 }}
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

            <!-- Assigned Users -->
            <div v-if="project.assigned_user_ids && project.assigned_user_ids.length > 0" class="flex items-center space-x-2 text-sm">
              <Users class="h-4 w-4 text-muted-foreground" />
              <span class="text-muted-foreground">{{ project.assigned_user_ids.length }} assigned</span>
            </div>
          </CardContent>
          
          <CardFooter v-if="project.dueDate" class="pt-0">
            <div class="flex items-center justify-between w-full text-xs text-muted-foreground">
              <span>Due {{ formatDateShort(project.dueDate) }}</span>
              <Badge v-if="isOverdue(project.dueDate)" variant="destructive" class="text-xs px-1">
                Overdue
              </Badge>
              <Badge 
              v-if="project.priority"
              :variant="getPriorityVariant(project.priority)" 
              class="text-xs"
            >
              {{ project.priority.toUpperCase() }}
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
                    
                    <!-- Priority Badge -->
                    <Badge 
                      v-if="project.priority"
                      :variant="getPriorityVariant(project.priority)" 
                      class="text-xs"
                    >
                      {{ project.priority.toUpperCase() }}
                    </Badge>
                    
                    <Badge :variant="getStatusVariant(project.status)">
                      {{ capitalizeStatus(project.status) }}
                    </Badge>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ project.description }}</p>

                  <!-- Tags -->
                  <div v-if="project.tags && project.tags.length > 0" class="flex flex-wrap gap-1">
                    <Badge 
                      v-for="tag in project.tags" 
                      :key="tag"
                      variant="outline"
                      class="text-xs"
                    >
                      {{ tag }}
                    </Badge>
                  </div>
                </div>
                
                <div class="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div class="flex items-center space-x-1">
                    <ListTodo class="h-4 w-4" />
                    <span>{{ getProjectTaskCount(project.id) }}</span>
                  </div>
                  <div v-if="project.assigned_user_ids && project.assigned_user_ids.length > 0" class="flex items-center space-x-1">
                    <Users class="h-4 w-4" />
                    <span>{{ project.assigned_user_ids.length }}</span>
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
import { useRouter, useRoute } from 'vue-router'
import { CreateTaskModal } from '@/components/task-modals/create-task'
import { CreateProjectModal } from '@/components/project-modals/create-project'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  ListTodo, 
  LayoutGrid, 
  List, 
  Calendar 
} from 'lucide-vue-next'
import type { Task } from '@/components/tasks-table/data/schema'
import { Users } from 'lucide-vue-next'

definePageMeta({
  layout: 'with-sidebar'
})

// ============================================================================
// ROUTING
// ============================================================================

const router = useRouter()
const route = useRoute()

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

// Filter and sort state
const selectedStatus = ref<string>('all')
const selectedTag = ref<string>('all')
const sortBy = ref<string>('created-desc')

// Initialize with empty array - will be populated with real data
const projects = ref<any[]>([])
const rawTasks = ref<any[]>([])

// ============================================================================
// DATA FETCHING
// ============================================================================

const currentUserIsManager = ref<boolean>(false)

async function fetchCurrentUser() {
  try {
    const user = await $fetch('/api/user/me')
    currentUserStaffId.value = user.id
    currentUserIsManager.value = !!user.isManager
  } catch (err) {
    console.error('Failed to fetch current user:', err)
    currentUserStaffId.value = null
  }
}

const isManager = computed(() => currentUserIsManager.value)

async function fetchProjects() {
  try {
    const fetchedProjects = await $fetch('/api/projects')
    
    projects.value = fetchedProjects.map((project: any) => ({
      id: String(project.id),
      name: project.name || '',
      description: project.description || '',
      priority: project.priority || 'medium',
      status: project.status || 'todo',
      createdAt: project.created_at || new Date().toISOString(),
      dueDate: project.due_date || null,
      tags: Array.isArray(project.tags) ? project.tags : [],
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
    project_id: task.project_id || task.project?.id || null,
    status: task.status,
    notes: task.notes,
    priority: typeof task.priority === 'string' ? parseInt(task.priority, 10) : task.priority,
    tags: task.tags || [],
    assignees: task.assignees?.map((a: any) => ({
      id: a.assigned_to?.id || a.id,
      fullname: a.assigned_to?.fullname || a.fullname
    }))
  }
}

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

/**
 * Get all unique tags from all projects
 */
const availableTags = computed(() => {
  const tagsSet = new Set<string>()
  projects.value.forEach(project => {
    if (Array.isArray(project.tags)) {
      project.tags.forEach((tag: string) => tagsSet.add(tag))
    }
  })
  return Array.from(tagsSet).sort()
})

/**
 * Filter and sort projects based on search query, status, and tags
 */
const filteredProjects = computed(() => {
  let filtered = projects.value

  // Apply search query filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(project => 
      project.name.toLowerCase().includes(query) ||
      (project.description && project.description.toLowerCase().includes(query))
    )
  }

  // Apply status filter
  if (selectedStatus.value !== 'all') {
    filtered = filtered.filter(project => project.status === selectedStatus.value)
  }

  // Apply tag filter
  if (selectedTag.value !== 'all') {
    filtered = filtered.filter(project => 
      Array.isArray(project.tags) && project.tags.includes(selectedTag.value)
    )
  }

  // Apply sorting
  const sorted = [...filtered]
  
  switch (sortBy.value) {
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'created-asc':
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
    case 'created-desc':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'deadline-asc':
      sorted.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      break
    case 'deadline-desc':
      sorted.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      })
      break
    case 'tasks-asc':
      sorted.sort((a, b) => getProjectTaskCount(a.id) - getProjectTaskCount(b.id))
      break
    case 'tasks-desc':
      sorted.sort((a, b) => getProjectTaskCount(b.id) - getProjectTaskCount(a.id))
      break
  }

  return sorted
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
  if (status === 'in-progress') return 'In Progress'
  if (status === 'todo') return 'To Do'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'todo':
      return 'outline'
    case 'in-progress':
      return 'default'
    case 'completed':
      return 'secondary'
    case 'blocked':
      return 'destructive'
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

function getPriorityVariant(priority: string) {
  switch (priority) {
    case 'high':
      return 'destructive'
    case 'medium':
      return 'default'
    case 'low':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Clear all filters and reset to default view
 */
function clearFilters() {
  selectedStatus.value = 'all'
  selectedTag.value = 'all'
  searchQuery.value = ''
}

function handleProjectUpdatedEvent(e: CustomEvent) {
  const updated = e.detail
  const idx = projects.value.findIndex(p => p.id === String(updated.id))
  if (idx !== -1) {
    projects.value[idx] = {
      ...projects.value[idx],
      name: updated.name || projects.value[idx].name,
      description: updated.description ?? projects.value[idx].description,
      priority: updated.priority ?? projects.value[idx].priority,
      status: updated.status ?? projects.value[idx].status,
      dueDate: updated.due_date ?? projects.value[idx].dueDate,
      tags: Array.isArray(updated.tags) ? updated.tags : projects.value[idx].tags
    }
  }
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
  
  // Check if we were redirected here to open the create project modal
  if (route.query.openCreateProject === 'true') {
    isCreateProjectModalOpen.value = true
    // Clean up the query parameter
    router.replace({ query: { ...route.query, openCreateProject: undefined } })
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

  // Listen for project updates
  window.addEventListener('project-updated', handleProjectUpdatedEvent as EventListener)
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
  window.removeEventListener('project-updated', handleProjectUpdatedEvent as EventListener)
})
</script>