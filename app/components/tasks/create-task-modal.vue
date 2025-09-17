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
            <option :value="currentUser">Myself ({{ currentUser }})</option>
            <option v-if="role === 'manager'" v-for="member in teamMembers" :key="member" :value="member">
              {{ member }}
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

function createTask() {
  try {
    if (!title.value.trim()) {
      errorMessage.value = 'Task title is required.'
      return
    }

    const newTask = {
      id: Date.now().toString(),
      title: title.value,
      startDate: startDate.value ? new Date(startDate.value) : new Date(),
      dueDate: dueDate.value ? new Date(dueDate.value) : null,
      status: status.value,
      description: description.value || null,
      subtasks: subtasks.value
        .filter(st => st.title.trim() !== '')
        .map(st => ({
          title: st.title,
          dueDate: st.dueDate ? new Date(st.dueDate) : null,
          status: 'not-started'
        })),
      project: props.project ?? 'personal',
      owner: props.currentUser,
      assignedTo: assignedTo.value || null,
    }

    emit('task-created', newTask)

    // feedback
    successMessage.value = 'Task created successfully!'
    errorMessage.value = ''

    // reset form after short delay
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
  } catch (err) {
    errorMessage.value = 'Something went wrong. Task was not created.'
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