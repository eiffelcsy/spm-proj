<template>
  <div class="container mx-auto p-6 relative">
    <button
      class="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
      @click="goToDashboard"
      aria-label="Close"
    >
      ×
    </button>
    <h1 class="text-3xl font-bold mb-6">
      <span v-if="isSubtask">Subtask Details</span>
      <span v-else>Task Details</span>
    </h1>
    <div v-if="task">
      <div v-if="isSubtask" class="mb-2 text-gray-600">
        <span>This subtask belongs to: </span>
        <span
          class="font-semibold text-blue-600 hover:underline cursor-pointer"
          @click="goToParentTask(task.parentId)"
        >
          {{ task.parentTask }}
        </span>
      </div>
      <div class="mb-4">
        <h2 class="text-xl font-semibold">{{ task.title }}</h2>
        <p class="mb-2 text-gray-600">{{ task.description }}</p>
        <div class="mb-2"><strong>Notes:</strong> {{ task.notes }}</div>
        <div class="mb-2"><strong>Start Date:</strong> {{ formatDate(task.startDate) }}</div>
        <div class="mb-2"><strong>Due Date:</strong> {{ formatDate(task.dueDate) }}</div>
        <div class="mb-2"><strong>Status:</strong> <span :class="statusClass(task.status)">{{ task.status }}</span></div>
        <div class="mb-2"><strong>Creator:</strong> {{ task.creator }}</div>
        <div class="mb-2"><strong>Assignee:</strong> {{ task.assignee }}</div>
      </div>
      <div class="mb-4">
          <template v-if="!isSubtask">
            <h3 class="text-lg font-semibold mb-2">Subtasks</h3>
            <DataTable
              :columns="subtaskColumns"
              :data="subtaskRows"
              @rowClick="row => goToSubtask(row.id)"
              isSubtaskTable
              :hideToolbar="true"
            />
          </template>
      </div>
 <div class="mb-4">
  <h3 class="text-lg font-semibold mb-2">Activity Log</h3>
  <div class="relative">
    <div v-for="(log, idx) in task.history" :key="log.timestamp" class="relative flex pb-1 last:pb-0">
      <!-- Timeline line and dot container -->
      <div class="flex flex-col items-center mr-4 relative">
        <!-- Timeline dot -->
        <div class="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm z-10 flex-shrink-0 relative"></div>
        
        <!-- Connecting line below (not for last item) -->
        <div 
          v-if="idx < task.history.length - 1" 
          class="w-0.5 bg-gray-300 mt-1"
          style="height: calc(100% + 1.25rem)"
        ></div>
      </div>
      
      <!-- Content -->
      <div class="flex-1">
        <div class="text-sm text-gray-500 font-medium mb-1">
          {{ formatDate(log.timestamp) }}
        </div>
        <div class="text-base text-gray-900">
          {{ log.action }} 
          <span class="text-gray-500">by {{ log.user }}</span>
        </div>
      </div>
    </div>
  </div>
</div>
      <div v-if="!isAssignee" class="text-sm text-gray-500">This view is read-only. Only the assignee can edit this task.</div>
    </div>
    <div v-else>
      <p>Task not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">

import { useRoute, useRouter } from 'vue-router'
import { ref, computed, h } from 'vue'
import DataTable from '@/components/tasks/data-table.vue'
import tasksJson from '@/components/tasks/data/example.json'

const route = useRoute()
const router = useRouter()
const taskId = route.params.id

function formatDate(date: string | Date | undefined | null) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status: string) {
  if (status === 'not-started') return 'text-red-500';
  if (status === 'in-progress') return 'text-yellow-500';
  if (status === 'completed') return 'text-green-500';
  return 'text-gray-500';
}

function statusBubbleClass(status: string) {
  if (status === 'not-started') return 'bg-red-100 text-red-700';
  if (status === 'in-progress') return 'bg-yellow-100 text-yellow-700';
  if (status === 'completed') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
}

const currentUser = 'john.doe'

const task = ref<any>(null)
const isSubtask = ref(false)

function findTaskById(id: string): any {
  // Search main tasks
  let found = tasksJson.find((t: any) => String(t.id) === String(id))
  if (found) {
    isSubtask.value = false
    return found
  }
  // Search subtasks recursively
  for (const t of tasksJson) {
    if (Array.isArray(t.subtasks)) {
      for (const sub of t.subtasks) {
        if (String(sub.id) === String(id)) {
          isSubtask.value = true
          return {
            ...sub,
            parentTask: t.title,
            parentId: t.id
          }
        }
        // Support nested subtasks (if any)
        if (Array.isArray(sub.subtasks) && sub.subtasks.length > 0) {
          for (const subsub of sub.subtasks as any[]) {
            if (subsub && typeof subsub === 'object' && 'id' in subsub && String(subsub.id) === String(id)) {
              isSubtask.value = true
              return {
                ...(subsub as object),
                parentTask: sub.title,
                parentId: sub.id
              }
            }
          }
        }
      }
    }
  }
  return null
}

task.value = findTaskById(String(taskId))

function goToDashboard() {
  router.push('/personal/dashboard')
}

function goToSubtask(subtaskId: string) {
  router.push(`/personal/task/${subtaskId}`)
}

const isAssignee = computed(() => task.value && task.value.assignee === currentUser)

function goToParentTask(parentId: string) {
  router.push(`/personal/task/${parentId}`)
}

// Subtask table columns (use row.original for compatibility)
const subtaskColumns = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }: any) => row.original?.title ?? '—',
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    cell: ({ row }: any) => formatDate(row.original?.startDate),
    enableSorting: true,
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }: any) => formatDate(row.original?.dueDate),
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: any) => h(
      'span',
      {
        class: `inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusBubbleClass(row.original?.status)}`
      },
      row.original?.status ?? '—'
    ),
    enableSorting: true,
    enableFiltering: true,
  },
]

// Subtask rows for DataTable (no transformation needed)
const subtaskRows = computed(() => {
  if (!task.value || !Array.isArray(task.value.subtasks)) return [];
  return task.value.subtasks;
});
</script>
