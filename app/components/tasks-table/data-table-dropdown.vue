<script setup lang="ts">
import { MoreHorizontal, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ref } from 'vue'
import { DeleteTaskModal } from '@/components/task-modals/delete-task'
import type { TaskForDropdown } from '@/types'

const props = defineProps<{
  task: TaskForDropdown
}>()

const emit = defineEmits<{
  (e: 'task-updated'): void
  (e: 'task-deleted'): void
}>()

// All available statuses
const allStatuses = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
]

// Delete modal state
const isDeleteModalOpen = ref(false)

// Update task status
async function updateTaskStatus(newStatus: string) {
  try {
    const response = await $fetch<{ success: boolean; task: any }>(`/api/tasks/${props.task.id}`, {
      method: 'PUT',
      body: {
        status: newStatus
      }
    })

    if (response.success) {
      emit('task-updated')
    } else {
      console.error('Failed to update task status')
    }
  } catch (error) {
    console.error('Error updating task status:', error)
  }
}

// Delete task
async function deleteTask() {
  try {
    const response = await $fetch<{ success: boolean; message: string }>(`/api/tasks/${props.task.id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      emit('task-deleted')
      isDeleteModalOpen.value = false
    } else {
      console.error('Failed to delete task')
    }
  } catch (error) {
    console.error('Error deleting task:', error)
  }
}

function openDeleteModal() {
  isDeleteModalOpen.value = true
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false
}

</script>

<template>
  <div @click.stop>
    <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" class="w-8 h-8 p-0" @click.stop>
        <span class="sr-only">Open menu</span>
        <MoreHorizontal class="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" @click.stop>
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      
      <!-- Status update actions -->
      <template v-for="status in allStatuses" :key="status.value">
        <DropdownMenuItem @click.stop="updateTaskStatus(status.value)" class="cursor-pointer">
          Mark as {{ status.label }}
        </DropdownMenuItem>
      </template>
      
      <DropdownMenuSeparator />
      
      <!-- Delete action -->
      <DropdownMenuItem @click.stop="openDeleteModal" class="cursor-pointer text-red-600 focus:text-red-600">
        <Trash2 class="w-4 h-4 mr-2" />
        Delete Task
      </DropdownMenuItem>
    </DropdownMenuContent>
    </DropdownMenu>
  </div>

  <!-- Delete confirmation modal -->
  <DeleteTaskModal
    :isOpen="isDeleteModalOpen"
    @close="closeDeleteModal"
    @delete-complete="deleteTask"
  />
</template>