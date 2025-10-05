<template>
  <div v-if="isOpen" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    @click="$emit('close')">

    <!-- Modal content -->
    <div
      class="relative bg-white rounded-xl shadow-lg w-full max-w-[45vw] p-6 h-[80vh] overflow-y-auto z-10 flex flex-col"
      @click.stop>
      <h2 class="text-xl font-semibold mb-4">Create New Task</h2>

      <!-- Feedback Messages -->
      <div v-if="successMessage" class="flex-1 flex items-center justify-center">
        <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 text-green-800 rounded-xl p-8 flex flex-col items-center justify-center gap-6 min-w-[320px] min-h-[140px] shadow-lg">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <span class="text-lg font-semibold text-center">{{ successMessage }}</span>
          </div>
          <Button variant="outline" @click="handleSuccessOk" class="bg-white hover:bg-green-50 border-green-300 text-green-700 hover:text-green-800 px-6 py-2">OK</Button>
        </div>
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
        <div class="grid grid-cols-3 gap-4">
          <!-- Start Date -->
          <div class="flex flex-col gap-1 justify-end">
            <Label class="mb-1">
              Start Date
            </Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button variant="outline" :class="cn(
                  'w-[13vw] justify-start text-left font-normal',
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
          <div class="flex flex-col gap-1 justify-end">
            <Label class="mb-1">
              Due Date
            </Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button variant="outline" :class="cn(
                  'w-[13vw] justify-start text-left font-normal',
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

        <!-- Status, Priority -->
          <StatusDropdown v-model="status" label="Status" placeholder="Select status" />
          <PriorityDropdown v-model="priority" label="Priority" placeholder="Select priority" />
          <RepeatFrequencyDropdown v-model="repeatFrequency" label="Repeat" placeholder="Select frequency" />
        </div>
        <div>
          <AssignCombobox 
            v-model="assignedTo" 
            label="Assign To" 
            placeholder="Select assignees"
            :staff-members="staffMembers" 
          />
        </div>
        <!-- Notes -->
        <div>
          <Label>
            Notes
          </Label>
          <textarea v-model="notes" rows="3" class="w-full border rounded-lg px-3 py-2"></textarea>
        </div>

        <!-- Subtasks -->
        <div>
          <label class="block text-sm font-medium mb-2">Subtasks</label>
          <div v-for="(subtask, index) in subtasks" :key="index" class="border rounded-lg p-3 mb-3 bg-gray-50">
            <!-- Subtask Header -->
            <div class="flex gap-2 mb-2">
              <Input v-model="subtask.title" type="text" placeholder="Subtask Title"
                class="flex-1 border rounded-lg px-3 py-2 bg-white" required />
              <Button type="button" @click="toggleSubtaskExpanded(index)"
                class="px-3 py-2 bg-white border border-gray-300 text-black rounded-lg hover:bg-gray-50 text-sm"
                :title="subtask.expanded ? 'Collapse details' : 'Expand details'">
                <span class="inline-block transition-transform duration-200"
                  :class="{ '-rotate-90': !subtask.expanded }">▼</span> Details
              </Button>
              <Button type="button" @click="removeSubtask(index)"
                class="px-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                ✕
              </Button>
            </div>

            <!-- Expanded Subtask Details -->
            <div v-if="subtask.expanded" class="space-y-3 mt-3 pl-4 border-l-2 border-blue-200">
              <!-- Status & Assignee -->
              <StatusDropdown v-model="subtask.status" label="Status" placeholder="Select status" compact />
              <AssignCombobox v-model="subtask.assignedTo" label="Assign To" placeholder="Select assignee" :staff-members="staffMembers" compact/>
              <!-- Notes -->
              <div>
                <label class="block text-xs font-medium mb-1">Notes</label>
                <textarea v-model="subtask.notes" rows="2" placeholder="Subtask notes..."
                  class="w-full border rounded-lg px-2 py-1 text-sm bg-white"></textarea>
              </div>
            </div>
          </div>
          <Button variant="outline" @click="addSubtask" class="bg-gray-100 hover:bg-gray-200 text-sm">
            + Add Subtask
          </Button>
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
import PriorityDropdown from './priority-dropdown.vue'
import RepeatFrequencyDropdown from './repeat-freq-dropdown.vue'
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
const priority = ref('1') // New priority field
const repeatFrequency = ref('never') // New repeat frequency field
const notes = ref('')
const subtasks = ref<{
  title: string;
  startDate: CalendarDate;
  dueDate: CalendarDate;
  status: string;
  priority: string; // New subtask priority
  notes: string;
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
    startDate.value = parseDate(today)
    dueDate.value = parseDate(today)
    title.value = ''
    status.value = 'not-started'
    priority.value = '1'
    repeatFrequency.value = 'never'
    notes.value = ''
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
    priority: '1', // Default priority for new subtasks
    notes: '',
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
  priority.value = '1'
  repeatFrequency.value = 'never'
  notes.value = ''
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

    if (dueDate.value && startDate.value && dueDate.value < startDate.value) {
      errorMessage.value = 'Due date cannot be before start date.'
      return
    }

    errorMessage.value = ''
    successMessage.value = ''
    
    const taskData = {
      title: title.value,
      start_date: startDate.value ? startDate.value.toString() : null,
      due_date: dueDate.value ? dueDate.value.toString() : null,
      status: status.value,
      priority: priority.value,
      repeat_frequency: repeatFrequency.value,
      notes: notes.value || null,
      project_id: props.project ? Number(props.project) : null,
      subtasks: subtasks.value.map(subtask => ({
        title: subtask.title,
        start_date: startDate.value ? startDate.value.toString() : null,
        due_date: dueDate.value ? dueDate.value.toString() : null,
        status: subtask.status,
        priority: subtask.priority,
        notes: subtask.notes || null,
      }))
    }

    // create task
    const taskResp = await $fetch('/api/tasks', {
      method: 'POST',
      body: taskData
    })

    if (!taskResp || !taskResp.success) {
      throw new Error(taskResp?.statusMessage || 'Failed to create task')
    }

    const created = taskResp.task

    // Assign main task assignees
    const assigneeIds = assignedTo.value.map(id => Number(id))

    if (assigneeIds.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 150))
      
      try {
        const mapResp = await $fetch('/api/assignee', {
          method: 'POST',
          body: {
            task_id: created.id,
            assignee_ids: assigneeIds
          }
        })
      } catch (error: any) {
        throw new Error('Failed to assign users to task')
      }
    }
    // Assign subtask assignees
      if (taskResp.subtasks && Array.isArray(taskResp.subtasks)) {
        for (let i = 0; i < subtasks.value.length; i++) {
          const localSubtask = subtasks.value[i]
          const createdSubtask = taskResp.subtasks[i]
          
          
        const subtaskAssigneeIds = localSubtask.assignedTo.map(id => Number(id))
          try {
            const assigneeResp = await $fetch('/api/assignee', {
              method: 'POST',
              body: {
                task_id: createdSubtask.id,
                assignee_ids: subtaskAssigneeIds
              }
            })
          } catch (error: any) {
            console.error(`Failed to assign users to subtask ${createdSubtask.id}:`, error.data || error.message)
          }
          
          // Small delay to prevent race conditions
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

    createdTask.value = created
    successMessage.value = 'Task created successfully!'
  } catch (err: any) {
    console.error('Error creating task:', err)
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Something went wrong. Task was not created.'
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