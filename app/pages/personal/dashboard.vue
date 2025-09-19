<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Personal Dashboard</h1>
    
    <div class="mb-4">
      <h2 class="text-xl font-semibold py-1">My Tasks</h2>

      <!-- Error message -->
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
        <button @click="fetchTasks" class="ml-2 underline">Try again</button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="text-gray-500">Loading tasks...</div>
      </div>

      <!-- Data table -->
      <DataTable 
        v-else
        :columns="columns" 
        :data="tasks" 
        @rowClick="goToTask" 
        :showCreateButton="true"
        :showRefreshButton="true"
        @create-task="isModalOpen = true"
        @refresh-tasks="fetchTasks"
      />

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
import { ref, computed } from 'vue'
import { columns } from '@/components/tasks/columns'
import type { Task } from '@/components/tasks/data/schema'
import DataTable from '@/components/tasks/data-table.vue'
// import tasksJson from '@/components/tasks/data/example.json' // TODO: Replace with actual tasks from API
import CreateTaskModal from '@/components/tasks/create-task-modal.vue'
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

// TODO: Uncomment when API is implemented
const { data: tasksResponse, pending: isLoading, error: fetchError, refresh: refreshTasks } = await useFetch<{ tasks: any[], count: number }>('/api/tasks')

const tasks = computed(() => {
  if (!tasksResponse.value?.tasks) return []
  
  return tasksResponse.value.tasks.map(task => ({
    id: task.id,
    title: task.title,
    startDate: new Date(task.start_date || task.startDate),
    dueDate: new Date(task.due_date || task.dueDate),
    project: task.project || '',
    status: task.status || 'pending'
  }))
})

const error = computed(() => {
  return fetchError.value ? 'Failed to load tasks. Please try again.' : null
})

function fetchTasks() {
  refreshTasks()
}

async function addTask(newTask: Task) {
  // await refreshTasks()
  tasks.value.push(newTask)
  isModalOpen.value = false
}

function goToTask(task: Task) {
  router.push(`/personal/task/${task.id}`)
}
</script>