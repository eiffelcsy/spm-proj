<template>
  <div class="flex flex-col gap-1 w-full">
    <label v-if="label" :class="labelClass">{{ label }}</label>
    <Combobox v-model="selectedIds" v-model:open="open" :ignore-filter="true">
      <ComboboxAnchor as-child>
        <TagsInput v-model="selectedIds" class="px-2 gap-2 w-full min-w-[200px] max-w-full py-1">
          <div class="flex gap-2 flex-wrap items-center w-full py-1">
            <TagsInputItem
            v-for="staff in selectedStaffMembers"
            :key="staff.id"
            :value="staff.id.toString()"
            class="max-w-full py-4"
            >
            <span class="truncate block max-w-full p-3">{{ staff.email }}</span>
            <TagsInputItemDelete />
            </TagsInputItem>
          </div>
          <ComboboxInput v-model="searchTerm" as-child>
            <TagsInputInput
              :placeholder="placeholder"
              class="min-w-[120px] w-full p-0 border-none focus-visible:ring-0 h-auto"
              @keydown.enter.prevent
            />
          </ComboboxInput>
        </TagsInput>
        <ComboboxList class="w-[--reka-popper-anchor-width] max-h-60 overflow-auto">
        <ComboboxEmpty class="w-full px-2 py-2 text-center text-muted-foreground">
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

interface StaffMember {
  id: number
  fullname: string
  email: string
}

interface Props {
  modelValue?: string[]
  label?: string
  placeholder?: string
  staffMembers?: StaffMember[]
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Assign staff...',
  label: 'Assign To',
  staffMembers: () => [],
  compact: false,
  modelValue: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const selectedIds = ref<string[]>(props.modelValue ?? [])
watch(() => props.modelValue, v => { if (v) selectedIds.value = v }, { immediate: true })
watch(selectedIds, v => emit('update:modelValue', v))

const open = ref(false)
const searchTerm = ref("")

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
    selectedIds.value = [...selectedIds.value, id]
  }
  searchTerm.value = ""
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