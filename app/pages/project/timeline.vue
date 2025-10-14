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

            <!-- Timeline Component -->
            <Timeline :tasks="rawTasks" :project-id="projectId" :is-loading="isLoading" @task-click="handleTaskClick" />
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getLocalTimeZone } from '@internationalized/date'
import { Timeline } from '@/components/timeline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { TaskFromAPI } from '@/types'

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

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

async function fetchData() {
    try {
        error.value = null
        isLoading.value = true

        // For testing, let's add some mock data if API calls fail
        try {
            // Fetch tasks and project in parallel
            await Promise.all([
                fetchTasks(),
                fetchProject()
            ])
        } catch (apiErr) {
            console.log('API calls failed, using mock data for testing:', apiErr)

            // Add mock data for testing
            project.value = {
                id: projectId.value,
                name: 'Test Project',
                description: 'This is a test project for timeline development',
                status: 'active',
                priority: 'medium',
                createdAt: new Date().toISOString(),
                dueDate: null,
                tags: ['test', 'timeline'],
                owner_id: 1,
                isRealData: false
            }

            rawTasks.value = [
                {
                    id: 1,
                    title: 'Test Task 1',
                    notes: 'Test task for timeline',
                    project_id: parseInt(projectId.value),
                    parent_task_id: null,
                    creator_id: 1,
                    status: 'in-progress',
                    start_date: new Date().toISOString(),
                    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
                    priority: 'medium',
                    repeat_interval: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    completed_at: null,
                    deleted_at: null,
                    creator: {
                        id: 1,
                        fullname: 'Test User'
                    },
                    assignees: [],
                    project: {
                        id: parseInt(projectId.value),
                        name: 'Test Project'
                    }
                },
                {
                    id: 2,
                    title: 'Test Task 2',
                    notes: 'Another test task',
                    project_id: parseInt(projectId.value),
                    parent_task_id: null,
                    creator_id: 1,
                    status: 'not-started',
                    start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
                    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
                    priority: 'high',
                    repeat_interval: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    completed_at: null,
                    deleted_at: null,
                    creator: {
                        id: 1,
                        fullname: 'Test User'
                    },
                    assignees: [],
                    project: {
                        id: parseInt(projectId.value),
                        name: 'Test Project'
                    }
                }
            ]
        }

    } catch (err) {
        console.error('Failed to fetch data:', err)
        error.value = 'Failed to load timeline data. Please try again.'
    } finally {
        isLoading.value = false
    }
}

async function fetchTasks() {
    try {
        const fetchedTasks = await $fetch('/api/tasks')

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
})

onUnmounted(() => {
    window.removeEventListener('task-updated', fetchData)
    window.removeEventListener('task-deleted', fetchData)
})
</script>

<style scoped>
/* Additional styles for the timeline page */
</style>
