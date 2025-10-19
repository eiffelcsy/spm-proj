import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from '../data-table-column-header.vue'
import type { Task } from '../data/schema'
import DropdownAction from '@/components/tasks-table/data-table-dropdown.vue'
import { 
  createTitleColumn, 
  createStartDateColumn, 
  createDueDateColumn, 
  createStatusColumn,
  createAssigneesColumn,
  createTagsColumn
} from './column-helpers'


export const columns: ColumnDef<Task>[] = [
  createTitleColumn(),
  createStartDateColumn(),
  createDueDateColumn(),
  {
    accessorKey: 'project',
    header: ({ column }) => h(DataTableColumnHeader, { 
        column: column,
        title: 'Project'
    }),
    cell: ({ row }) => {
      const project = row.getValue('project') as string
      const projectClass = project === 'personal' ? 'text-gray-500 italic' : 'text-blue-600'
      return h('div', { 
        class: `whitespace-normal break-words min-w-[120px] max-w-[180px] leading-tight py-1 ${projectClass}` 
      }, project)
    },
  },
  createAssigneesColumn(),
  createTagsColumn(),
  createStatusColumn(),
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const task = row.original

      return h('div', { class: 'relative' }, h(DropdownAction, {
        task: {
          id: task.id,
          status: task.status,
          title: task.title
        },
        onTaskUpdated: () => {
          // Emit event to refresh data table
          window.dispatchEvent(new CustomEvent('task-updated'))
        },
        onTaskDeleted: () => {
          // Emit event to refresh data table  
          window.dispatchEvent(new CustomEvent('task-deleted'))
        }
      }))
    },
  },
]