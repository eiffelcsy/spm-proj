<template>
  <div v-if="isOpen" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    @click="$emit('close')">

    <!-- Modal content -->
    <div
      class="relative bg-white rounded-xl shadow-lg w-full max-w-5xl p-6 min-h-[60vh] max-h-[90vh] overflow-y-auto z-10"
      @click.stop>
      <h2 class="text-xl font-semibold mb-4">Create New Task</h2>

      <!-- Feedback Messages -->
      <div v-if="successMessage" class="mb-4 p-3 rounded bg-green-100 text-green-700">
        <span>{{ successMessage }}</span>
        <Button variant="outline" @click="handleSuccessOk" class="ml-4">OK</Button>
      </div>
      <div v-if="errorMessage" class="mb-4 p-3 rounded bg-red-100 text-red-700">
        {{ errorMessage }}
      </div>
      <form v-if="!successMessage" @submit.prevent="createTask" class="space-y-4">
        
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium mb-1">Task Title</label>
            <Input v-model="title" type="text" required
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <!-- Start Date & Due Date -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Start Date -->
            <div class="flex flex-col">
              <Label class="mb-1">
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button variant="outline" :class="cn(
                    'w-[280px] justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground',
                  )">
                    <CalendarIcon class="mr-2 h-4 w-4" />
                    {{ startDate ? formatDate(startDate) : "Select start date" }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0">
                  <Calendar v-model="startDate" initial-focus />
                </PopoverContent>
              </Popover>
            </div>
            <!-- Due Date -->
            <div class="flex flex-col">
              <Label class="mb-1">
                Due Date
              </Label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button variant="outline" :class="cn(
                    'w-[280px] justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground',
                  )">
                    <CalendarIcon class="mr-2 h-4 w-4" />
                    {{ dueDate ? formatDate(dueDate) : "Select due date" }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0">
                  <Calendar v-model="dueDate" initial-focus :min-value="startDate" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <!-- Status & Assignee -->
          <div class="grid grid-cols-2 gap-4">
            <StatusDropdown v-model="status" label="Status" placeholder="Select status" />
            <AssignCombobox v-model="assignedTo" label="Assign To" placeholder="Select assignees"
              :staff-members="staffMembers" />
          </div>

          <!-- Notes -->
          <div>
            <Label>
              Description
            </Label>
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
                </div>

                <!-- Status & Assignee -->
                <div class="grid grid-cols-2 gap-3">
                  <StatusDropdown v-model="subtask.status" label="Status" placeholder="Select status" compact />
                  <AssignCombobox v-model="subtask.assignedTo" label="Assign To" placeholder="Select assignee"
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
            <Button variant="outline" @click="handleCancel">
              Cancel
            </Button>
            <Button type="submit">
              Create Task
            </Button>
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
import { StatusDropdown } from '@/components/task-modals/status-dropdown'
// import { AssignDropdown } from '@/components/task-modals/assign-dropdown'
import { AssignCombobox } from '@/components/task-modals/assign-combobox'
import { Input } from '@/components/ui/input'
import type { CalendarDate } from '@internationalized/date'
import { parseDate, getLocalTimeZone } from '@internationalized/date'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

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

const createdTask = ref<any>(null)

// form state
const today = new Date().toISOString().split('T')[0]
const title = ref('')
const startDate = ref<CalendarDate>(parseDate(today))
const dueDate = ref<CalendarDate>(parseDate(today))
const status = ref('not-started')
const description = ref('')
const subtasks = ref<{
  title: string;
  startDate: CalendarDate;
  dueDate: CalendarDate;
  status: string;
  description: string;
  assignedTo: string[];
  expanded: boolean;
}[]>([])
const assignedTo = ref<string[]>([])

// staff members for assignee dropdown - will show staff fullname and email only
const staffMembers = ref<{ id: number; fullname: string; email: string }[]>([])

// Load staff members when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (!isOpen) return
  try {
    // const todayStr = new Date().toISOString().split('T')[0]
    startDate.value = parseDate(today)
    dueDate.value = parseDate(today)
    title.value = ''
    status.value = 'not-started'
    description.value = ''
    assignedTo.value = []
    subtasks.value = []
    errorMessage.value = ''
    successMessage.value = ''

    staffMembers.value = (await $fetch<{ id: number; fullname: string; email?: string }[]>('/api/staff'))
      .map(staff => ({
        ...staff,
        fullname: staff.fullname,
        email: staff.email ?? `${staff.fullname.toLowerCase().replace(/\s+/g, '.')}@needtochangethiscode.com`
      }))
  } catch (err) {
    console.error('Failed to load staff', err)
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
    dueDate.value = newStartDate
  }
})

function addSubtask() {
  subtasks.value.push({
    title: '',
    startDate: parseDate(new Date().toISOString().split('T')[0] || ''),
    dueDate: parseDate(new Date().toISOString().split('T')[0] || ''),
    status: 'not-started',
    description: '',
    assignedTo: [],
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

function resetForm() {
  title.value = ''
  startDate.value = parseDate(today)
  dueDate.value = parseDate(today)
  status.value = 'not-started'
  description.value = ''
  subtasks.value = []
  assignedTo.value = []
  errorMessage.value = ''
  successMessage.value = ''
}

function handleCancel() {
  resetForm()
  emit('close')
}
function handleSuccessOk() {
  // emit the created task to parent now, then reset and close
  if (createdTask.value) {
    emit('task-created', createdTask.value)
    createdTask.value = null
  }
  resetForm()
  emit('close')
}

async function createTask() {
  try {
    if (!title.value.trim()) {
      errorMessage.value = 'Task title is required.'
      return
    }

    // Validate due date
    if (dueDate.value && startDate.value && dueDate.value < startDate.value) {
      errorMessage.value = 'Due date cannot be before start date.'
      return
    }

    // Clear any previous messages
    errorMessage.value = ''
    successMessage.value = ''
    
    // for multiple assignees:
    // const assignedTo = ref<string[]>([]) // array of staff IDs
    // assignee_ids: assignedTo.value.map(id => parseInt(id)), // send array of numbers

    const taskData = {
      title: title.value,
      start_date: startDate.value ? startDate.value.toString() : null,
      due_date: dueDate.value ? dueDate.value.toString() : null,
      status: status.value,
      description: description.value || null,
      notes: null, // not implemented yet
      project_id: null,
      assignee_id: assignedTo.value.length > 0 ? parseInt(assignedTo.value[0]) : null,
      creator_id: 0, //TODO: owen is default for now, will need to get from session later
      parent_task_id: null 
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
    createdTask.value = response.task
    successMessage.value = 'Task created successfully!'
    
  } catch (err: any) {
    console.error('Error creating task:', err)
    errorMessage.value = err.message || 'Something went wrong. Task was not created.'
    successMessage.value = ''
  }
}

function formatDate(date: CalendarDate) {
  const jsDate = date.toDate(getLocalTimeZone())
  const day = String(jsDate.getDate()).padStart(2, '0')
  const month = String(jsDate.getMonth() + 1).padStart(2, '0')
  const year = jsDate.getFullYear()
  return `${day}/${month}/${year}`
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