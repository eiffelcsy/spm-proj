<template>
  <Dialog :open="isOpen" @update:open="handleClose">
    <DialogContent class="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Manage Project Collaborators</DialogTitle>
        <DialogDescription>
          Add or remove collaborators from this project
        </DialogDescription>
      </DialogHeader>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="text-gray-500">Loading...</div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ errorMessage }}
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {{ successMessage }}
      </div>

      <!-- Collaborators Management -->
      <div v-if="!isLoading" class="space-y-6 flex-1 overflow-y-auto">
        <!-- Add New Collaborators Section -->
        <div class="space-y-2 px-2">
          <label class="text-sm font-medium">Add New Collaborators</label>
          <Combobox v-model="pendingAddIds" v-model:open="comboboxOpen" :ignore-filter="true" class="w-full">
            <ComboboxAnchor class="w-full" as-child>
              <div class="relative w-full">
                <ComboboxInput
                  v-model="searchTerm"
                  placeholder="Search staff by name or email..."
                  class="w-full"
                  @keydown.enter.prevent
                />
                <ComboboxList class="w-[--reka-popper-anchor-width] max-h-60 overflow-y-auto" align="start">
                  <ComboboxEmpty class="p-2 text-center text-sm text-gray-500">
                    No staff found
                  </ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="staff in availableStaff"
                      :key="staff.id"
                      :value="staff.id.toString()"
                      @select.prevent="addToPending(staff.id.toString())"
                      class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div>
                        <div class="font-medium">{{ staff.fullname }}</div>
                        <div class="text-xs text-gray-500">{{ staff.email }}</div>
                      </div>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </div>
            </ComboboxAnchor>
          </Combobox>

          <!-- Pending Additions -->
          <div v-if="pendingCollaborators.length > 0" class="mt-3 p-3 bg-zinc-50 rounded-md border">
            <div class="text-sm font-medium mb-2">
              To be added ({{ pendingCollaborators.length }}):
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="collaborator in pendingCollaborators"
                :key="collaborator.id"
                class="inline-flex items-center gap-2 px-3 py-1 bg-white border rounded-full text-sm"
              >
                <span>{{ collaborator.fullname }}</span>
                <button
                  @click="removeFromPending(collaborator.id.toString())"
                  class="text-gray-600 hover:text-gray-800"
                  type="button"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Collaborators Section -->
        <div class="space-y-2 px-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">Current Collaborators ({{ currentCollaborators.length }})</label>
          </div>
          
          <div v-if="currentCollaborators.length === 0" class="text-sm text-gray-500 p-4 text-center border rounded-md">
            No collaborators yet
          </div>
          
          <div v-else class="border rounded-md divide-y max-h-64 overflow-y-auto">
            <div
              v-for="collaborator in currentCollaborators"
              :key="collaborator.id"
              class="flex items-center justify-between p-3 hover:bg-gray-50"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                  {{ collaborator.fullname.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="font-medium text-sm">{{ collaborator.fullname }}</div>
                  <div class="text-xs text-gray-500">{{ collaborator.email }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="collaborator.id === project?.owner_id"
                  class="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded"
                >
                  Owner
                </span>
                <button
                  v-else-if="!pendingRemoveIds.includes(collaborator.id.toString())"
                  @click="markForRemoval(collaborator.id.toString())"
                  class="p-1 text-red-600 hover:bg-red-50 rounded"
                  type="button"
                  title="Remove collaborator"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  v-else
                  @click="unmarkForRemoval(collaborator.id.toString())"
                  class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200"
                  type="button"
                >
                  Undo
                </button>
              </div>
            </div>
          </div>

          <!-- Pending Removals Notice -->
          <div v-if="pendingRemovals.length > 0" class="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
            <div class="text-sm font-medium text-red-900">
              {{ pendingRemovals.length }} collaborator(s) will be removed
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button 
          type="button" 
          variant="outline" 
          @click="handleClose"
          :disabled="isSaving"
        >
          Cancel
        </Button>
        <Button 
          type="button"
          @click="saveChanges"
          :disabled="!hasChanges || isSaving"
          class="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <span v-if="isSaving">Saving...</span>
          <span v-else>Save Changes</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { useFilter } from 'reka-ui'
import type { StaffMember } from '@/types'

interface Props {
  isOpen: boolean
  project: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  'collaborators-updated': []
}>()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const allStaff = ref<StaffMember[]>([])
const currentCollaborators = ref<StaffMember[]>([])

// Pending changes (intermediate state)
const pendingAddIds = ref<string[]>([])
const pendingRemoveIds = ref<string[]>([])

// Combobox state
const comboboxOpen = ref(false)
const searchTerm = ref('')

// Computed properties
const { contains } = useFilter({ sensitivity: "base" })

// Staff available to add (not already in project, not pending addition)
const availableStaff = computed(() => {
  const currentIds = new Set(currentCollaborators.value.map(c => c.id.toString()))
  const pendingIds = new Set(pendingAddIds.value)
  
  const available = allStaff.value.filter(staff => 
    !currentIds.has(staff.id.toString()) && !pendingIds.has(staff.id.toString())
  )
  
  // Apply search filter
  return searchTerm.value
    ? available.filter(staff => 
        contains(staff.fullname, searchTerm.value) || 
        contains(staff.email ?? '', searchTerm.value)
      )
    : available
})

// Pending collaborators to add
const pendingCollaborators = computed(() => 
  allStaff.value.filter(s => pendingAddIds.value.includes(s.id.toString()))
)

// Pending collaborators to remove
const pendingRemovals = computed(() => 
  currentCollaborators.value.filter(c => pendingRemoveIds.value.includes(c.id.toString()))
)

// Check if there are any pending changes
const hasChanges = computed(() => 
  pendingAddIds.value.length > 0 || pendingRemoveIds.value.length > 0
)

// Watch for modal open
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    errorMessage.value = ''
    successMessage.value = ''
    pendingAddIds.value = []
    pendingRemoveIds.value = []
    searchTerm.value = ''
    await loadData()
  }
})

/**
 * Load all staff and current project collaborators
 */
async function loadData() {
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // Fetch all staff
    const fetchedStaff = await $fetch<StaffMember[]>('/api/staff')
    allStaff.value = fetchedStaff

    // Fetch current project members
    const fetchedMembers = await $fetch<StaffMember[]>('/api/project-members', {
      params: { project_id: props.project.id }
    })
    currentCollaborators.value = fetchedMembers
  } catch (err: any) {
    console.error('Failed to load data:', err)
    errorMessage.value = err?.data?.statusMessage || 'Failed to load data'
  } finally {
    isLoading.value = false
  }
}

/**
 * Add staff to pending additions list
 */
function addToPending(staffId: string) {
  if (!pendingAddIds.value.includes(staffId)) {
    pendingAddIds.value.push(staffId)
  }
  searchTerm.value = ''
  comboboxOpen.value = false
}

/**
 * Remove staff from pending additions list
 */
function removeFromPending(staffId: string) {
  pendingAddIds.value = pendingAddIds.value.filter(id => id !== staffId)
}

/**
 * Mark a collaborator for removal
 */
function markForRemoval(staffId: string) {
  if (!pendingRemoveIds.value.includes(staffId)) {
    pendingRemoveIds.value.push(staffId)
  }
}

/**
 * Unmark a collaborator for removal
 */
function unmarkForRemoval(staffId: string) {
  pendingRemoveIds.value = pendingRemoveIds.value.filter(id => id !== staffId)
}

/**
 * Save all changes (add and remove collaborators)
 */
async function saveChanges() {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Process additions
    if (pendingAddIds.value.length > 0) {
      const response = await $fetch('/api/project-members', {
        method: 'POST',
        body: {
          project_id: props.project.id,
          staff_ids: pendingAddIds.value.map(id => parseInt(id))
        }
      })
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to add collaborators')
      }
    }

    // Process removals
    if (pendingRemoveIds.value.length > 0) {
      for (const staffId of pendingRemoveIds.value) {
        await $fetch('/api/project-members', {
          method: 'DELETE',
          body: {
            project_id: props.project.id,
            staff_id: parseInt(staffId)
          }
        })
      }
    }

    // Success!
    const addCount = pendingAddIds.value.length
    const removeCount = pendingRemoveIds.value.length
    const messages = []
    
    if (addCount > 0) {
      messages.push(`Added ${addCount} collaborator${addCount > 1 ? 's' : ''}`)
    }
    if (removeCount > 0) {
      messages.push(`Removed ${removeCount} collaborator${removeCount > 1 ? 's' : ''}`)
    }
    
    successMessage.value = messages.join(' and ')
    
    // Reset pending lists
    pendingAddIds.value = []
    pendingRemoveIds.value = []
    
    // Refresh the list
    await loadData()
    emit('collaborators-updated')
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (err: any) {
    console.error('Failed to save changes:', err)
    errorMessage.value = err?.data?.statusMessage || err.message || 'Failed to save changes'
  } finally {
    isSaving.value = false
  }
}

/**
 * Handle modal close
 */
function handleClose() {
  if (!isSaving.value) {
    // Warn if there are unsaved changes
    if (hasChanges.value) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to close?')
      if (!confirmed) return
    }
    emit('close')
  }
}
</script>

