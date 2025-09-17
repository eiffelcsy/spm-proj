<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Personal Dashboard</h1>
    
    <div class="mb-4">
      <h2 class="text-xl font-semibold mb-4">My Tasks</h2>

    <DataTable 
      :columns="columns" 
      :data="tasks" 
      @rowClick="goToTask" 
      :showCreateButton="true"
      @create-task="isModalOpen = true"
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
import { ref } from 'vue'
import { columns } from '@/components/tasks/columns'
import type { Task } from '@/components/tasks/data/schema'
import DataTable from '@/components/tasks/data-table.vue'
import tasksJson from '@/components/tasks/data/example.json'
import CreateTaskModal from '@/components/tasks/create-task-modal.vue'

const tasks = ref<Task[]>(
  tasksJson.map(task => ({
    ...task,
    startDate: new Date(task.startDate),
    dueDate: new Date(task.dueDate)
  }))
)

const isModalOpen = ref(false)

function addTask(newTask: Task) {
  tasks.value.push(newTask)
}


import { useRouter } from 'vue-router'
const router = useRouter()

function goToTask(task: Task) {
  router.push(`/personal/task/${task.id}`)
}
</script>