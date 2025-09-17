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
            Create Task
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

// Define the task insert type to match your database schema
interface TaskInsert {
  task_name: string
  start_date: string
  end_date: string | null
  status: string
  description: string | null
  project_id: number | null
  creator_id: number
  assignee_id: number | null
}

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
const subtasks = ref<{ title: string; dueDate: string }[]>([])
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

async function createTask() {
  try {
    if (!title.value.trim()) {
      errorMessage.value = 'Task title is required.'
      return
    }

    if (!user.value) {
      errorMessage.value = 'You must be logged in to create a task.'
      return
    }

    // Clear any previous messages
    errorMessage.value = ''
    successMessage.value = ''

    // TODO: STAFF MODULE INTEGRATION REQUIRED
    // Replace this with actual staff_id lookup once staff module is implemented
    // This should query user_staff_mapping table to get staff_id for current user
    /*
    const { data: staffMapping, error: staffError } = await supabase
      .from('user_staff_mapping')
      .select('staff_id')
      .eq('user_id', user.value.id)
      .single()
    
    if (staffError || !staffMapping) {
      errorMessage.value = 'Unable to find your staff record. Please contact administrator.'
      return
    }
    
    const staffId = staffMapping.staff_id
    */
    
    // TEMPORARY: Using placeholder staff_id until staff module is ready
    const staffId = 1 // Replace with actual staff_id lookup above

    const taskData: TaskInsert = {
      task_name: title.value,
      start_date: startDate.value ? new Date(startDate.value).toISOString() : new Date().toISOString(),
      end_date: dueDate.value ? new Date(dueDate.value).toISOString() : null,
      status: status.value,
      description: description.value || null,
      project_id: null, // No project assignment initially - can be assigned later
      creator_id: staffId, // TODO: STAFF MODULE - This will come from user_staff_mapping lookup
      assignee_id: assignedTo.value ? parseInt(assignedTo.value) : null, // TODO: STAFF MODULE - Convert selected staff_id to int8
    }

    // Insert task into Supabase
    // Note: Using 'as any' for the insert due to Supabase type generation limitations
    // The TaskInsert interface above ensures our data structure is correct
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData as any])
      .select()

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from task creation')
    }

    // Note: Subtasks are not supported in the current database schema
    // If you want to support subtasks, you'll need to add a parent_task_id column
    // or store subtasks in a separate table

    // Emit the created task data
    emit('task-created', data[0] as any)

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
    console.error('Error details:', {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    })
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