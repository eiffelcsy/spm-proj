<template>
  <div v-if="isOpen" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" @click="handleBackdropClick">
    <div class="relative bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 overflow-y-auto z-10" @click.stop>
      <h2 class="text-xl font-semibold mb-4">Edit Project</h2>

      <!-- Success Message -->
      <div v-if="successMessage" class="mb-4 p-3 rounded bg-green-100 text-green-700">
        <span>{{ successMessage }}</span>
        <Button variant="outline" @click="handleSuccessOk" class="ml-4">OK</Button>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-4 p-3 rounded bg-red-100 text-red-700">
        {{ errorMessage }}
      </div>

      <form v-if="!successMessage" @submit.prevent="updateProject" class="space-y-4">
        <!-- Project Title -->
        <div>
          <Label class="block text-sm font-medium mb-1">Project Title *</Label>
          <Input 
            v-model="projectName" 
            type="text" 
            required 
            placeholder="Enter project title"
            :class="[
              'w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
              errorMessage && 'border-red-500'
            ]"
          />
        </div>

        <!-- Description -->
        <div>
          <Label class="block text-sm font-medium mb-1">Description</Label>
          <textarea 
            v-model="projectDescription" 
            rows="4" 
            placeholder="Enter project description (optional)"
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <!-- Priority -->
        <div>
          <Label class="block text-sm font-medium mb-1">Priority</Label>
          <Select v-model="projectPriority">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-green-400"></span>
                  Low
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                  Medium
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-red-400"></span>
                  High
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Due Date -->
        <div>
          <Label class="block text-sm font-medium mb-1">Due Date</Label>
          <Popover>
            <PopoverTrigger as-child>
              <Button variant="outline" :class="cn(
                'w-full justify-start text-left font-normal',
                !projectDueDate && 'text-muted-foreground',
              )">
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{ projectDueDate ? formatDate(projectDueDate) : "Select due date (optional)" }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0">
              <Calendar v-model="projectDueDate" />
            </PopoverContent>
          </Popover>
        </div>

        <!-- Assigned Users -->
        <div>
          <Label class="block text-sm font-medium mb-1">Assign To</Label>
          <Select v-model="projectAssignedUsers">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select users (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="staff in availableStaff" 
                :key="staff.id" 
                :value="String(staff.id)"
              >
                {{ staff.fullname }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div v-if="projectAssignedUsers.length > 0" class="mt-2 flex flex-wrap gap-2">
            <Badge 
              v-for="userId in projectAssignedUsers" 
              :key="userId"
              variant="secondary"
              class="text-xs flex items-center gap-1"
            >
              {{ availableStaff.find(s => String(s.id) === userId)?.fullname }}
              <button 
                type="button"
                @click.stop="removeUser(userId)" 
                class="hover:bg-gray-300 rounded-full p-0.5"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </Badge>
          </div>
        </div>

        <!-- Tags -->
        <div>
          <Label class="block text-sm font-medium mb-1">Tags</Label>
          <TagsInput v-model="projectTags" class="w-full">
            <TagsInputItem v-for="tag in projectTags" :key="tag" :value="tag">
              <TagsInputItemText />
              <TagsInputItemDelete />
            </TagsInputItem>
            <TagsInputInput placeholder="Add tags..." />
          </TagsInput>
          <p class="text-xs text-muted-foreground mt-1">Press Enter to add a tag</p>
        </div>

        <!-- Status -->
        <div>
          <Label class="block text-sm font-medium mb-1">Status</Label>
          <Select v-model="projectStatus">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select project status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                  To Do
                </div>
              </SelectItem>
              <SelectItem value="in-progress">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-400"></span>
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-green-400"></span>
                  Completed
                </div>
              </SelectItem>
              <SelectItem value="blocked">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-red-400"></span>
                  Blocked
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="closeModal">
            Cancel
          </Button>
          <Button type="submit" :disabled="isUpdating">
            {{ isUpdating ? 'Updating...' : 'Update Project' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import type { CalendarDate } from '@internationalized/date'
import { parseDate, getLocalTimeZone } from '@internationalized/date'
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from '@/components/ui/tags-input'
import type { ProjectPriority } from '@/types'

interface Project {
  id: string
  name: string
  description: string
  priority?: ProjectPriority
  due_date?: string
  tags?: string[]
  assigned_user_ids?: number[]
  status: string
  createdAt: string
}

const props = defineProps<{
  isOpen: boolean
  project: Project | null
}>()

const emit = defineEmits<{
  close: []
  'project-updated': [project: Project]
}>()

// Form state
const projectName = ref('')
const projectDescription = ref('')
const projectPriority = ref<ProjectPriority>('medium')
const projectDueDate = ref<any>(null)
const projectTags = ref<string[]>([])
const projectAssignedUsers = ref<string[]>([])
const projectStatus = ref('todo')
const isUpdating = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const availableStaff = ref<any[]>([])

// Fetch available staff for assignment
async function fetchStaff() {
  try {
    const staff = await $fetch('/api/staff')
    availableStaff.value = staff
  } catch (err) {
    console.error('Failed to fetch staff:', err)
    availableStaff.value = []
  }
}

// Remove user from assignment
function removeUser(userId: string) {
  projectAssignedUsers.value = projectAssignedUsers.value.filter(id => id !== userId)
}

// Watch for project changes to populate form
watch(() => props.project, (newProject) => {
  if (newProject) {
    projectName.value = newProject.name
    projectDescription.value = newProject.description || ''
    projectPriority.value = newProject.priority || 'medium'

    // Handle both dueDate (from dashboard) and due_date (from API response)
    const dueDateValue = newProject.due_date
    projectDueDate.value = dueDateValue ? parseDate(dueDateValue) : null

    projectTags.value = newProject.tags || []
    projectAssignedUsers.value = newProject.assigned_user_ids?.map(id => String(id)) || []
    projectStatus.value = newProject.status || 'todo'

    // Reset success/error messages when project changes
    successMessage.value = ''
    errorMessage.value = ''
  }
}, { immediate: true })

// Watch for modal open state to reset form when reopened
watch(() => props.isOpen, (isOpen, wasOpen) => {
  if (isOpen && !wasOpen && props.project) {
    // Reset form when modal first opens (not when it's already open)
    successMessage.value = ''
    errorMessage.value = ''
    isUpdating.value = false
    fetchStaff()
  }
})

async function updateProject() {
  if (!props.project) return

  try {
    errorMessage.value = ''
    successMessage.value = ''
    isUpdating.value = true

    const projectData = {
      name: projectName.value.trim(),
      description: projectDescription.value.trim() || null,
      priority: projectPriority.value,
      due_date: projectDueDate.value ? projectDueDate.value.toString() : null,
      tags: projectTags.value,
      assigned_user_ids: projectAssignedUsers.value.map(id => parseInt(id)),
      status: projectStatus.value
    }

    const response = await $fetch(`/api/projects/${props.project.id}`, {
      method: 'PUT',
      body: projectData
    })

    if (!response || !response.success) {
      throw new Error('Failed to update project')
    }

    successMessage.value = 'Project updated successfully!'
    
    // Emit the update event and close modal after a delay to ensure success message is visible
    setTimeout(() => {
      emit('project-updated', response.project)
      emit('close') // Close the modal after showing success message
    }, 1000)
  } catch (err: any) {
    console.error('Error updating project:', err)
    errorMessage.value = err?.data?.statusMessage || err?.message || 'Something went wrong. Project was not updated.'
  } finally {
    isUpdating.value = false
  }
}

function handleBackdropClick() {
  emit('close')
}

function closeModal() {
  emit('close')
}

function handleSuccessOk() {
  successMessage.value = ''
  emit('close')
}

function formatDate(date: any): string {
  if (typeof date === 'string') {
    const jsDate = new Date(date)
    const day = String(jsDate.getDate()).padStart(2, '0')
    const month = String(jsDate.getMonth() + 1).padStart(2, '0')
    const year = jsDate.getFullYear()
    return `${day}/${month}/${year}`
  }
  if (date && typeof date.toDate === 'function') {
    const jsDate = date.toDate(getLocalTimeZone())
    const day = String(jsDate.getDate()).padStart(2, '0')
    const month = String(jsDate.getMonth() + 1).padStart(2, '0')
    const year = jsDate.getFullYear()
    return `${day}/${month}/${year}`
  }
  return ''
}

onMounted(() => {
  fetchStaff()
})
</script>

<style scoped>
.modal-backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@supports not (backdrop-filter: blur(8px)) {
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.6);
  }
}
</style>
