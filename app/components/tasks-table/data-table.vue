

<script setup lang="ts">
import type { ColumnDef, SortingState } from '@tanstack/vue-table'
import {
    FlexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useVueTable,
} from '@tanstack/vue-table'
import { valueUpdater } from '@/lib/utils'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import DataTablePagination from './data-table-pagination.vue'
import DataTableToolbar from './data-table-toolbar.vue'

const props = defineProps<{ 
  columns: any[]; 
  data: any[]; 
  hideToolbar?: boolean; 
  showCreateButton?: boolean; 
  showRefreshButton?: boolean;
  assigneeOptions?: Array<{ id: number; fullname: string }>
}>()
const emit = defineEmits(['rowClick', 'create-task', 'refresh-tasks'])
function handleRowClick(row: any) {
    emit('rowClick', row.original)
}
// Set default sorting to priority descending (highest priority at the top)
const sorting = ref([{ id: 'priority', desc: true }])
const table = useVueTable({
    get data() { return props.data },
    get columns() { return props.columns },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
    state: {
        get sorting() { return sorting.value },
    },
})

defineOptions({
  name: 'DataTable'
})
</script>

<template>
    <div class="space-y-2">
        <DataTableToolbar 
            v-if="!props.hideToolbar" 
            :table="table" 
            :showCreateButton="props.showCreateButton"
            :showRefreshButton="props.showRefreshButton"
            :assigneeOptions="props.assigneeOptions"
            @create-task="emit('create-task')"
            @refresh-tasks="emit('refresh-tasks')"
        />
        <div class="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead v-for="header in headerGroup.headers" :key="header.id">
                            <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header"
                                :props="header.getContext()" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <template v-if="table.getRowModel().rows?.length">
                        <TableRow v-for="row in table.getRowModel().rows" :key="row.id"
                            :data-state="row.getIsSelected() ? 'selected' : undefined"
                            @click="handleRowClick(row)">
                            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                            </TableCell>
                        </TableRow>
                    </template>
                    <template v-else>
                        <TableRow>
                            <TableCell :colspan="columns.length" class="h-24 text-center">
                                No results.
                            </TableCell>
                        </TableRow>
                    </template>
                </TableBody>
            </Table>
        </div>
        <DataTablePagination :table="table" />
    </div>
</template>