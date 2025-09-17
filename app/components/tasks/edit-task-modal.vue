<template>
  <div
    v-if="isOpen"
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    @click="$emit('close')"
  >
    
    <!-- Modal content -->
    <div 
      class="relative bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto z-10"
      @click.stop
    >
      <h2 class="text-xl font-semibold mb-4">{{ isSubtask ? 'Edit Subtask' : 'Edit Task' }}</h2>

      <!-- Feedback Messages -->
      <div v-if="successMessage" class="mb-4 p-3 rounded bg-green-100 text-green-700">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="mb-4 p-3 rounded bg-red-100 text-red-700">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="updateTask" class="space-y-4">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium mb-1">Task Title</label>
          <input
            v-model="title"
            type="text"
            required
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Start Date -->
        <div>
          <label class="block text-sm font-medium mb-1">Start Date</label>
          <input
            v-model="startDate"
            type="date"
            class="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <!-- Due Date -->
        <div>
          <label class="block text-sm font-medium mb-1">Due Date</label>
          <input
            v-model="dueDate"
            type="date"
            :min="startDate"
            class="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <!-- Status -->
        <div>
          <label class="block text-sm font-medium mb-1">Status</label>
          <select
            v-model="status"
            class="w-full border rounded-lg px-3 py-2"
          >
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium mb-1">Notes / Description</label>
          <textarea
            v-model="description"
            rows="3"
            class="w-full border rounded-lg px-3 py-2"
          ></textarea>
        </div>

        <!-- Subtasks -->
        <div>
          <label class="block text-sm font-medium mb-2">Subtasks</label>
          <div v-for="(subtask, index) in subtasks" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="subtask.title"
              type="text"
              placeholder="Subtask Title"
              class="flex-1 border rounded-lg px-2 py-1"
            />
            <input
              v-model="subtask.dueDate"
              type="date"
              class="border rounded-lg px-2 py-1"
            />
            <button
              type="button"
              @click="removeSubtask(index)"
              class="px-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            @click="addSubtask"
            class="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
          >
            + Add Subtask
          </button>
        </div>

        <!-- Assignee -->
        <div>
          <label class="block text-sm font-medium mb-1">Assign To</label>
          <select
            v-model="assignedTo"
            class="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Unassigned</option>
            <option v-for="staff in staffMembers" :key="staff.id" :value="staff.id">
              {{ staff.name }} ({{ staff.email }})
            </option>
          </select>
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {{ isSubtask ? 'Update Subtask' : 'Update Task' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Define the task update type to match your database schema
interface TaskUpdate {
  task_name: string
  start_date: string
  end_date: string | null
  status: string
  description: string | null
  assignee_id: number | null
}

const props = defineProps<{
  isOpen: boolean
  task: any | null
  isSubtask?: boolean
  role?: 'staff' | 'manager'
  currentUser?: string
  teamMembers?: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'task-updated', task: any): void
}>()

// form state
const title = ref('')
const startDate = ref('')
const dueDate = ref('')
const status = ref('not-started')
const description = ref('')
const subtasks = ref<{ title: string; dueDate: string }[]>([])
const assignedTo = ref('')

// staff members for assignee dropdown
const staffMembers = ref<{ id: number; name: string; email: string }[]>([])

// feedback state
const successMessage = ref('')
const errorMessage = ref('')

// Load staff members and populate form when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.task) {
    // Load staff members from staff table
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, fullname, email')
      
    if (!staffError && staffData) {
      staffMembers.value = (staffData as any[]).map((staff: any) => ({
        id: staff.id,
        name: staff.fullname,
        email: staff.email || `${staff.fullname.toLowerCase().replace(/\s+/g, '.')}@needtochangethiscode.com`
      }))
    }

    // Populate form with existing task data
    populateForm()
  }
})

function populateForm() {
  if (!props.task) return

  title.value = props.task.title || props.task.task_name || ''
  
  // Handle date formatting
  const startDateValue = props.task.startDate || props.task.start_date
  if (startDateValue) {
    const date = new Date(startDateValue)
    if (!isNaN(date.getTime())) {
      const isoString = date.toISOString()
      startDate.value = isoString.split('T')[0] || ''
    }
  } else {
    startDate.value = ''
  }
  
  const dueDateValue = props.task.dueDate || props.task.end_date
  if (dueDateValue) {
    const date = new Date(dueDateValue)
    if (!isNaN(date.getTime())) {
      const isoString = date.toISOString()
      dueDate.value = isoString.split('T')[0] || ''
    }
  } else {
    dueDate.value = ''
  }
  
  status.value = props.task.status || 'not-started'
  description.value = props.task.description || props.task.notes || ''
  
  // Handle subtasks if they exist
  if (props.task.subtasks && Array.isArray(props.task.subtasks)) {
    subtasks.value = props.task.subtasks.map((subtask: any) => ({
      title: subtask.title || '',
      dueDate: subtask.dueDate ? new Date(subtask.dueDate).toISOString().split('T')[0] : ''
    }))
  } else {
    subtasks.value = []
  }
  
  // Handle assignee - might need to map from assignee name to ID
  assignedTo.value = props.task.assignee_id || ''
}

// Watch startDate changes and clear dueDate if it becomes invalid
watch(startDate, (newStartDate) => {
  if (dueDate.value && newStartDate && dueDate.value < newStartDate) {
    dueDate.value = ''
  }
})

function addSubtask() {
  subtasks.value.push({ title: '', dueDate: '' })
}

function removeSubtask(index: number) {
  subtasks.value.splice(index, 1)
}

async function updateTask() {
  try {
    if (!title.value.trim()) {
      errorMessage.value = 'Task title is required.'
      return
    }

    if (!props.task || !props.task.id) {
      errorMessage.value = 'Task ID is missing.'
      return
    }

    if (!user.value) {
      errorMessage.value = 'You must be logged in to update a task.'
      return
    }

    // Clear any previous messages
    errorMessage.value = ''
    successMessage.value = ''

    const taskData: TaskUpdate = {
      task_name: title.value,
      start_date: startDate.value ? new Date(startDate.value).toISOString() : new Date().toISOString(),
      end_date: dueDate.value ? new Date(dueDate.value).toISOString() : null,
      status: status.value,
      description: description.value || null,
      assignee_id: assignedTo.value ? parseInt(assignedTo.value) : null,
    }

    // Update task via API endpoint
    const response = await $fetch(`/api/tasks/${props.task.id}`, {
      method: 'PUT',
      body: taskData
    })

    if (!response.success) {
      throw new Error('Failed to update task')
    }

    // Emit the updated task data
    emit('task-updated', response.task)

    // Show success feedback
    successMessage.value = props.isSubtask ? 'Subtask updated successfully!' : 'Task updated successfully!'

    // Close modal after short delay
    setTimeout(() => {
      successMessage.value = ''
      emit('close')
    }, 1000)
  } catch (err: any) {
    console.error('Error updating task:', err)
    errorMessage.value = err.message || 'Something went wrong. Task was not updated.'
    successMessage.value = ''
  }
}
</script>

<style scoped>
.modal-backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px); /* Safari support */
}

/* Fallback for browsers that don't support backdrop-filter */
@supports not (backdrop-filter: blur(8px)) {
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.6);
  }
}
</style>
