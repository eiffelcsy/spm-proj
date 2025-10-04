<template>
  <div>
    <!-- Delete Project Confirmation Modal -->
    <div v-if="isOpen" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-lg">
        <!-- Success State -->
        <div v-if="showSuccess" class="text-center">
          <div class="flex justify-center mb-4">
            <svg class="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Project Deleted Successfully!</h3>
          <p class="text-gray-600 mb-6">
            The project "{{ project?.name }}" and all its tasks have been permanently deleted.
          </p>
          <button 
            @click="handleSuccessOk" 
            class="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            OK
          </button>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" class="text-center">
          <div class="flex justify-center mb-4">
            <svg class="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Deletion Failed</h3>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
          <div class="flex justify-center gap-3">
            <button 
              @click="handleRetry" 
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
            <button 
              @click="handleCancel" 
              class="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Confirmation State -->
        <div v-else>
          <div class="flex items-center mb-4">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-semibold text-gray-900">Delete Project</h3>
            </div>
          </div>
          
          <div class="mb-6">
            <p class="text-gray-600 mb-4">
              Are you sure you want to delete the project <strong>"{{ project?.name }}"</strong>?
            </p>
            <div class="bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <h4 class="text-sm font-medium text-red-800">Warning</h4>
                  <div class="mt-2 text-sm text-red-700">
                    <p>This action will permanently delete:</p>
                    <ul class="list-disc list-inside mt-1 space-y-1">
                      <li>The project and all its data</li>
                      <li>All tasks and subtasks under this project</li>
                      <li>All project history and comments</li>
                    </ul>
                    <p class="mt-2 font-medium">This action cannot be undone.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-end gap-3">
            <button 
              @click="handleCancel" 
              class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button 
              @click="handleConfirm" 
              :disabled="isDeleting"
              class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isDeleting" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </span>
              <span v-else>Delete Project</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  isOpen: boolean
  project: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'project-deleted': []
}>()

// State management
const isDeleting = ref(false)
const showSuccess = ref(false)
const errorMessage = ref('')

// Reset state when modal opens/closes
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Reset all states when modal opens
    isDeleting.value = false
    showSuccess.value = false
    errorMessage.value = ''
  }
})

function handleCancel() {
  emit('close')
}

function handleSuccessOk() {
  emit('project-deleted')
}

function handleRetry() {
  errorMessage.value = ''
  isDeleting.value = false
}

async function handleConfirm() {
  try {
    if (!props.project?.id) {
      throw new Error('Project ID is missing')
    }

    isDeleting.value = true
    errorMessage.value = ''

    const response = await $fetch<{ success: boolean; message: string }>(`/api/projects/${props.project.id}`, {
      method: 'DELETE'
    })

    if (response && response.success) {
      showSuccess.value = true
      isDeleting.value = false
    } else {
      throw new Error(response?.message || 'Failed to delete project')
    }
  } catch (error: any) {
    isDeleting.value = false
    
    // Extract meaningful error message
    if (error?.data?.statusMessage) {
      errorMessage.value = error.data.statusMessage
    } else if (error?.message) {
      errorMessage.value = error.message
    } else if (error?.statusMessage) {
      errorMessage.value = error.statusMessage
    } else {
      errorMessage.value = 'An unexpected error occurred while deleting the project. Please try again.'
    }
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
