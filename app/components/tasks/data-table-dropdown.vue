<script setup lang="ts">
import { MoreHorizontal, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ref } from 'vue'
import DeleteTaskModal from '@/components/task-modals/delete-task-modal/DeleteTaskModal.vue'

const props = defineProps<{
  task: {
    id: string
    status: string
    title?: string
    repeat_frequency?: string
  }
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

// Get statuses that the task is not currently in
const availableStatuses = allStatuses.filter(status => status.value !== props.task.status)

// Delete modal state
const isDeleteModalOpen = ref(false)

// Update task status
async function updateTaskStatus(newStatus: string) {
  try {
    // Check if task is recurring and being marked as completed
    const isRecurring = props.task.repeat_frequency && props.task.repeat_frequency !== 'never'
    const isMarkingCompleted = newStatus === 'completed'
    
    if (isMarkingCompleted && isRecurring) {
      const response = await $fetch<{ success: boolean; task: any; nextTask?: any }>(`/api/tasks/${props.task.id}/complete`, {
        method: 'POST'
      })

      if (response.success) {
        // Show message if a recurring task was created
        if (response.nextTask) {
          console.log('Recurring task completed! Next occurrence created:', response.nextTask)
          
          // Optional: Show user notification
          window.dispatchEvent(new CustomEvent('recurring-task-created', { 
            detail: { 
              originalTask: response.task,
              nextTask: response.nextTask 
            }
          }))
        }
        
        emit('task-updated')
      } else {
        console.error('Failed to complete recurring task')
      }
    } else {
      // For non-recurring tasks or other status updates, use the regular update endpoint
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
      <template v-for="status in availableStatuses" :key="status.value">
        <DropdownMenuItem @click.stop="updateTaskStatus(status.value)" class="cursor-pointer">
          <span v-if="status.value === 'completed' && task.repeat_frequency && task.repeat_frequency !== 'never'" class="flex items-center">
            ✓ Mark as {{ status.label }}
            <span class="ml-1 text-xs text-muted-foreground">(will create next occurrence)</span>
          </span>
          <span v-else>Mark as {{ status.label }}</span>
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