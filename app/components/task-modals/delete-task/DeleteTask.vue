<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open?: boolean
  task?: { id: string | undefined, title?: string | undefined } | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm', task: { id: string | undefined, title?: string | undefined }): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  task: null,
})

const emit = defineEmits<Emits>()

const handleClose = () => {
  emit('update:open', false)
}

const handleConfirm = () => {
  if (props.task) {
    emit('confirm', props.task)
    handleClose()
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Confirm Delete Task</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this task? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="handleClose">
          Cancel
        </Button>
        <Button variant="destructive" @click="handleConfirm">
          Delete Task
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
