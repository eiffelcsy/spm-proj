<template>
  <div class="w-full mx-auto p-8 md:px-12 lg:max-w-5xl xl:max-w-7xl">
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
        @close="isModalOpen = false"
        @task-created="addTask"
      />
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

const router = useRouter()
const isModalOpen = ref(false)

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
  if (fetchError.value) return 'Failed to load tasks. Please try again.'
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
  router.push(`/personal/task/${task.id}`)
}

// Event listeners for task updates and deletions from dropdown actions
function handleTaskUpdate() {
  fetchTasks()
}

function handleTaskDelete() {
  fetchTasks()
}

// Set up event listeners for quick actions
onMounted(() => {
  window.addEventListener('task-updated', handleTaskUpdate)
  window.addEventListener('task-deleted', handleTaskDelete)
})

onUnmounted(() => {
  window.removeEventListener('task-updated', handleTaskUpdate)
  window.removeEventListener('task-deleted', handleTaskDelete)
})
</script>