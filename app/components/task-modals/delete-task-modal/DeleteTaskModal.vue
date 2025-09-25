<template>
  <div>
    <!-- Delete Confirmation Modal -->
    <div v-if="isOpen" class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg">
        <h3 class="text-lg font-semibold mb-4">Confirm Delete</h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete this {{ isSubtask ? 'subtask' : 'task' }}?
        </p>
        <div class="flex justify-end gap-3">
          <button @click="handleCancel" class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100">
            No
          </button>
          <button @click="handleConfirm" class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            Yes
          </button>
        </div>
      </div>
    </div>

    <!-- Undo Delete Button -->
    <div v-if="isDeleting" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div class="bg-gray-800 text-white rounded-lg px-6 py-3 shadow-lg flex items-center gap-3">
        <span>{{ isSubtask ? 'Subtask' : 'Task' }} will be deleted in {{ countdown }}s</span>
        <button @click="handleUndo" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          Undo
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  isOpen: boolean
  isSubtask?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSubtask: false
})

const emit = defineEmits<{
  close: []
  confirm: []
  undo: []
  'delete-complete': []
}>()

// Internal state
const isDeleting = ref(false)
const countdown = ref(0)
const undoTimer = ref<NodeJS.Timeout | null>(null)

// Watch for modal opening/closing
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    // Reset state when modal closes
    isDeleting.value = false
    countdown.value = 0
    if (undoTimer.value) {
      clearInterval(undoTimer.value)
      undoTimer.value = null
    }
  }
})

function handleCancel() {
  emit('close')
}

function handleConfirm() {
  isDeleting.value = true
  countdown.value = 5
  
  // Start countdown
  undoTimer.value = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      emit('delete-complete')
      // Reset state after completion
      isDeleting.value = false
      countdown.value = 0
      if (undoTimer.value) {
        clearInterval(undoTimer.value)
        undoTimer.value = null
      }
    }
  }, 1000)
}

function handleUndo() {
  emit('undo')
  // Reset state
  isDeleting.value = false
  countdown.value = 0
  if (undoTimer.value) {
    clearInterval(undoTimer.value)
    undoTimer.value = null
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
