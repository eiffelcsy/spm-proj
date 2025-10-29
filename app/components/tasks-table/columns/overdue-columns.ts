// Create special columns for overdue tasks with red highlighting
import { h, computed } from 'vue'
import DataTableColumnHeader from '../data-table-column-header.vue'
import { formatDate, createStartDateColumn, createStatusColumn, createAssigneesColumn, createTagsColumn, createNumericPriorityColumn } from './column-helpers'

export const overdueColumns = computed(() => [
    {
      accessorKey: 'title',
      header: ({ column }: any) => h(DataTableColumnHeader, { 
          column: column,
          title: 'Title'
      }),
      cell: ({ row }: any) => {
        return h('div', { class: 'max-w-[500px] w-72 truncate font-medium text-red-900' }, row.getValue('title'))
      },
    },
    createStartDateColumn(),
    {
      accessorKey: 'dueDate',
      header: ({ column }: any) => h(DataTableColumnHeader, { 
          column: column,
          title: 'Due Date'
      }),
      cell: ({ row }: any) => {
        const value = row.getValue('dueDate') as string | null
        return h('div', { class: 'text-red-600 font-semibold' }, formatDate(value))
      },
    },
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
    createNumericPriorityColumn(),
    createAssigneesColumn(),
    createTagsColumn(),
    createStatusColumn(),
  ])