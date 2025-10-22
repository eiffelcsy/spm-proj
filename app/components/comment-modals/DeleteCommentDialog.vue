<template>
  <Dialog :open="isOpen" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Confirm Delete Comment</DialogTitle>
      </DialogHeader>
      <div class="py-4">
        <p class="text-sm text-muted-foreground">
          Are you sure you want to delete this comment? This action cannot be undone.
        </p>
      </div>
      <DialogFooter class="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
        <Button
          variant="outline"
          @click="$emit('update:open', false)"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          @click="handleConfirm"
          :disabled="isDeleting"
        >
          <span v-if="isDeleting">Deleting...</span>
          <span v-else>Delete Comment</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ============================================================================
// PROPS & EMITS
// ============================================================================

interface Props {
  isOpen: boolean
  commentId?: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [commentId: number]
}>()

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const isDeleting = ref(false)

// ============================================================================
// METHODS
// ============================================================================

async function handleConfirm() {
  if (!props.commentId) return
  
  isDeleting.value = true
  try {
    emit('confirm', props.commentId)
    emit('update:open', false)
  } finally {
    isDeleting.value = false
  }
}

// ============================================================================
// WATCHERS
// ============================================================================

// Reset deleting state when dialog closes
watch(() => props.isOpen, (newValue) => {
  if (!newValue) {
    isDeleting.value = false
  }
})
</script>
