<template>
  <div
    v-if="isOpen"
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    @click="$emit('close')"
  >
    
    <!-- Modal content -->
    <div 
      class="relative bg-white rounded-xl shadow-lg w-full max-w-5xl p-6 min-h-[60vh] max-h-[90vh] overflow-y-auto z-10"
      @click.stop
    >
      <h2 class="text-xl font-semibold mb-4">Create New Task</h2>

      <!-- Feedback Messages -->
       <!-- this is still not working im sorry ill cont laterr -->
      <div v-if="successMessage" class="mb-4 p-3 rounded bg-green-100 text-green-700">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="mb-4 p-3 rounded bg-red-100 text-red-700">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="createTask" class="space-y-4">
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
            class="w-full border rounded-lg px-3 py-2 cursor-pointer"
            @click="($event.target as HTMLInputElement)?.showPicker?.()"
          />
        </div>

        <!-- Due Date -->
        <div>
          <label class="block text-sm font-medium mb-1">Due Date</label>
          <input
            v-model="dueDate"
            type="date"
            :min="startDate"
            class="w-full border rounded-lg px-3 py-2 cursor-pointer"
            @click="($event.target as HTMLInputElement)?.showPicker?.()"
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
          <div v-for="(subtask, index) in subtasks" :key="index" class="border rounded-lg p-3 mb-3 bg-gray-50">
            <!-- Subtask Header -->
            <div class="flex gap-2 mb-2">
              <input
                v-model="subtask.title"
                type="text"
                placeholder="Subtask Title"
                class="flex-1 border rounded-lg px-3 py-2"
                required
              />
              <button
                type="button"
                @click="toggleSubtaskExpanded(index)"
                class="px-3 py-2 bg-white border border-gray-300 text-black rounded-lg hover:bg-gray-50 text-sm"
                :title="subtask.expanded ? 'Collapse details' : 'Expand details'"
              >
                <span class="inline-block transition-transform duration-200" :class="{ '-rotate-90': !subtask.expanded }">▼</span> Details
              </button>
              <button
                type="button"
                @click="removeSubtask(index)"
                class="px-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                ✕
              </button>
            </div>

            <!-- Expanded Subtask Details -->
            <div v-if="subtask.expanded" class="space-y-3 mt-3 pl-4 border-l-2 border-blue-200">
              <!-- Start Date & Due Date -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium mb-1">Start Date</label>
                  <input
                    v-model="subtask.startDate"
                    type="date"
                    class="w-full border rounded-lg px-2 py-1 text-sm cursor-pointer"
                    @click="($event.target as HTMLInputElement)?.showPicker?.()"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium mb-1">Due Date</label>
                  <input
                    v-model="subtask.dueDate"
                    type="date"
                    class="w-full border rounded-lg px-2 py-1 text-sm cursor-pointer"
                    @click="($event.target as HTMLInputElement)?.showPicker?.()"
                  />
                </div>
              </div>

              <!-- Status & Assignee -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium mb-1">Status</label>
                  <select
                    v-model="subtask.status"
                    class="w-full border rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium mb-1">Assign To</label>
                  <select
                    v-model="subtask.assignedTo"
                    class="w-full border rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="">Unassigned</option>
                    <option v-for="staff in staffMembers" :key="staff.id" :value="staff.id">
                      {{ staff.name }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs font-medium mb-1">Description</label>
                <textarea
                  v-model="subtask.description"
                  rows="2"
                  placeholder="Subtask description..."
                  class="w-full border rounded-lg px-2 py-1 text-sm"
                ></textarea>
              </div>
            </div>
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
            Create Task
          </button>
        </div>
      </form>

      <!-- Confirmation Dialog -->
      <div
        v-if="showDeleteConfirmation"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50"
        @click="cancelDelete"
      >
        <div
          class="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg"
          @click.stop
        >
          <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
          <p class="text-gray-600 mb-6">Are you sure you want to delete this subtask?</p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="cancelDelete"
              class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              No
            </button>
            <button
              type="button"
              @click="confirmDelete"
              class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
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

const supabase = useSupabaseClient()

const props = defineProps<{
  isOpen: boolean
  project?: string | null
  role: 'staff' | 'manager'
  currentUser: string
  teamMembers?: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'task-created', task: any): void
}>()

// form state
const title = ref('')
const startDate = ref(new Date().toISOString().split('T')[0])
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

// TODO: STAFF MODULE INTEGRATION REQUIRED
// staff members for assignee dropdown - will show staff fullname and email only
const staffMembers = ref<{ id: number; name: string; email: string }[]>([])

// Load staff members when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
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
  }
})

// feedback state
const successMessage = ref('')
const errorMessage = ref('')

// confirmation dialog state
const showDeleteConfirmation = ref(false)
const pendingDeleteIndex = ref<number | null>(null)

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

async function createTask() {
  try {
    if (!title.value.trim()) {
      errorMessage.value = 'Task title is required.'
      return
    }

    // Clear any previous messages
    errorMessage.value = ''
    successMessage.value = ''

    const taskData = {
      task_name: title.value,
      start_date: startDate.value || null,
      end_date: dueDate.value || null,
      status: status.value,
      description: description.value || null,
      project_id: null, // No project assignment initially - can be assigned later
      assignee_id: assignedTo.value ? parseInt(assignedTo.value) : null,
    }

    // Create task via API endpoint
    const response = await $fetch('/api/tasks', {
      method: 'POST',
      body: taskData
    })

    if (!response.success) {
      throw new Error('Failed to create task')
    }

    // Note: Subtasks are not supported in the current database schema
    // If you want to support subtasks, you'll need to add a parent_task_id column
    // or store subtasks in a separate table

    // Emit the created task data
    emit('task-created', response.task)

    // Show success feedback
    successMessage.value = 'Task created successfully!'

    // Reset form after short delay
    setTimeout(() => {
      successMessage.value = ''
      title.value = ''
      startDate.value = new Date().toISOString().split('T')[0]
      dueDate.value = ''
      status.value = 'not-started'
      description.value = ''
      subtasks.value = []
      assignedTo.value = ''
      emit('close')
    }, 1000)
  } catch (err: any) {
    console.error('Error creating task:', err)
    errorMessage.value = err.message || 'Something went wrong. Task was not created.'
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