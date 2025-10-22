<template>
  <Dialog :open="isOpen" @update:open="handleDialogClose">
    <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Fill in the details below to create a new task.
        </DialogDescription>
      </DialogHeader>

      <!-- Success Message -->
      <div v-if="successMessage" class="flex-1 flex items-center justify-center py-8">
        <div
          class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 text-green-800 rounded-xl p-8 flex flex-col items-center justify-center gap-6 min-w-[320px] shadow-lg">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <span class="text-lg font-semibold text-center">{{ successMessage }}</span>
          </div>
          <Button variant="outline" @click="handleSuccessOk"
            class="bg-white hover:bg-green-50 border-green-300 text-green-700 hover:text-green-800 px-6 py-2">OK</Button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-4 p-3 rounded bg-red-100 text-red-700">
        {{ errorMessage }}
      </div>

      <form v-if="!successMessage" @submit.prevent="createTask" class="space-y-4">

        <!-- Title -->
        <div>
          <Label class="block text-sm font-medium mb-1">Task Title</Label>
          <Input v-model="title" type="text" required
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Task Title" />
        </div>

        <!-- Start Date & Due Date -->
        <div class="grid grid-cols-3 gap-4">
          <!-- Start Date -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">
              Start Date
            </Label>
            <Popover>
              <PopoverTrigger as-child>
                <Button variant="outline" :class="cn(
                  'justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground',
                )">
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{ startDate ? formatDate(startDate as DateValue) : "Select start date" }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model:model-value="startDate as any" initial-focus />
              </PopoverContent>
            </Popover>
          </div>
          
          <!-- Due Date -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">
              Due Date
              <span v-if="repeatInterval > 0" class="text-xs text-muted-foreground ml-1">(Auto-set)</span>
            </Label>
            <Popover :disabled="repeatInterval > 0">
              <PopoverTrigger as-child>
                <Button variant="outline" :class="cn(
                  'justify-start text-left font-normal',
                  !dueDate && 'text-muted-foreground',
                  repeatInterval > 0 && 'opacity-60 cursor-not-allowed'
                )" :disabled="repeatInterval > 0">
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{ dueDate ? formatDate(dueDate as DateValue) : "Select due date" }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model:model-value="dueDate as any" initial-focus :min-value="startDate as any" />
              </PopoverContent>
            </Popover>
            <p v-if="repeatInterval > 0" class="text-xs text-muted-foreground mt-1">
              Due date is automatically set to {{ repeatInterval }} day(s) from start date
            </p>
          </div>

          <!-- Status -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">Status</Label>
            <Select v-model="status">
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Priority -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">Priority</Label>
            <NumberField v-model="priority" :min="1" :max="10" :default-value="1">
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
          </div>

          <!-- Repeat Interval -->
          <div class="flex flex-col gap-1">
            <Label class="mb-1">Repeat Interval (in Days)</Label>
            <NumberField v-model="repeatInterval" :min="0" :default-value="0">
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
          </div>

          <!-- Project Selection -->
          <div>
            <Label class="block text-sm font-medium mb-1">Project</Label>
            <template v-if="isProjectLocked">
              <div class="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3">
                <div class="text-sm font-medium">
                  {{ lockedProjectName || (projects.find(p => String(p.id) === selectedProjectId)?.name)}}
                </div>
              </div>
            </template>
            <!-- Normal selectable project dropdown -->
            <template v-else>
              <Select v-model="selectedProjectId">
                <SelectTrigger>
                  <SelectValue
                    :placeholder="projects.find(p => String(p.id) === selectedProjectId)?.name || 'Select project'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="project in projects" :key="project.id" :value="String(project.id)">
                    {{ project.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </template>
          </div>
        </div>

        <!-- Tags -->
        <div>
          <Label class="block text-sm font-medium mb-1">Tags</Label>
          <TagsInput v-model="taskTags" class="w-full">
            <TagsInputItem v-for="tag in taskTags" :key="tag" :value="tag">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>
            <TagsInputInput placeholder="Add tags (eg. #SMU, #Urgent)" />
          </TagsInput>
          <p class="text-xs text-muted-foreground mt-1">Place a # before each tag (eg. #SMU) and press the Enter key to add a tag</p>
        </div>

        <div>
          <AssignCombobox v-model="assignedTo" label="Assign To" placeholder="Select assignees"
            :staff-members="staffMembers" />
        </div>

        <!-- Notes -->
        <div>
          <Label>
            Notes
          </Label>
          <Textarea v-model="notes" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Add notes here..."></Textarea>
        </div>

        <!-- Subtasks -->
        <div>
          <Label class="block text-sm font-medium mb-2">Subtasks</Label>
          <div class="border rounded-lg p-3 mb-3">
            <div v-for="(subtask, index) in subtasks" :key="index" class="border rounded-lg p-3 mb-3">
              <!-- Subtask Header -->
              <div class="flex gap-2 mb-2">
                <Input v-model="subtask.title" type="text" placeholder="Subtask Title"
                  class="flex-1 border rounded-lg px-3 py-2 bg-white" required />
                <Button type="button" @click="toggleSubtaskExpanded(index)" variant="outline" class="px-3 py-2"
                  :title="subtask.expanded ? 'Collapse details' : 'Expand details'">
                  <span class="inline-block transition-transform duration-200"
                    :class="{ '-rotate-90': !subtask.expanded }">▼</span> Details
                </Button>
                <Button type="button" @click="removeSubtask(index)" variant="destructive" class="px-2">
                  <XIcon class="h-4 w-4" />
                </Button>
              </div>

              <!-- Expanded Subtask Details -->
              <div v-if="subtask.expanded" class="space-y-3 mt-3 pl-4">
                <!-- Start Date & Due Date -->
                <div class="grid grid-cols-2 gap-2">
                  <!-- Start Date -->
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Start Date</Label>
                    <Popover>
                      <PopoverTrigger as-child>
                        <Button variant="outline" :class="cn(
                          'h-8 justify-start text-left font-normal text-xs',
                          !subtask.startDate && 'text-muted-foreground',
                        )">
                          <CalendarIcon class="mr-1 h-3 w-3" />
                          {{ subtask.startDate ? formatDate(subtask.startDate as DateValue) : "Select start date" }}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent class="w-auto p-0">
                        <Calendar v-model:model-value="subtask.startDate as any" initial-focus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <!-- Due Date -->
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">
                      Due Date
                      <span v-if="subtask.repeatInterval > 0" class="text-xs text-muted-foreground ml-1">(Auto-set)</span>
                    </Label>
                    <Popover :disabled="subtask.repeatInterval > 0">
                      <PopoverTrigger as-child>
                        <Button variant="outline" :class="cn(
                          'h-8 justify-start text-left font-normal text-xs',
                          !subtask.dueDate && 'text-muted-foreground',
                          subtask.repeatInterval > 0 && 'opacity-60 cursor-not-allowed'
                        )" :disabled="subtask.repeatInterval > 0">
                          <CalendarIcon class="mr-1 h-3 w-3" />
                          {{ subtask.dueDate ? formatDate(subtask.dueDate as DateValue) : "Select due date" }}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent class="w-auto p-0">
                        <Calendar v-model:model-value="subtask.dueDate as any" initial-focus
                          :min-value="subtask.startDate as any" />
                      </PopoverContent>
                    </Popover>
                    <p v-if="subtask.repeatInterval > 0" class="text-[10px] text-muted-foreground mt-0.5">
                      Auto-set to {{ subtask.repeatInterval }} day(s) from start
                    </p>
                  </div>
                </div>

                <!-- Status, Priority, Repeat Interval -->
                <div class="grid grid-cols-3 gap-2">
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Status</Label>
                    <Select v-model="subtask.status">
                      <SelectTrigger class="h-8">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-started">Not Started</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Priority</Label>
                    <NumberField v-model="subtask.priority" :min="1" :max="10" :default-value="1" class="h-8">
                      <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput class="text-xs" />
                        <NumberFieldIncrement />
                      </NumberFieldContent>
                    </NumberField>
                  </div>
                  <div class="flex flex-col gap-1">
                    <Label class="text-xs mb-1">Repeat Interval (in Days)</Label>
                    <NumberField v-model="subtask.repeatInterval" :min="0" :default-value="0" class="h-8">
                      <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput class="text-xs" />
                        <NumberFieldIncrement />
                      </NumberFieldContent>
                    </NumberField>
                  </div>
                </div>
                <!-- Tags -->
                <div>
                  <Label class="block text-xs font-medium mb-1">Tags</Label>
                  <TagsInput v-model="subtask.tags" class="w-full">
                    <TagsInputItem v-for="tag in subtask.tags" :key="tag" :value="tag">
                      <TagsInputItemText />
                      <TagsInputItemDelete />
                    </TagsInputItem>
                    <TagsInputInput placeholder="Add tags (eg. #SMU, #Urgent)" />
                  </TagsInput>
                  <p class="text-xs text-muted-foreground mt-1">Place a # before each tag (eg. #SMU) and press the Enter key to add a tag</p>
                </div>

                <!-- Assignee -->
                <div class="flex flex-col gap-1 text-xs">
                  <!-- limit subtask assignee options to the parent task assignees -->
                  <AssignCombobox
                    v-model="subtask.assignedTo"
                    label="Assign To"
                    placeholder="Select assignee"
                    :staff-members="staffMembers.filter(s => assignedTo.includes(String(s.id)))"
                    compact
                  />
                </div>

                <!-- Notes -->
                <div class="flex flex-col gap-1">
                  <Label class="text-xs mb-1">Notes</Label>
                  <Textarea v-model="subtask.notes" rows="2" placeholder="Add subtask notes here..."
                    class="w-full border rounded-lg px-2 py-1 text-sm bg-white"></Textarea>
                </div>
              </div>
            </div>
            <Button variant="outline" @click="addSubtask">
              <PlusIcon class="h-4 w-4 mr-2" />
              Add Subtask
            </Button>
          </div>
        </div>
      </form>

      <DialogFooter v-if="!successMessage" class="gap-2">
        <Button variant="outline" @click="handleCancel">
          Cancel
        </Button>
        <Button @click="createTask">
          Create Task
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Delete Confirmation Dialog -->
  <Dialog :open="showDeleteConfirmation" @update:open="(val) => { if (!val) cancelDelete() }">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this subtask?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" @click="cancelDelete">
          No
        </Button>
        <Button variant="destructive" @click="confirmDelete">
          Yes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AssignCombobox } from '@/components/task-modals/assign-combobox'
import { Input } from '@/components/ui/input'
import type { CalendarDate, DateValue } from '@internationalized/date'
import { parseDate, getLocalTimeZone, today } from '@internationalized/date'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from '@/components/ui/tags-input'
import { CalendarIcon, XIcon, PlusIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import { Textarea } from '@/components/ui/textarea'
import type { StaffMember, TaskFromAPI, TaskCreateInput } from '@/types'


const props = defineProps<{
  isOpen: boolean
  project?: string | null
  role?: 'staff' | 'manager'
  currentUser?: string
  task?: TaskFromAPI | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'task-created', task: any): void
}>()

const createdTask = ref<any>(null)

// form state
const todayDate = today(getLocalTimeZone())
const title = ref('')
const startDate = ref<DateValue>(todayDate)
const dueDate = ref<DateValue>(todayDate)
const status = ref('not-started')
const priority = ref(1)
const repeatInterval = ref(0)
const notes = ref('')
const taskTags = ref<string[]>([])
const subtasks = ref<{
  title: string;
  startDate: DateValue;
  dueDate: DateValue;
  status: string;
  priority: number;
  repeatInterval: number;
  notes: string;
  tags: string[];
  assignedTo: string[];
  expanded: boolean;
}[]>([])
const assignedTo = ref<string[]>([])

// staff members for assignee dropdown
const staffMembers = ref<StaffMember[]>([])

// projects dropdown
const projects = ref<{ id: number; name: string }[]>([])
const selectedProjectId = ref<string>('');

// Load staff members & projects when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (!isOpen) return
  try {
    startDate.value = todayDate
    dueDate.value = todayDate
    title.value = ''
    status.value = 'not-started'
    priority.value = 1
    repeatInterval.value = 0
    notes.value = ''
    subtasks.value = []
    errorMessage.value = ''
    successMessage.value = ''

    // Load projects
    try {
      const fetchedProjects = await $fetch('/api/projects/active')
      projects.value = Array.isArray(fetchedProjects)
        ? fetchedProjects.map((p: any) => ({ id: p.id, name: p.name }))
        : []
    } catch (err) {
      projects.value = []
    }

    if (props.project) {
      selectedProjectId.value = String(props.project)
    } else {
      selectedProjectId.value = ''
    }

    try {
      const fetchedStaff = await $fetch('/api/staff')
      if (Array.isArray(fetchedStaff)) {
        staffMembers.value = fetchedStaff.map((s: any) => ({
          id: s.id,
          fullname: s.fullname ?? s.name ?? `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
          email: s.email ?? ''
        }))
      } else {
        staffMembers.value = []
      }
    } catch (err) {
      try {
        if (selectedProjectId.value) {
          const pm = await $fetch<{ id: number; fullname: string; email?: string }[]>('/api/project-members', {
            params: { project_id: selectedProjectId.value }
          })
          staffMembers.value = pm.map(staff => ({
            id: staff.id,
            fullname: staff.fullname,
            email: staff.email ?? ''
          }))
        } else if (props.currentUser) {
          const currentUserData = await $fetch<{ id: number; fullname: string; email?: string }>('/api/user/me')
          staffMembers.value = [{
            id: currentUserData.id,
            fullname: currentUserData.fullname,
            email: currentUserData.email ?? ''
          }]
        } else {
          staffMembers.value = []
        }
      } catch (err2) {
        console.error('Failed to load fallback staff', err2)
        staffMembers.value = []
      }
    }

    assignedTo.value = props.currentUser ? [props.currentUser] : []
  } catch (err) {
    console.error('Failed to initialize create task modal', err)
  }
})

// feedback state
const successMessage = ref('')
const errorMessage = ref('')

// confirmation dialog state
const showDeleteConfirmation = ref(false)
const pendingDeleteIndex = ref<number | null>(null)

// Watch for repeat interval changes to auto-set due date
watch(repeatInterval, (newInterval) => {
  if (newInterval > 0 && startDate.value) {
    // Automatically set due date to start date + repeat interval days
    const startDateJs = startDate.value.toDate(getLocalTimeZone())
    const dueDateJs = new Date(startDateJs.getTime() + (newInterval * 24 * 60 * 60 * 1000))
    const dateString = dueDateJs.toISOString().split('T')[0]
    dueDate.value = parseDate(dateString)
  }
})

// Watch for start date changes to update due date if repeat interval is set
watch(startDate, (newStartDate) => {
  if (repeatInterval.value > 0 && newStartDate) {
    // Automatically update due date based on repeat interval
    const startDateJs = newStartDate.toDate(getLocalTimeZone())
    const dueDateJs = new Date(startDateJs.getTime() + (repeatInterval.value * 24 * 60 * 60 * 1000))
    const dateString = dueDateJs.toISOString().split('T')[0]
    dueDate.value = parseDate(dateString)
  } else if (dueDate.value && newStartDate && dueDate.value < newStartDate) {
    dueDate.value = newStartDate
  }
})

function addSubtask() {
  subtasks.value.push({
    title: '',
    startDate: todayDate,
    dueDate: todayDate,
    status: 'not-started',
    priority: 1,
    repeatInterval: 0,
    notes: '',
    assignedTo: [],
    tags: [],
    expanded: true
  })
}

// Watch for subtask repeat interval changes
watch(() => subtasks.value.map(s => ({ interval: s.repeatInterval, start: s.startDate })), (newValues, oldValues) => {
  if (!oldValues) return
  
  newValues.forEach((newVal, index) => {
    const oldVal = oldValues[index]
    const subtask = subtasks.value[index]
    
    if (!subtask) return
    
    // If repeat interval changed or start date changed and repeat interval is set
    if (newVal.interval > 0 && subtask.startDate && 
        (newVal.interval !== oldVal?.interval || newVal.start !== oldVal?.start)) {
      const startDateJs = subtask.startDate.toDate(getLocalTimeZone())
      const dueDateJs = new Date(startDateJs.getTime() + (newVal.interval * 24 * 60 * 60 * 1000))
      const dateString = dueDateJs.toISOString().split('T')[0]
      subtask.dueDate = parseDate(dateString)
    }
  })
}, { deep: true })

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
  startDate.value = todayDate
  dueDate.value = todayDate
  status.value = 'not-started'
  priority.value = 1
  repeatInterval.value = 0
  notes.value = ''
  taskTags.value = []
  subtasks.value = []
  assignedTo.value = []
  selectedProjectId.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

function handleDialogClose(open: boolean) {
  if (!open) {
    resetForm()
    emit('close')
  }
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

watch(assignedTo, (newAssigned) => {
  const allowed = newAssigned ?? []
  for (const st of subtasks.value) {
    if (Array.isArray(st.assignedTo) && st.assignedTo.length) {
      st.assignedTo = st.assignedTo.filter(id => allowed.includes(String(id)))
    }
  }
}, { immediate: true })

async function createTask() {
  try {
    if (!title.value.trim()) {
      errorMessage.value = 'Task title is required.'
      return
    }

    if (!startDate.value) {
      errorMessage.value = 'Start date is required.'
      return
    }

    if (!dueDate.value) {
      errorMessage.value = 'Due date is required.'
      return
    }

    if (!notes.value || !notes.value.trim()) {
      errorMessage.value = 'Notes are required.'
      return
    }

    if (dueDate.value && startDate.value && dueDate.value < startDate.value) {
      errorMessage.value = 'Due date cannot be before start date.'
      return
    }

    if (!selectedProjectId.value || !projects.value.find(p => String(p.id) === selectedProjectId.value)) {
      errorMessage.value = 'Please select a valid project.'
      return
    }

    const validAssignees = assignedTo.value.filter(id => id && String(id).trim() !== '')

    if (validAssignees.length === 0) {
      errorMessage.value = 'At least one assignee is required.'
      return
    }

    if (validAssignees.length > 5) {
      errorMessage.value = 'Maximum 5 assignees allowed.'
      return
    }

    // validate each subtask (title, dates, notes, date ranges, assignees)
    for (let i = 0; i < subtasks.value.length; i++) {
      const sub = subtasks.value[i]
      const n = i + 1

      if (!sub || !sub.title || !sub.title.trim()) {
        errorMessage.value = `Subtask ${n}: Title is required.`
        return
      }

      if (!sub.startDate) {
        errorMessage.value = `Subtask ${n}: Start date is required.`
        return
      }

      if (!sub.dueDate) {
        errorMessage.value = `Subtask ${n}: Due date is required.`
        return
      }

      if (!sub.notes || !sub.notes.trim()) {
        errorMessage.value = `Subtask ${n}: Notes are required.`
        return
      }

      if (sub.dueDate && sub.startDate && sub.dueDate < sub.startDate) {
        errorMessage.value = `Subtask ${n}: Due date cannot be before start date.`
        return
      }

      // ensure subtask dates fall within main task date range
      if (startDate.value && sub.startDate && sub.startDate < startDate.value) {
        errorMessage.value = `Subtask ${n}: Start date cannot be before main task start date.`
        return
      }
      if (dueDate.value && sub.dueDate && sub.dueDate > dueDate.value) {
        errorMessage.value = `Subtask ${n}: Due date cannot be after main task due date.`
        return
      }

      const validSubAssignees = (sub.assignedTo ?? []).filter(id => id && String(id).trim() !== '')
      if (validSubAssignees.length === 0) {
        errorMessage.value = `Subtask ${n}: At least one assignee is required.`
        return
      }
      if (validSubAssignees.length > 5) {
        errorMessage.value = `Subtask ${n}: Maximum 5 assignees allowed.`
        return
      }

      // ensure subtask assignees are subset of parent assignees
      const invalid = validSubAssignees.find(id => !assignedTo.value.includes(String(id)))
      if (invalid) {
        errorMessage.value = `Subtask ${n}: assignees must be chosen from the parent task assignees.`
        return
      }
    }

    errorMessage.value = ''
    successMessage.value = ''

    // Prepare assignee IDs
    const assigneeIds = assignedTo.value
      .filter(id => id && id.trim() !== '')
      .map(id => Number(id))
      .filter(id => !isNaN(id) && id > 0)

    const taskData = {
      title: title.value,
      start_date: startDate.value ? startDate.value.toString() : null,
      due_date: dueDate.value ? dueDate.value.toString() : null,
      status: status.value,
      priority: priority.value.toString(),
      repeat_interval: repeatInterval.value.toString(),
      notes: notes.value.trim(),
      tags: taskTags.value,
      project_id: selectedProjectId.value ? Number(selectedProjectId.value) : null,
      assignee_ids: assigneeIds,
      subtasks: subtasks.value.map(subtask => ({
        title: subtask.title,
        start_date: startDate.value ? startDate.value.toString() : null,
        due_date: dueDate.value ? dueDate.value.toString() : null,
        status: subtask.status,
        priority: subtask.priority.toString(),
        notes: subtask.notes.trim(),
        repeat_interval: subtask.repeatInterval.toString(),
        tags: subtask.tags || [],
        assignee_ids: subtask.assignedTo
          .filter(id => id && id.trim() !== '')
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0)
      }))
    }

    // create task
    const taskResp = await $fetch<any>('/api/tasks', {
      method: 'POST',
      body: taskData
    })

    if (!taskResp || !taskResp.success) {
      throw new Error(taskResp?.statusMessage || 'Failed to create task')
    }

    const created = taskResp.task as any

    if (!created) {
      throw new Error('Task was not created')
    }

    // Task and assignees are now created by the server
    createdTask.value = created
    successMessage.value = 'Task created successfully!'
  } catch (err: any) {
    console.error('Error creating task:', err)
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Something went wrong. Task was not created.'
    successMessage.value = ''
  }
}

function formatDate(date: DateValue) {
  const jsDate = date.toDate(getLocalTimeZone())
  const day = String(jsDate.getDate()).padStart(2, '0')
  const month = String(jsDate.getMonth() + 1).padStart(2, '0')
  const year = jsDate.getFullYear()
  return `${day}/${month}/${year}`
}

// when parent passes props.project the project selection must be locked
const isProjectLocked = computed(() => !!props.project)
const lockedProjectName = computed(() => {
  return projects.value.find(p => String(p.id) === String(selectedProjectId.value))?.name ?? ''
})
</script>