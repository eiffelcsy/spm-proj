<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center space-x-2">
        <MessageSquare class="h-5 w-5" />
        <span>Comments</span>
        <Badge v-if="comments.length > 0" variant="secondary" class="ml-2">
          {{ comments.length }}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Add Comment Form -->
      <div v-if="canComment" class="border rounded-lg p-4 bg-muted/30">
        <div class="space-y-3">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {{ getInitials(currentUser?.fullname || 'U') }}
            </div>
            <span class="text-sm font-medium">{{ currentUser?.fullname || 'You' }}</span>
          </div>
          <Textarea
            v-model="newCommentContent"
            placeholder="Add a comment..."
            class="min-h-[80px] resize-none"
            :maxlength="2000"
            @keydown.ctrl.enter="addComment"
            @keydown.meta.enter="addComment"
          />
          <div class="flex items-center justify-between">
            <div class="text-xs text-muted-foreground">
              {{ newCommentContent.length }}/2000 characters
            </div>
            <div class="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                @click="clearComment"
                :disabled="!newCommentContent.trim()"
              >
                Clear
              </Button>
              <Button
                size="sm"
                @click="addComment"
                :disabled="!newCommentContent.trim() || isAddingComment"
              >
                <span v-if="isAddingComment">Adding...</span>
                <span v-else>Add Comment</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Comments List -->
      <div v-if="comments.length > 0" class="space-y-4">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="border rounded-lg p-4 bg-background"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3 flex-1">
              <!-- Author Avatar -->
              <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {{ getInitials(comment.staff.fullname) }}
              </div>
              
              <!-- Comment Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="text-sm font-medium">{{ comment.staff.fullname }}</span>
                  <span class="text-xs text-muted-foreground">
                    {{ formatCommentDate(comment.created_at) }}
                  </span>
                  <Badge v-if="isCommentEdited(comment)" variant="outline" class="text-xs">
                    edited
                  </Badge>
                </div>
                
                <!-- Comment Text -->
                <div v-if="!editingCommentId || editingCommentId !== comment.id" class="text-sm text-foreground whitespace-pre-wrap">
                  {{ comment.content }}
                </div>
                
                <!-- Edit Form -->
                <div v-else class="space-y-2">
                  <Textarea
                    v-model="editingContent"
                    class="min-h-[60px] resize-none"
                    :maxlength="2000"
                  />
                  <div class="flex items-center justify-between">
                    <div class="text-xs text-muted-foreground">
                      {{ editingContent.length }}/2000 characters
                    </div>
                    <div class="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        @click="cancelEdit"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        @click="saveEdit(comment.id)"
                        :disabled="!editingContent.trim() || isUpdatingComment"
                      >
                        <span v-if="isUpdatingComment">Saving...</span>
                        <span v-else>Save</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Comment Actions -->
            <div v-if="canEditComment(comment)" class="flex items-center space-x-1 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top">
                  <DropdownMenuItem @click="startEdit(comment)">
                    <Pencil1Icon class="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    @click="deleteComment(comment.id)"
                    class="text-red-600 focus:text-red-600"
                  >
                    <TrashIcon class="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading" class="text-center py-8 text-muted-foreground">
        <MessageSquare class="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p class="text-sm">No comments yet</p>
        <p v-if="canComment" class="text-xs">Be the first to add a comment!</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p class="text-sm text-muted-foreground mt-2">Loading comments...</p>
      </div>
    </CardContent>
  </Card>

  <!-- Delete Comment Dialog -->
  <DeleteCommentDialog
    :isOpen="isDeleteDialogOpen"
    :commentId="commentToDelete"
    @update:open="isDeleteDialogOpen = $event"
    @confirm="handleDeleteConfirm"
  />
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Pencil1Icon,
  TrashIcon,
} from '@radix-icons/vue'
import { MessageSquare, MoreHorizontal } from 'lucide-vue-next'
import DeleteCommentDialog from './DeleteCommentDialog.vue'
import type { TaskCommentWithStaff, StaffMember } from '~/types'

// ============================================================================
// PROPS & EMITS
// ============================================================================

interface Props {
  taskId: string | number
  canComment?: boolean
  currentUser?: StaffMember | null
}

const props = withDefaults(defineProps<Props>(), {
  canComment: true,
  currentUser: null
})

const emit = defineEmits<{
  commentAdded: [comment: TaskCommentWithStaff]
  commentUpdated: [comment: TaskCommentWithStaff]
  commentDeleted: [commentId: number]
}>()

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const comments = ref<TaskCommentWithStaff[]>([])
const isLoading = ref(false)
const isAddingComment = ref(false)
const isUpdatingComment = ref(false)
const newCommentContent = ref('')
const editingCommentId = ref<number | null>(null)
const editingContent = ref('')
const isDeleteDialogOpen = ref(false)
const commentToDelete = ref<number | null>(null)

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

const canEditComment = (comment: TaskCommentWithStaff) => {
  // Allow everyone to edit/delete comments for now
  return true
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get initials from a person's name
 */
function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

/**
 * Format comment date for display
 */
function formatCommentDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`
  } else if (diffInHours < 168) { // 7 days
    return `${Math.floor(diffInHours / 24)}d ago`
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

/**
 * Check if a comment was actually edited (not just created)
 */
function isCommentEdited(comment: TaskCommentWithStaff): boolean {
  if (!comment.updated_at || !comment.created_at) return false
  
  const created = new Date(comment.created_at)
  const updated = new Date(comment.updated_at)
  
  // Consider it edited if updated_at is more than 5 seconds after created_at
  // This accounts for potential database timestamp differences
  const timeDiff = updated.getTime() - created.getTime()
  return timeDiff > 5000 // 5 seconds
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch comments for the task
 */
async function fetchComments() {
  if (!props.taskId) return
  
  isLoading.value = true
  try {
    const response = await $fetch(`/api/tasks/${props.taskId}/comments`)
    if (response.success) {
      comments.value = response.comments || []
    }
  } catch (error) {
    console.error('Failed to fetch comments:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * Add a new comment
 */
async function addComment() {
  if (!newCommentContent.value.trim() || !props.taskId) return
  
  isAddingComment.value = true
  try {
    const response = await $fetch(`/api/tasks/${props.taskId}/comments`, {
      method: 'POST',
      body: {
        content: newCommentContent.value.trim()
      }
    })
    
    if (response.success && response.comment) {
      comments.value.push(response.comment)
      newCommentContent.value = ''
      emit('commentAdded', response.comment)
    }
  } catch (error) {
    console.error('Failed to add comment:', error)
  } finally {
    isAddingComment.value = false
  }
}

/**
 * Start editing a comment
 */
function startEdit(comment: TaskCommentWithStaff) {
  editingCommentId.value = comment.id
  editingContent.value = comment.content
}

/**
 * Cancel editing
 */
function cancelEdit() {
  editingCommentId.value = null
  editingContent.value = ''
}

/**
 * Save comment edit
 */
async function saveEdit(commentId: number) {
  if (!editingContent.value.trim()) return
  
  isUpdatingComment.value = true
  try {
    const response = await $fetch(`/api/tasks/${props.taskId}/comments/${commentId}`, {
      method: 'PUT',
      body: {
        content: editingContent.value.trim()
      }
    })
    
    if (response.success && response.comment) {
      const index = comments.value.findIndex(c => c.id === commentId)
      if (index !== -1) {
        comments.value[index] = response.comment
      }
      editingCommentId.value = null
      editingContent.value = ''
      emit('commentUpdated', response.comment)
    }
  } catch (error) {
    console.error('Failed to update comment:', error)
  } finally {
    isUpdatingComment.value = false
  }
}

/**
 * Open delete confirmation dialog
 */
function deleteComment(commentId: number) {
  commentToDelete.value = commentId
  isDeleteDialogOpen.value = true
}

/**
 * Handle delete confirmation
 */
async function handleDeleteConfirm(commentId: number) {
  console.log(`Attempting to delete comment ${commentId} for task ${props.taskId}`)
  try {
    const response = await $fetch(`/api/tasks/${props.taskId}/comments/${commentId}`, {
      method: 'DELETE'
    })
    
    console.log('Delete response:', response)
    
    if (response.success) {
      comments.value = comments.value.filter(c => c.id !== commentId)
      emit('commentDeleted', commentId)
      console.log('Comment successfully removed from UI')
    }
  } catch (error) {
    console.error('Failed to delete comment:', error)
    // Show user-friendly error message
    alert('Failed to delete comment. Please try again.')
  } finally {
    commentToDelete.value = null
  }
}

/**
 * Clear new comment form
 */
function clearComment() {
  newCommentContent.value = ''
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

onMounted(() => {
  fetchComments()
})

// Watch for taskId changes
watch(() => props.taskId, () => {
  if (props.taskId) {
    fetchComments()
  }
})
</script>
