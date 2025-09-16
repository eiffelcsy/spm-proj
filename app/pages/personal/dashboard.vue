<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Personal Dashboard</h1>
    
    <div class="mb-4">
      <h2 class="text-xl font-semibold mb-4">My Tasks</h2>
    <DataTable :columns="columns" :data="tasks" @rowClick="goToTask" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { columns, type Task } from '@/components/tasks/columns'
import DataTable from '@/components/tasks/data-table.vue'
import tasksJson from '@/components/tasks/data/example.json'


const tasks: Task[] = tasksJson.map(task => ({
  ...task,
  startDate: new Date(task.startDate),
  dueDate: new Date(task.dueDate)
}))

import { useRouter } from 'vue-router'
const router = useRouter()

function goToTask(task: Task) {
  router.push(`/personal/task/${task.id}`)
}
</script>