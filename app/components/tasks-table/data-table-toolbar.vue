<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'
import { computed } from 'vue'

import { Cross2Icon, UpdateIcon } from '@radix-icons/vue'
import { PlusSquare } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { statuses } from './data/data'
import DataTableFacetedFilter from './data-table-faceted-filter.vue'

interface DataTableToolbarProps {
  table: Table<any>
  showCreateButton?: boolean
  showRefreshButton?: boolean
  assigneeOptions?: Array<{ id: number; fullname: string }>
}

const props = defineProps<DataTableToolbarProps>()
const emit = defineEmits(['create-task', 'refresh-tasks'])

const isFiltered = computed(() => props.table.getState().columnFilters.length > 0)

// Convert assignee options to filter format
const assigneeFilterOptions = computed(() => {
  if (!props.assigneeOptions || props.assigneeOptions.length === 0) {
    return []
  }
  
  return props.assigneeOptions.map(assignee => ({
    label: assignee.fullname,
    value: assignee.id.toString()
  }))
})

defineOptions({
  name: 'DataTableToolbar'
})
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex flex-1 items-center space-x-2">
      <Input
        placeholder="Filter tasks..."
        :model-value="(table.getColumn('title')?.getFilterValue() as string) ?? ''"
        class="h-8 w-[150px] lg:w-[250px]"
        @input="table.getColumn('title')?.setFilterValue($event.target.value)"
      />
      <DataTableFacetedFilter
        v-if="table.getColumn('status')"
        :column="table.getColumn('status')"
        title="Status"
        :options="statuses"
      />
      
      <DataTableFacetedFilter
        v-if="table.getColumn('assignees') && assigneeFilterOptions.length > 0"
        :column="table.getColumn('assignees')"
        title="Assignees"
        :options="assigneeFilterOptions"
      />

      <Button
        v-if="isFiltered"
        variant="ghost"
        class="h-8 px-2 lg:px-3"
        @click="table.resetColumnFilters()"
      >
        Reset
        <Cross2Icon class="ml-2 h-4 w-4" />
      </Button>
    </div>
    
    <div class="flex flex-1 justify-end space-x-2">
      <div v-if="showRefreshButton">
        <Button
          variant="outline"
          size="sm"
          class="h-8"
          @click="emit('refresh-tasks')"
        >
          <UpdateIcon class="md:mr-2 h-4 w-4" />
          <span class="hidden md:block">Refresh</span>
        </Button>
      </div>
      <div v-if="showCreateButton">
        <Button
          variant="default"
          size="sm"
          class="h-8"
          @click="emit('create-task')"
        >
          <PlusSquare class="md:mr-2 h-4 w-4" />
          <span class="hidden md:block">Create New Task</span>
        </Button>
      </div>
    </div>
  </div>
</template>