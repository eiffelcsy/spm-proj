<template>
    <div class="w-full mx-auto p-8 md:px-12 lg:max-w-7xl xl:max-w-full">
        <!-- Error message -->
        <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ error }}
            <button @click="fetchData" class="ml-2 underline">Try again</button>
        </div>

        <!-- Loading state -->
        <div v-if="isLoading" class="flex justify-center items-center py-8">
            <div class="text-muted-foreground">Loading timeline...</div>
        </div>

        <!-- Timeline Content -->
        <div v-else-if="project">
            <!-- Project Header -->
            <div class="mb-8">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h1 class="text-3xl font-bold mb-2">{{ project.name }} - Timeline</h1>
                        <p class="text-muted-foreground text-lg">{{ project.description }}</p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" size="sm"
                            class="h-8 bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            @click="goToProjectView">
                            <svg class="md:mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2">
                                </path>
                            </svg>
                            <span class="hidden md:block">Project View</span>
                        </Button>
                        <Button variant="outline" size="sm"
                            class="h-8 bg-white text-black hover:bg-muted hover:text-black"
                            style="border-color: var(--border)" @click="goToProjectsDashboard">
                            <svg class="md:mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            <span class="hidden md:block">All Projects</span>
                        </Button>
                    </div>
                </div>

                <!-- Project Info Card -->
                <div class="bg-white border rounded-lg p-6 shadow-sm mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <!-- Priority -->
                        <div class="flex flex-col">
                            <span class="text-sm text-muted-foreground mb-1">Priority</span>
                            <span class="text-lg font-semibold">{{ project.priority ? project.priority.toUpperCase() :
                                'MEDIUM' }}</span>
                        </div>

                        <!-- Status -->
                        <div class="flex flex-col">
                            <span class="text-sm text-muted-foreground mb-1">Status</span>
                            <span class="text-lg font-semibold">{{ capitalizeStatus(project.status) }}</span>
                        </div>

                        <div class="flex flex-col">
                            <span class="text-sm text-muted-foreground mb-1">Total Tasks</span>
                            <span class="text-lg font-semibold">{{ getProjectTaskCount() }} tasks</span>
                        </div>

                        <div class="flex flex-col">
                            <span class="text-sm text-muted-foreground mb-1">Due Date</span>
                            <span class="text-lg font-semibold">{{ getProjectDueDate(project) }}</span>
                        </div>
                    </div>

                    <!-- Tags Row -->
                    <div v-if="project.tags && project.tags.length > 0" class="mt-4 pt-4 border-t">
                        <span class="text-sm text-muted-foreground mb-2 block">Tags:</span>
                        <div class="flex flex-wrap gap-2">
                            <Badge v-for="tag in project.tags" :key="tag" variant="outline" class="text-xs">
                                {{ tag }}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Calendar Component -->
            <div class="bg-white rounded-lg shadow-sm border p-4">
                <FullCalendar ref="calendarRef" :options="calendarOptions" />
            </div>

            <!-- Task Details Modal -->
            <Teleport to="body">
                <Transition
                    enter-active-class="transition ease-out duration-200"
                    enter-from-class="opacity-0"
                    enter-to-class="opacity-100"
                    leave-active-class="transition ease-in duration-150"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                >
                    <div v-if="taskDetailsDialogOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9998] p-4" @click="taskDetailsDialogOpen = false">
                        <Transition
                            enter-active-class="transition ease-out duration-200"
                            enter-from-class="opacity-0 scale-95"
                            enter-to-class="opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-150"
                            leave-from-class="opacity-100 scale-100"
                            leave-to-class="opacity-0 scale-95"
                        >
                            <div v-if="taskDetailsDialogOpen" class="bg-white rounded-xl shadow-2xl max-w-2xl w-full min-h-[400px] max-h-[90vh] overflow-hidden flex flex-col" @click.stop>
                                <!-- Header -->
                                <div class="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-1">
                                            <div class="flex items-center gap-3 mb-1">
                                                <h2 class="text-2xl font-bold text-gray-900">{{ taskDetailsDialogTask?.title || 'Task Details' }}</h2>
                                                <Badge v-if="taskDetailsDialogTask?.due_date && new Date(taskDetailsDialogTask.due_date) < new Date() && taskDetailsDialogTask?.status !== 'completed' && taskDetailsDialogTask?.status !== 'blocked'" class="text-xs px-2 py-1 bg-red-600 text-white">
                                                    OVERDUE
                                                </Badge>
                                            </div>
                                        </div>
                                        <button @click="taskDetailsDialogOpen = false" class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <!-- Content -->
                                <div v-if="taskDetailsDialogTask" class="px-6 py-4 space-y-6 overflow-y-auto flex-1">
                                    <!-- Status & Priority Row -->
                                    <div class="grid grid-cols-2 gap-6">
                                        <div>
                                            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                                            <div class="flex items-center gap-2">
                                                <Badge :style="{ backgroundColor: getStatusColor(taskDetailsDialogTask.status), color: 'white' }" class="text-sm px-3 py-1">
                                                    {{ capitalizeStatus(taskDetailsDialogTask.status) }}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priority</p>
                                            <p class="text-base font-medium text-gray-900">{{ taskDetailsDialogTask.priority ? String(taskDetailsDialogTask.priority).toUpperCase() : 'MEDIUM' }}</p>
                                        </div>
                                    </div>

                                    <!-- Dates Row -->
                                    <div class="grid grid-cols-2 gap-6">
                                        <div>
                                            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start Date</p>
                                            <p class="text-base text-gray-900 flex items-center gap-2">
                                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                </svg>
                                                {{ taskDetailsDialogTask.start_date ? formatDate(taskDetailsDialogTask.start_date) : 'Not set' }}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Due Date</p>
                                            <p class="text-base text-gray-900 flex items-center gap-2">
                                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                </svg>
                                                {{ taskDetailsDialogTask.due_date ? formatDate(taskDetailsDialogTask.due_date) : 'Not set' }}
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Notes -->
                                    <div v-if="taskDetailsDialogTask.notes" class="bg-gray-50 rounded-lg p-4">
                                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                                        <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ taskDetailsDialogTask.notes }}</p>
                                    </div>
                                    <div v-else class="bg-gray-50 rounded-lg p-4 text-center">
                                        <p class="text-sm text-gray-400 italic">No notes available</p>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div class="px-6 py-4 bg-gray-50 border-t flex gap-3 justify-end">
                                    <Button @click="goToTaskDetails(taskDetailsDialogTask?.id)" variant="default" class="px-4 bg-blue-600 hover:bg-blue-700">
                                        View Full Details →
                                    </Button>
                                </div>
                            </div>
                        </Transition>
                    </div>
                </Transition>
            </Teleport>


            <!-- Hover Tooltip -->
            <Transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
            >
                <div
                    v-if="hoverTooltip.visible"
                    class="fixed bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-w-sm pointer-events-none"
                    :style="{ 
                        left: `${hoverTooltip.x}px`, 
                        top: `${hoverTooltip.y}px`,
                        zIndex: 9999
                    }"
                >
                    <div class="space-y-3">
                        <div class="flex items-center gap-2">
                            <p class="font-bold text-base text-gray-900 leading-snug">{{ hoverTooltip.task?.title }}</p>
                            <Badge v-if="hoverTooltip.task?.due_date && new Date(hoverTooltip.task.due_date) < new Date() && hoverTooltip.task?.status !== 'completed' && hoverTooltip.task?.status !== 'blocked'" class="text-xs px-2 py-1 bg-red-600 text-white">
                                OVERDUE
                            </Badge>
                        </div>
                        
                        <div class="flex items-center gap-3">
                            <Badge :style="{ backgroundColor: getStatusColor(hoverTooltip.task?.status), color: 'white' }" class="text-xs px-2 py-1">
                                {{ capitalizeStatus(hoverTooltip.task?.status) }}
                            </Badge>
                            <span class="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {{ hoverTooltip.task?.priority ? String(hoverTooltip.task.priority).toUpperCase() : 'MEDIUM' }}
                            </span>
                        </div>
                        
                        <div class="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                            <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span class="font-medium">
                                {{ hoverTooltip.task?.start_date ? formatDate(hoverTooltip.task.start_date) : 'N/A' }} 
                                <span class="text-gray-400 mx-1">→</span> 
                                {{ hoverTooltip.task?.due_date ? formatDate(hoverTooltip.task.due_date) : 'N/A' }}
                            </span>
                        </div>
                        
                        <div class="flex items-start gap-2 text-xs text-gray-600">
                            <svg class="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            <span class="flex-1">
                                <span v-if="hoverTooltip.task?.assignees && hoverTooltip.task.assignees.length > 0" class="font-medium">
                                    {{ hoverTooltip.task.assignees.map(a => a?.assigned_to?.fullname || 'Unknown').join(', ') }}
                                </span>
                                <span v-else class="text-gray-400 italic">Unassigned</span>
                            </span>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- Legend -->
            <div class="mt-6 flex flex-wrap gap-4 text-sm">
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded" style="background-color: #FECACA"></div>
                    <span>Not Started</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded" style="background-color: #FEF3C7"></div>
                    <span>In Progress</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded" style="background-color: #D1FAE5"></div>
                    <span>Completed</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded" style="background-color: #6B7280"></div>
                    <span>Blocked</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 rounded animate-pulse flex items-center justify-center" style="background-color: #DC2626; box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.3);">
                        <span class="text-xs leading-none flex items-center justify-center" style="transform: translate(0.5px, -0.5px);">⚠️</span>
                    </div>
                    <span class="font-semibold text-red-600">Overdue</span>
                </div>
            </div>
        </div>

        <!-- Project Not Found -->
        <div v-else-if="!isLoading" class="text-center py-12">
            <div class="text-muted-foreground text-lg">Project not found</div>
            <div class="mt-2 text-sm text-muted-foreground">Looking for project ID: {{ projectId }}</div>
            <button @click="goToProjectsDashboard" class="mt-4 text-blue-600 hover:text-blue-800 underline">
                Back to Projects Dashboard
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { TaskFromAPI, TaskStatus } from '@/types'

definePageMeta({
    layout: 'with-sidebar'
})

// ============================================================================
// ROUTING
// ============================================================================

const router = useRouter()
const route = useRoute()

const projectId = computed(() => route.query.projectId as string || route.params.id as string)

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const isLoading = ref(false)
const error = ref<string | null>(null)
const project = ref<any>(null)
const rawTasks = ref<TaskFromAPI[]>([])
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)

// Task details dialog state - simplified
const taskDetailsDialogOpen = ref(false)
const taskDetailsDialogTask = ref<any>(null)

// Hover tooltip state
const hoverTooltip = ref<{
  visible: boolean
  x: number
  y: number
  task: TaskFromAPI | null
}>({
  visible: false,
  x: 0,
  y: 0,
  task: null
})

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchData() {
    try {
        error.value = null
        isLoading.value = true

            // Fetch tasks and project in parallel
            await Promise.all([
                fetchTasks(),
                fetchProject()
            ])

    } catch (err) {
        console.error('Failed to fetch data:', err)
        error.value = 'Failed to load timeline data. Please try again.'
    } finally {
        isLoading.value = false
    }
}

async function fetchTasks() {
    try {
        // Fetch tasks for this specific project with department-based filtering
        const fetchedTasks = await $fetch('/api/tasks/by-project', {
            params: { project_id: projectId.value }
        })

        if (fetchedTasks && Array.isArray(fetchedTasks.tasks)) {
            rawTasks.value = fetchedTasks.tasks
        } else if (Array.isArray(fetchedTasks)) {
            rawTasks.value = fetchedTasks
        } else {
            rawTasks.value = []
        }


    } catch (err) {
        console.error('Failed to fetch tasks:', err)
        rawTasks.value = []
        error.value = `Failed to fetch tasks: ${(err as Error).message || 'Unknown error'}`
        throw err
    }
}

async function fetchProject() {
    try {
        if (!projectId.value) {
            throw new Error('Project ID is required')
        }

        // Fetch all projects and find the specific one
        const fetchedProjects = await $fetch('/api/projects')

        const foundProject = fetchedProjects.find((p: any) => p.id.toString() === projectId.value)

        if (foundProject) {
            project.value = {
                id: String(foundProject.id),
                name: foundProject.name || '',
                description: foundProject.description || '',
                status: foundProject.status || 'active',
                priority: foundProject.priority || 'medium',
                createdAt: foundProject.created_at || new Date().toISOString(),
                dueDate: foundProject.due_date || null,
                tags: foundProject.tags || [],
                owner_id: foundProject.owner_id || null,
                isRealData: true
            }
        } else {
            project.value = null
        }

    } catch (err) {
        console.error('Failed to fetch project:', err)
        project.value = null
        error.value = `Failed to fetch project: ${(err as Error).message || 'Unknown error'}`
        throw err
    }
}

// ============================================================================
// CALENDAR CONFIGURATION
// ============================================================================

// FullCalendar options
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridWeek',
  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'goToToday'
  },
  customButtons: {
    goToToday: {
      text: isCurrentWeek.value ? 'Current Week' : 'Go to Current Week',
      click: function() {
        if (!isCurrentWeek.value) {
          calendarRef.value.getApi().today()
        }
      }
    }
  },
  editable: false,
  selectable: false,
  selectMirror: false,
  dayMaxEvents: 3,
  weekends: true,
  height: 'auto',
  events: calendarEvents.value,
  eventClick: (clickInfo: EventClickArg) => handleEventClick(clickInfo),
  eventDidMount: (info: any) => {
    // Add hover listeners
    info.el.addEventListener('mouseenter', () => handleEventMouseEnter(info))
    info.el.addEventListener('mouseleave', () => handleEventMouseLeave())
    
    // Make cursor pointer
    info.el.style.cursor = 'pointer'
  },
  viewDidMount: () => {
    // Update button state when view changes
    nextTick(() => {
      checkCurrentWeek()
      updateButtonState()
    })
    
    // Add click listeners to navigation buttons to reset their state
    const prevButton = document.querySelector('.fc-prev-button')
    const nextButton = document.querySelector('.fc-next-button')
    
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        setTimeout(() => resetButtonStates(), 100)
      })
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        setTimeout(() => resetButtonStates(), 100)
      })
    }
  },
  datesSet: () => {
    // This fires when dates change (including navigation)
    nextTick(() => {
      checkCurrentWeek()
      updateButtonState()
      // Reset button states after navigation
      resetButtonStates()
    })
  },
  eventDisplay: 'block',
  displayEventTime: false,
  eventOverlap: true,
  nowIndicator: true,
  fixedWeekCount: false,
  showNonCurrentDates: true
}))

// Reactive state for current week status
const isCurrentWeek = ref(false)

// Function to check if we're in current week
function checkCurrentWeek() {
  if (!calendarRef.value) {
    isCurrentWeek.value = false
    return
  }
  
  const calendar = calendarRef.value.getApi()
  const currentDate = new Date()
  const viewStart = calendar.view.activeStart
  const viewEnd = calendar.view.activeEnd
  
  isCurrentWeek.value = currentDate >= viewStart && currentDate <= viewEnd
}

// Transform tasks to FullCalendar events
const calendarEvents = computed(() => {
  return rawTasks.value.map(task => {
    const startDate = task.start_date ? task.start_date.split('T')[0] : new Date().toISOString().split('T')[0]
    const endDate = task.due_date ? task.due_date.split('T')[0] : (task.start_date ? task.start_date.split('T')[0] : new Date().toISOString().split('T')[0])
    
    const exclusiveEndDate = new Date(endDate)
    exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1)
    
    // Check if task is overdue (only if not completed or blocked)
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && task.status !== 'blocked'
    
    return {
      id: task.id.toString(),
      title: task.title,
      start: startDate,
      end: exclusiveEndDate.toISOString().split('T')[0],
      allDay: true,
      backgroundColor: getStatusColor(task.status), // Keep original status color
      borderColor: isOverdue ? '#DC2626' : getStatusColor(task.status), // Red border for overdue
      textColor: '#000000', // Black text for all tasks
      classNames: isOverdue ? ['overdue-task'] : [],
      extendedProps: {
        status: task.status,
        notes: task.notes,
        priority: task.priority,
        assignees: task.assignees?.map(a => a.assigned_to.fullname).join(', ') || 'Unassigned',
        project: task.project?.name || 'Personal',
        isOverdue: isOverdue
      }
    }
  })
})

function getStatusColor(status: TaskStatus): string {
  const colors = {
    'not-started': '#FECACA', // bg-red-200
    'in-progress': '#FEF3C7', // bg-yellow-100
    'completed': '#D1FAE5', // bg-green-100
    'blocked': '#6B7280' // Grey
  }
  return colors[status] || colors['not-started']
}

// ============================================================================
// CALENDAR EVENT HANDLERS
// ============================================================================

async function handleEventClick(clickInfo: EventClickArg) {
  try {
    const taskId = parseInt(clickInfo.event.id)
    const task = rawTasks.value.find(t => t.id === taskId)
    
    if (task) {
      // Hide hover tooltip when clicking
      hoverTooltip.value.visible = false
      
      // Reset dialog first
      taskDetailsDialogOpen.value = false
      taskDetailsDialogTask.value = null
      
      await nextTick()
      
      // Create a clean copy of the task to avoid proxy issues
      const taskCopy = {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority || 'medium',
        start_date: task.start_date,
        due_date: task.due_date,
        notes: task.notes,
        assignees: task.assignees || [],
        project: task.project || null,
        creator: task.creator || null,
        created_at: task.created_at,
        updated_at: task.updated_at
      }
      
      // Open task details dialog
      taskDetailsDialogTask.value = taskCopy
      taskDetailsDialogOpen.value = true
    }
  } catch (error) {
    console.error('Error opening task details:', error)
  }
}

function handleEventMouseEnter(info: any) {
  try {
    const taskId = parseInt(info.event.id)
    const task = rawTasks.value.find(t => t.id === taskId)
    
    if (task) {
      // Position tooltip near the event
      const rect = info.el.getBoundingClientRect()
      const tooltipWidth = 256 // max-w-sm is approximately 256px
      
      // Calculate X position (keep it within viewport)
      let x = rect.left + rect.width / 2 - tooltipWidth / 2
      if (x < 10) x = 10 // Don't go off left edge
      if (x + tooltipWidth > window.innerWidth - 10) {
        x = window.innerWidth - tooltipWidth - 10 // Don't go off right edge
      }
      
      // Calculate Y position (above the event)
      let y = rect.top - 100
      if (y < 100) { // Not enough space above
        y = rect.bottom + 10 // Show below instead
      }
      
      // Create a clean copy with only necessary fields
      const taskCopy = {
        title: task.title || 'Untitled',
        status: task.status || 'not-started',
        priority: task.priority || 'medium',
        start_date: task.start_date,
        due_date: task.due_date,
        assignees: task.assignees || []
      }
      
      hoverTooltip.value.visible = true
      hoverTooltip.value.x = x
      hoverTooltip.value.y = y
      hoverTooltip.value.task = taskCopy
    }
  } catch (error) {
    console.error('Error showing tooltip:', error)
  }
}

function handleEventMouseLeave() {
  hoverTooltip.value.visible = false
}

function goToTaskDetails(taskId?: number) {
  if (taskId) {
    router.push(`/task/${taskId}?from=project&projectId=${projectId.value}`)
    }
}

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

function getProjectTaskCount(): number {
    if (!Array.isArray(rawTasks.value)) {
        return 0
    }
    return rawTasks.value.filter(task => task.project_id === parseInt(projectId.value)).length
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
    if (status === 'in-progress') return 'In Progress'
    if (status === 'todo') return 'To Do'
    if (status === 'blocked') return 'Blocked'
    return status.charAt(0).toUpperCase() + status.slice(1)
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

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

function goToProjectView() {
    router.push(`/project/${projectId.value}`)
}

function goToProjectsDashboard() {
    router.push('/project/dashboard')
}

function handleTaskClick(task: TaskFromAPI) {
    router.push(`/task/${task.id}?from=timeline&projectId=${projectId.value}`)
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

onMounted(async () => {
    await fetchData()

    // Listen for task updates
    window.addEventListener('task-updated', fetchData)
    window.addEventListener('task-deleted', fetchData)
    
    // Update button state after calendar is rendered
    nextTick(() => {
      updateButtonState()
    })
})

// Function to update button state
function updateButtonState() {
  if (calendarRef.value) {
    const button = document.querySelector('.fc-goToToday-button')
    if (button) {
      // Remove any existing disabled class first
      button.classList.remove('current-week-disabled')
      
      // Add disabled class if we're in current week
      if (isCurrentWeek.value) {
        button.classList.add('current-week-disabled')
      }
      
      // Force a re-render to clear any hover states
      button.style.pointerEvents = 'auto'
      if (isCurrentWeek.value) {
        button.style.pointerEvents = 'none'
      }
    }
  }
}

// Function to reset all button states
function resetButtonStates() {
  if (calendarRef.value) {
    // Reset all navigation buttons
    const prevButton = document.querySelector('.fc-prev-button')
    const nextButton = document.querySelector('.fc-next-button')
    const todayButton = document.querySelector('.fc-goToToday-button')
    
    [prevButton, nextButton, todayButton].forEach(button => {
      if (button) {
        // Remove any active/hover states
        button.classList.remove('fc-button-active', 'fc-button-hover')
        button.blur() // Remove focus state
        
        // Force a style reset
        button.style.transform = 'none'
        button.style.boxShadow = ''
        button.style.backgroundColor = ''
        
        // Trigger a reflow to ensure styles are applied
        button.offsetHeight
      }
    })
  }
}

// Watch for changes in current week status
watch(isCurrentWeek, () => {
  updateButtonState()
})

onUnmounted(() => {
    window.removeEventListener('task-updated', fetchData)
    window.removeEventListener('task-deleted', fetchData)
})
</script>

<style scoped>
/* Additional styles for the timeline page */

/* Overdue task styling */
:deep(.overdue-task) {
  animation: pulse-overdue 2s infinite;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.3);
  font-weight: bold;
  position: relative;
}

:deep(.overdue-task::after) {
  content: "⚠️";
  position: absolute;
  top: -2px;
  right: -2px;
  font-size: 12px;
  z-index: 10;
}

@keyframes pulse-overdue {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.5);
  }
}

/* Make overdue tasks more prominent */
:deep(.fc-event.overdue-task) {
  border-width: 3px !important;
  border-style: solid !important;
}

/* Add left padding to all calendar events */
:deep(.fc-event) {
  margin-left: 0 !important;
  padding-left: 4px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

/* Ensure event titles are properly truncated */
:deep(.fc-event-title) {
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  max-width: 100% !important;
}

/* Disabled button styling */
:deep(.fc-button:disabled),
:deep(.fc-button.current-week-disabled) {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  background-color: #6b7280 !important;
  color: #9ca3af !important;
}

/* Fix button state persistence issues */
:deep(.fc-button) {
  transition: all 0.2s ease !important;
}

:deep(.fc-button:not(:disabled):not(.current-week-disabled)) {
  background-color: #374151 !important;
  border-color: #374151 !important;
  color: white !important;
}

:deep(.fc-button:not(:disabled):not(.current-week-disabled):hover) {
  background-color: #4b5563 !important;
  border-color: #4b5563 !important;
  transform: none !important;
  box-shadow: none !important;
}

:deep(.fc-button:not(:disabled):not(.current-week-disabled):active) {
  background-color: #1f2937 !important;
  border-color: #1f2937 !important;
  transform: none !important;
  box-shadow: none !important;
}

/* Ensure buttons reset properly after click */
:deep(.fc-button:focus) {
  outline: none !important;
  box-shadow: none !important;
}

/* Remove any persistent hover effects */
:deep(.fc-button.fc-button-hover) {
  background-color: #4b5563 !important;
  border-color: #4b5563 !important;
}

:deep(.fc-button.fc-button-active) {
  background-color: #1f2937 !important;
  border-color: #1f2937 !important;
}
</style>
