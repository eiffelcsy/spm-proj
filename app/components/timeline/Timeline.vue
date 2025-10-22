<template>
    <div class="timeline-container">
        <!-- Timeline Controls -->
        <div class="timeline-controls mb-6 p-4 bg-white border rounded-lg shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <!-- Date Range Selector -->
                <div class="flex items-center gap-4">
                    <Label for="date-range" class="text-sm font-medium">Date Range:</Label>
                    <Select v-model="selectedDateRange" @update:model-value="handleDateRangeChange">
                        <SelectTrigger class="w-40">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1d">1 Day</SelectItem>
                            <SelectItem value="1w">1 Week</SelectItem>
                            <SelectItem value="1m" selected>1 Month</SelectItem>
                            <SelectItem value="3m">3 Months</SelectItem>
                            <SelectItem value="6m">6 Months</SelectItem>
                            <SelectItem value="1y">1 Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Custom Date Range -->
                <div class="flex items-center gap-4">
                    <Label for="start-date" class="text-sm font-medium">From:</Label>
                    <Input v-model="customStartDate" type="date" class="w-40" :max="customEndDate" />
                    <Label for="end-date" class="text-sm font-medium">To:</Label>
                    <Input v-model="customEndDate" type="date" class="w-40" :min="customStartDate" />
                    <Button size="sm" variant="outline" @click="applyCustomDateRange"
                        :disabled="!customStartDate || !customEndDate">
                        Apply
                    </Button>
                </div>

                <!-- View Options -->
                <div class="flex items-center gap-2">
                    <Button size="sm" variant="ghost" @click="showCompleted = !showCompleted"
                        :class="showCompleted ? 'bg-green-100 text-green-700' : ''">
                        <CheckCircle class="h-4 w-4 mr-1" />
                        Show Completed
                    </Button>
                </div>
            </div>
        </div>

        <!-- Timeline Header -->
        <div class="timeline-header mb-4">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Project Timeline</h3>
                <div class="text-sm text-muted-foreground">
                    {{ filteredTasks.length }} tasks in view
                </div>
            </div>
        </div>

        <!-- Timeline Content -->
        <div class="timeline-content relative">
            <!-- Loading State -->
            <div v-if="isLoading" class="flex justify-center items-center py-12">
                <div class="text-muted-foreground">Loading timeline...</div>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center py-12">
                <Calendar class="h-12 w-12 text-muted-foreground mb-4" />
                <div class="text-lg font-medium text-muted-foreground mb-2">No tasks in this date range</div>
                <div class="text-sm text-muted-foreground text-center max-w-md">
                    Try adjusting the date range or check if tasks have been assigned to this project.
                </div>
            </div>

            <!-- Timeline Grid -->
            <div v-else class="timeline-container-wrapper">
                <!-- Fixed Header with Task Label -->
                <div class="timeline-header-fixed bg-white border-b">
                    <div
                        class="timeline-label-width flex items-center justify-center text-xs font-medium text-muted-foreground border-r p-3">
                        Task
                    </div>
                </div>

                <!-- Scrollable Timeline Content -->
                <div class="timeline-scrollable-container">
                    <!-- Date Labels (Top) -->
                    <div class="timeline-dates">
                        <div class="timeline-label-width border-r bg-muted"></div>
                        <div class="timeline-dates-row">
                            <div v-for="date in dateRange" :key="date.toISOString()"
                                class="timeline-date-cell flex items-center justify-center text-xs font-medium border-r"
                                :style="{ minWidth: '80px' }" :class="{ 'bg-blue-50': isToday(date) }">
                                {{ formatDateLabel(date) }}
                            </div>
                        </div>
                    </div>

                    <!-- Task Rows -->
                    <div class="timeline-rows">
                        <div v-for="task in filteredTasks" :key="task.id" class="timeline-row">
                            <!-- Task Info (Fixed) -->
                            <div class="timeline-task-info timeline-label-width p-3 border-r bg-white">
                                <div class="flex flex-col">
                                    <div class="font-medium text-sm truncate" :title="task.title">
                                        {{ task.title }}
                                    </div>
                                    <div class="flex items-center gap-2 mt-1">
                                        <Badge :variant="getStatusVariant(task.status)" class="text-xs">
                                            {{ capitalizeStatus(task.status) }}
                                        </Badge>
                                        <div class="text-xs text-muted-foreground">
                                            Due: {{ formatDateShort(task.due_date || new Date()) }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Timeline Bars (Scrollable) -->
                            <div class="timeline-bars-container">
                                <!-- Task Duration Bar -->
                                <div class="timeline-task-bar" :class="getTaskBarClass(task)"
                                    :style="getTaskBarStyle(task)" @click="handleTaskClick(task)"
                                    @mouseenter="showTooltip = true; hoveredTask = task"
                                    @mouseleave="showTooltip = false; hoveredTask = null">
                                    <div class="h-full flex items-center justify-center">
                                        <span class="text-xs font-medium text-white px-2 truncate" :title="task.title">
                                            {{ task.title }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Task Tooltip -->
            <div v-if="showTooltip && hoveredTask"
                class="fixed z-50 bg-foreground text-background text-sm rounded-lg shadow-lg p-3 max-w-xs"
                :style="tooltipStyle">
                <div class="font-medium mb-2">{{ hoveredTask.title }}</div>
                <div class="space-y-1 text-xs">
                    <div><span class="text-muted-foreground">Status:</span> {{ capitalizeStatus(hoveredTask.status) }}
                    </div>
                    <div><span class="text-muted-foreground">Start:</span> {{ formatDateShort(hoveredTask.start_date ||
                        new Date()) }}</div>
                    <div><span class="text-muted-foreground">Due:</span> {{ formatDateShort(hoveredTask.due_date || new
                        Date()) }}</div>
                    <div v-if="hoveredTask.assignees?.length" class="text-muted-foreground">
                        <span>Assigned to:</span> {{ getAssigneesText(hoveredTask.assignees) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Calendar, CheckCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import type { TaskFromAPI } from '@/types'

// ============================================================================
// PROPS & EMITS
// ============================================================================

interface Props {
    tasks: TaskFromAPI[]
    projectId: string
    isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    isLoading: false
})

const emit = defineEmits<{
    taskClick: [task: TaskFromAPI]
}>()

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const selectedDateRange = ref('1m')
const customStartDate = ref('')
const customEndDate = ref('')
const showCompleted = ref(true)
const showTooltip = ref(false)
const hoveredTask = ref<TaskFromAPI | null>(null)
const tooltipStyle = ref({})

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

const dateRange = computed(() => {
    const { startDate, endDate } = getDateRange()
    const dates = []
    const current = new Date(startDate)

    while (current <= endDate) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
    }

    return dates
})

const filteredTasks = computed(() => {
    let tasks = props.tasks.filter(task => {
        // Filter by project
        if (task.project_id !== parseInt(props.projectId)) {
            return false
        }

        // Filter by completion status
        if (!showCompleted.value && task.status === 'completed') {
            return false
        }

        // Filter by date range
        const { startDate, endDate } = getDateRange()
        const taskStart = task.start_date ? new Date(task.start_date) : new Date()
        const taskDue = task.due_date ? new Date(task.due_date) : new Date()

        // Include task if it overlaps with the date range
        return (taskStart <= endDate && taskDue >= startDate)
    })

    // Sort by start date
    return tasks.sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date) : new Date()
        const dateB = b.start_date ? new Date(b.start_date) : new Date()
        return dateA.getTime() - dateB.getTime()
    })
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getDateRange() {
    const now = new Date()

    if (selectedDateRange.value === 'custom' && customStartDate.value && customEndDate.value) {
        return {
            startDate: new Date(customStartDate.value),
            endDate: new Date(customEndDate.value)
        }
    }

    let startDate = new Date()
    let endDate = new Date()

    switch (selectedDateRange.value) {
        case '1d':
            endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
            break
        case '1w':
            endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            break
        case '1m':
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
            break
        case '3m':
            endDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
            break
        case '6m':
            endDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
            break
        case '1y':
            endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
            break
    }

    return { startDate, endDate }
}

function formatDateLabel(date: Date): string {
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    })
}

function formatDateShort(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
}

function isToday(date: Date): boolean {
    const today = new Date()
    return date.toDateString() === today.toDateString()
}

function getTaskBarStyle(task: TaskFromAPI) {
    const { startDate, endDate } = getDateRange()
    const cellWidth = 80 // Fixed cell width for simplicity

    const taskStart = task.start_date ? new Date(task.start_date) : startDate
    const taskDue = task.due_date ? new Date(task.due_date) : endDate

    // Calculate position and width
    const startOffset = Math.max(0, Math.ceil((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const taskDuration = Math.ceil((taskDue.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const left = startOffset * cellWidth
    const width = Math.max(taskDuration * cellWidth, 100) // Minimum width for better text display

    return {
        left: `${left}px`,
        width: `${width}px`
    }
}

function getTaskBarClass(task: TaskFromAPI): string {
    const baseClass = 'border'

    if (task.status === 'completed') {
        return `${baseClass} bg-green-500 border-green-600`
    }

    if (isTaskOverdue(task)) {
        return `${baseClass} bg-red-500 border-red-600`
    }

    switch (task.status) {
        case 'not-started':
            return `${baseClass} bg-muted`
        case 'in-progress':
            return `${baseClass} bg-blue-500 border-blue-600`
        case 'blocked':
            return `${baseClass} bg-orange-500 border-orange-600`
        default:
            return `${baseClass} bg-muted`
    }
}

function isTaskOverdue(task: TaskFromAPI): boolean {
    if (task.status === 'completed') return false
    if (!task.due_date) return false
    return new Date(task.due_date) < new Date()
}

function getStatusVariant(status: string) {
    switch (status) {
        case 'not-started':
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

function capitalizeStatus(status: string): string {
    if (status === 'not-started') return 'Not Started'
    if (status === 'in-progress') return 'In Progress'
    return status.charAt(0).toUpperCase() + status.slice(1)
}

function getAssigneesText(assignees: any[]): string {
    if (!assignees || assignees.length === 0) return 'Unassigned'
    if (assignees.length === 1) return assignees[0].assigned_to?.fullname || 'Unknown'
    return `${assignees[0].assigned_to?.fullname} +${assignees.length - 1} more`
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function handleDateRangeChange() {
    // Reset custom dates when preset range is selected
    if (selectedDateRange.value !== 'custom') {
        customStartDate.value = ''
        customEndDate.value = ''
    }
}

function applyCustomDateRange() {
    if (customStartDate.value && customEndDate.value) {
        selectedDateRange.value = 'custom'
    }
}

function handleTaskClick(task: TaskFromAPI) {
    emit('taskClick', task)
}

// Handle tooltip positioning
function updateTooltipPosition(event: MouseEvent) {
    if (showTooltip.value && hoveredTask.value) {
        tooltipStyle.value = {
            left: `${event.clientX + 10}px`,
            top: `${event.clientY - 10}px`
        }
    }
}


// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

onMounted(() => {
    document.addEventListener('mousemove', updateTooltipPosition)
})

watch(() => props.tasks, () => {
    // Reset tooltip when tasks change
    showTooltip.value = false
    hoveredTask.value = null
}, { deep: true })
</script>

<style scoped>
.timeline-container {
    width: 100%;
}

.timeline-container-wrapper {
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background-color: white;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.timeline-header-fixed {
    display: flex;
    width: 100%;
}

.timeline-scrollable-container {
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
}

.timeline-dates {
    display: flex;
    background-color: var(--muted);
    border-bottom: 1px solid var(--border);
}

.timeline-dates-row {
    display: flex;
}

.timeline-label-width {
    width: 16rem;
    min-width: 16rem;
    flex-shrink: 0;
}

.timeline-date-cell {
    padding: 0.5rem;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
}

.timeline-row {
    display: flex;
    border-bottom: 1px solid var(--border);
    min-height: 4rem;
}

.timeline-row:last-child {
    border-bottom: none;
}

.timeline-task-info {
    background-color: var(--muted);
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.timeline-bars-container {
    position: relative;
    flex: 1;
    min-height: 4rem;
    background-color: white;
}

.timeline-task-bar {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 1.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
    overflow: hidden;
}

.timeline-task-bar span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.timeline-task-bar:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transform: translateY(-50%) scale(1.05);
}

/* Custom scrollbar styling */
.timeline-scrollable-container::-webkit-scrollbar {
    height: 8px;
}

.timeline-scrollable-container::-webkit-scrollbar-track {
    background: var(--muted);
}

.timeline-scrollable-container::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
}

.timeline-scrollable-container::-webkit-scrollbar-thumb:hover {
    background: var(--muted-foreground);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .timeline-label-width {
        width: 12rem;
        min-width: 12rem;
    }

    .timeline-date-cell {
        padding: 0.25rem;
        min-width: 60px;
    }
}
</style>