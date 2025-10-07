<template>
  <Dialog :open="isOpen" @update:open="handleDialogClose">
    <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogDescription>
          Fill in the details below to create a new project.
        </DialogDescription>
      </DialogHeader>

      <!-- Success Message -->
      <div v-if="successMessage" class="flex-1 flex items-center justify-center py-8">
        <div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 text-green-800 rounded-xl p-8 flex flex-col items-center justify-center gap-6 min-w-[320px] shadow-lg">
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

      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-4 p-3 rounded bg-red-100 text-red-700">
        {{ errorMessage }}
      </div>

      <form v-if="!successMessage" @submit.prevent="createProject" class="space-y-4">
        <!-- Project Title -->
        <div>
          <Label class="block text-sm font-medium mb-1">Project Title</Label>
          <Input
            v-model="projectName"
            type="text"
            required
            placeholder="Enter project title"
            class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Description -->
        <div>
          <Label class="block text-sm font-medium mb-1">Description</Label>
          <textarea
            v-model="projectDescription"
            rows="4"
            placeholder="Enter project description (optional)"
            class="w-full border rounded-lg px-3 py-2 text-sm"
          ></textarea>
        </div>

        <!-- Due Date -->
        <div>
          <Label class="mb-1">Due Date</Label>
          <Popover>
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                :class="
                  cn(
                    'w-full justify-start text-left font-normal',
                    !projectDueDate && 'text-muted-foreground'
                  )
                "
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{
                  projectDueDate
                    ? formatDate(projectDueDate as DateValue)
                    : "Select due date (optional)"
                }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0">
              <Calendar v-model:model-value="projectDueDate as any" initial-focus />
            </PopoverContent>
          </Popover>
        </div>

        <!-- Status -->
        <div>
          <Label class="block text-sm font-medium mb-1">Status</Label>
          <Select v-model="projectStatus">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select project status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                  Active
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-green-400"></span>
                  Completed
                </div>
              </SelectItem>
              <SelectItem value="archived">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                  Archived
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>

      <DialogFooter v-if="!successMessage" class="gap-2">
        <Button variant="outline" @click="handleCancel">
          Cancel
        </Button>
        <Button @click="createProject" :disabled="isCreating">
          {{ isCreating ? "Creating..." : "Create Project" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { DateValue } from '@internationalized/date'
import { getLocalTimeZone } from '@internationalized/date'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'project-created', project: any): void
}>()

const createdProject = ref<any>(null)

// form state
const projectName = ref('')
const projectDescription = ref('')
const projectDueDate = ref<DateValue | null>(null)
const projectStatus = ref('active')

// feedback state
const successMessage = ref('')
const errorMessage = ref('')
const isCreating = ref(false)

// Reset form when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (!isOpen) return
  
  projectName.value = ''
  projectDescription.value = ''
  projectDueDate.value = null
  projectStatus.value = 'active'
  errorMessage.value = ''
  successMessage.value = ''
  isCreating.value = false
})

function resetForm() {
  projectName.value = ''
  projectDescription.value = ''
  projectDueDate.value = null
  projectStatus.value = 'active'
  errorMessage.value = ''
  successMessage.value = ''
  isCreating.value = false
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
  if (createdProject.value) {
    emit('project-created', createdProject.value)
    createdProject.value = null
  }
  resetForm()
  emit('close')
}

async function createProject() {
  try {
    if (!projectName.value.trim()) {
      errorMessage.value = 'Project title is required.'
      return
    }

    errorMessage.value = ''
    successMessage.value = ''
    isCreating.value = true

    const projectData = {
      name: projectName.value.trim(),
      description: projectDescription.value.trim() || null,
      due_date: projectDueDate.value ? projectDueDate.value.toString() : null,
      status: projectStatus.value,
    }

    const response = await $fetch<any>('/api/projects', {
      method: 'POST',
      body: projectData,
    })

    if (!response || !response.success) {
      throw new Error(response?.statusMessage || 'Failed to create project')
    }

    createdProject.value = response.project
    successMessage.value = 'Project created successfully!'
  } catch (err: any) {
    console.error('Error creating project:', err)
    errorMessage.value =
      err?.data?.statusMessage ||
      err?.message ||
      'Something went wrong. Project was not created.'
    successMessage.value = ''
  } finally {
    isCreating.value = false
  }
}

function formatDate(date: DateValue) {
  const jsDate = date.toDate(getLocalTimeZone())
  const day = String(jsDate.getDate()).padStart(2, '0')
  const month = String(jsDate.getMonth() + 1).padStart(2, '0')
  const year = jsDate.getFullYear()
  return `${day}/${month}/${year}`
}
</script>
