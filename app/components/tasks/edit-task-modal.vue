<template>
  <div v-if="isOpen" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    @click="$emit('close')">

    <!-- Modal content -->
    <div
      class="relative bg-white rounded-xl shadow-lg w-full max-w-5xl p-6 min-h-[60vh] max-h-[90vh] overflow-y-auto z-10"
      @click.stop>
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
          <input v-model="title" type="text" required
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <!-- Start Date & Due Date -->
        <div class="grid grid-cols-2 gap-4">
          <DatePicker v-model="startDate" label="Start Date" placeholder="Select start date" />
          <DatePicker v-model="dueDate" label="Due Date" placeholder="Select due date" />
        </div>

        <!-- Status & Assignee -->
        <div class="grid grid-cols-2 gap-4">
          <StatusDropdown v-model="status" label="Status" placeholder="Select status" />
          <AssignDropdown v-model="assignedTo" label="Assign To" placeholder="Select assignee"
            :staff-members="staffMembers" />
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium mb-1">Notes / Description</label>
          <textarea v-model="description" rows="3" class="w-full border rounded-lg px-3 py-2"></textarea>
        </div>

        <!-- Subtasks -->
        <div>
          <label class="block text-sm font-medium mb-2">Subtasks</label>
          <div v-for="(subtask, index) in subtasks" :key="index" class="border rounded-lg p-3 mb-3 bg-gray-50">
            <!-- Subtask Header -->
            <div class="flex gap-2 mb-2">
              <input v-model="subtask.title" type="text" placeholder="Subtask Title"
                class="flex-1 border rounded-lg px-3 py-2" required />
              <button type="button" @click="toggleSubtaskExpanded(index)"
                class="px-3 py-2 bg-white border border-gray-300 text-black rounded-lg hover:bg-gray-50 text-sm"
                :title="subtask.expanded ? 'Collapse details' : 'Expand details'">
                <span class="inline-block transition-transform duration-200"
                  :class="{ '-rotate-90': !subtask.expanded }">▼</span> Details
              </button>
              <button type="button" @click="removeSubtask(index)"
                class="px-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                ✕
              </button>
            </div>

            <!-- Expanded Subtask Details -->
            <div v-if="subtask.expanded" class="space-y-3 mt-3 pl-4 border-l-2 border-blue-200">
              <!-- Start Date & Due Date -->
              <div class="grid grid-cols-2 gap-3">
                <DatePicker v-model="subtask.startDate" label="Start Date" placeholder="Select start date" />
                <DatePicker v-model="subtask.dueDate" label="Due Date" placeholder="Select due date" />
              </div>

              <!-- Status & Assignee -->
              <div class="grid grid-cols-2 gap-3">
                <StatusDropdown v-model="subtask.status" label="Status" placeholder="Select status" compact />
                <AssignDropdown v-model="subtask.assignedTo" label="Assign To" placeholder="Select assignee"
                  :staff-members="staffMembers" compact />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs font-medium mb-1">Description</label>
                <textarea v-model="subtask.description" rows="2" placeholder="Subtask description..."
                  class="w-full border rounded-lg px-2 py-1 text-sm"></textarea>
              </div>
            </div>
          </div>
          <button type="button" @click="addSubtask" class="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">
            + Add Subtask
          </button>
        </div>


        <div class="flex justify-end gap-2">
          <button type="button" @click="$emit('close')"
            class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            {{ isSubtask ? 'Update Subtask' : 'Update Task' }}
          </button>
        </div>
      </form>

      <!-- Confirmation Dialog -->
      <div v-if="showDeleteConfirmation"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50" @click="cancelDelete">
        <div class="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg" @click.stop>
          <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
          <p class="text-gray-600 mb-6">Are you sure you want to delete this subtask?</p>
          <div class="flex justify-end gap-3">
            <button type="button" @click="cancelDelete"
              class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100">
              No
            </button>
            <button type="button" @click="confirmDelete"
              class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DatePicker } from '@/components/ui/date-picker'
import { StatusDropdown } from '@/components/ui/status-dropdown'
import { AssignDropdown } from '@/components/ui/assign-dropdown'

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
const subtasks = ref<{
  title: string;
  startDate: string;
  dueDate: string;
  status: string;
  description: string;
  assignedTo: string;
  expanded: boolean;
}[]>([])
const assignedTo = ref('')

// staff members for assignee dropdown
const staffMembers = ref<{ id: number; name: string; email: string }[]>([])

// feedback state
const successMessage = ref('')
const errorMessage = ref('')

// confirmation dialog state
const showDeleteConfirmation = ref(false)
const pendingDeleteIndex = ref<number | null>(null)

// Load staff members and populate form when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.task) {
    try {
      const staffData = await $fetch<{ id: number; fullname: string; email?: string }[]>('/api/staff')

      staffMembers.value = staffData.map(staff => ({
        id: staff.id,
        name: staff.fullname,
        email: staff.email || `${staff.fullname.toLowerCase().replace(/\s+/g, '.')}@needtochangethiscode.com`
      }))
    } catch (err) {
      console.error('Failed to load staff', err)
      staffMembers.value = [] // fallback to empty array
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
  subtasks.value.push({
    title: '',
    startDate: new Date().toISOString().split('T')[0] || '',
    dueDate: '',
    status: 'not-started',
    description: '',
    assignedTo: '',
    expanded: false
  })
}

function removeSubtask(index: number) {
  pendingDeleteIndex.value = index
  showDeleteConfirmation.value = true
}

function confirmDelete() {
  if (pendingDeleteIndex.value !== null) {
    subtasks.value.splice(pendingDeleteIndex.value, 1)
  }
  cancelDelete()
}

function cancelDelete() {
  showDeleteConfirmation.value = false
  pendingDeleteIndex.value = null
}

function toggleSubtaskExpanded(index: number) {
  const subtask = subtasks.value[index]
  if (subtask) {
    subtask.expanded = !subtask.expanded
  }
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
  -webkit-backdrop-filter: blur(8px);
  /* Safari support */
}

/* Fallback for browsers that don't support backdrop-filter */
@supports not (backdrop-filter: blur(8px)) {
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.6);
  }
}
</style>
