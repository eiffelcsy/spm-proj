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
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  isSubtask?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSubtask: false
})

const emit = defineEmits<{
  close: []
  'delete-complete': []
}>()

function handleCancel() {
  emit('close')
}

function handleConfirm() {
  emit('delete-complete')
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
