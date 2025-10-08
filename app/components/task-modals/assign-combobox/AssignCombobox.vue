<template>
  <div class="flex flex-col gap-1 w-full">
    <div v-if="label" class="flex items-center justify-between">
      <label :class="labelClass">{{ label }}</label>
      <span v-if="maxLimitReached" class="text-xs text-orange-600 font-medium">
        Maximum {{ maxAssignees }} assignees reached
      </span>
      <span v-else-if="showMinimumWarning" class="text-xs text-red-600 font-medium">
        At least {{ minAssignees }} assignee{{ minAssignees > 1 ? 's' : '' }} required
      </span>
    </div>
    <Combobox v-model="selectedIds" v-model:open="open" :ignore-filter="true" class="w-full">
      <ComboboxAnchor class="w-full py-0" as-child>
        <TagsInput v-model="selectedIds" class="w-full min-w-[200px] max-w-full py-3">
          <div v-if="selectedStaffMembers.length > 0" class="flex gap-2 flex-wrap items-center w-full">
            <TagsInputItem
            v-for="staff in selectedStaffMembers"
            :key="staff.id"
            :value="staff.id.toString()"
            :class="['max-w-full py-4', { 'pr-2': !canRemoveAssignee(staff.id.toString()) }]"
            >
            <span class="truncate block max-w-full p-3">{{ staff.email }}</span>
            <TagsInputItemDelete v-if="canRemoveAssignee(staff.id.toString())" />
            <span 
              v-else 
              class="ml-2 text-xs text-muted-foreground italic"
              :title="`Cannot remove: ${getRemovalBlockReason()}`"
            >
              (Required)
            </span>
            </TagsInputItem>
          </div>
          <ComboboxInput v-model="searchTerm" class="w-full" as-child>
            <TagsInputInput
              :placeholder="placeholder"
              class="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
              @keydown.enter.prevent
            />
          </ComboboxInput>
        </TagsInput>

        <ComboboxList class="w-[--reka-popper-anchor-width] max-h-60 overflow-y-auto left-0" align="start">
          <ComboboxEmpty class="w-full p-2 pt-3 text-center text-muted-foreground">
            No staff found
          </ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxItem
              v-for="staff in filteredStaff"
              :key="staff.id"
              :value="staff.id.toString()"
              @select.prevent="onSelectStaff(staff.id.toString())"
              class="px-2 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {{ staff.fullname }} <span class="text-xs text-muted-foreground">({{ staff.email }})</span>
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxList>
      </ComboboxAnchor>
    </Combobox>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from "@/components/ui/tags-input"
import { useFilter } from "reka-ui"
import type { StaffMember } from "@/types"

interface Props {
  modelValue?: string[]
  label?: string
  placeholder?: string
  staffMembers?: StaffMember[]
  compact?: boolean
  maxAssignees?: number
  minAssignees?: number
  canRemoveAssignees?: boolean  // For future manager role feature
  currentUserId?: string        // For future self-removal prevention
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Assign staff...',
  label: 'Assign To',
  staffMembers: () => [],
  compact: false,
  modelValue: () => [],
  maxAssignees: 5,
  minAssignees: 1,
  canRemoveAssignees: true,  // Default: allow removal (will be controlled by manager role later)
  currentUserId: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const selectedIds = ref<string[]>(props.modelValue ?? [])
watch(() => props.modelValue, v => { if (v) selectedIds.value = v }, { immediate: true })
watch(selectedIds, v => emit('update:modelValue', v))

const open = ref(false)
const searchTerm = ref("")
const maxLimitReached = computed(() => selectedIds.value.length >= props.maxAssignees)
const minLimitReached = computed(() => selectedIds.value.length <= props.minAssignees)
const showMinimumWarning = computed(() => minLimitReached.value && props.minAssignees > 0)

const { contains } = useFilter({ sensitivity: "base" })
const filteredStaff = computed(() => {
  const options = props.staffMembers.filter(i => !selectedIds.value.includes(i.id.toString()))
  return searchTerm.value
    ? options.filter(option => contains(option.fullname, searchTerm.value) || contains(option.email, searchTerm.value))
    : options
})

const selectedStaffMembers = computed(() => 
  props.staffMembers.filter(s => selectedIds.value.includes(s.id.toString()))
)


function onSelectStaff(id: string) {
  if (!selectedIds.value.includes(id)) {
    // Check if max limit is reached
    if (selectedIds.value.length >= props.maxAssignees) {
      return // Don't add more if limit reached
    }
    selectedIds.value = [...selectedIds.value, id]
  }
  searchTerm.value = ""
}

/**
 * Check if an assignee can be removed
 * Future enhancement: Add manager role check here
 * @param staffId - The staff ID to check
 */
function canRemoveAssignee(staffId: string): boolean {
  // Enforce minimum assignees - cannot remove if at minimum
  if (selectedIds.value.length <= props.minAssignees) {
    return false
  }
  
  // Future enhancement: Check if current user has manager rights
  // if (!props.canRemoveAssignees) {
  //   return false
  // }
  
  // Future enhancement: Prevent non-managers from removing others
  // if (!props.canRemoveAssignees && staffId !== props.currentUserId) {
  //   return false
  // }
  
  return true
}

/**
 * Get the reason why removal is blocked (for tooltips)
 * Future enhancement: Add more specific reasons based on manager role
 */
function getRemovalBlockReason(): string {
  if (selectedIds.value.length <= props.minAssignees) {
    return `At least ${props.minAssignees} assignee${props.minAssignees > 1 ? 's are' : ' is'} required`
  }
  
  // Future enhancements:
  // if (!props.canRemoveAssignees) {
  //   return 'Only managers can remove assignees'
  // }
  
  return 'Cannot remove this assignee'
}

const labelClass = computed(() =>
  props.compact ? 'text-xs font-medium' : 'text-sm font-medium'
)
</script>

<style scoped>
/* Ensure the tags input expands but stays within modal width */
.TagsInput {
  flex-wrap: wrap;
  max-width: 100%;
}
</style>