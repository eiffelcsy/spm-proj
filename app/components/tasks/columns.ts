import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from './data-table-column-header.vue'

export interface Task {
  id: string
  title: string
  startDate: Date
  dueDate: Date
  project: string
  status: string
}

export const columns: ColumnDef<Task>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => h(DataTableColumnHeader, { 
        column: column,
        title: 'Title'
    }),
    cell: ({ row }) => {
      return h('div', { class: 'max-w-[500px] w-72 truncate font-medium' }, row.getValue('title'))
    },
  },
  {
    accessorKey: 'startDate',
    header: ({ column }) => h(DataTableColumnHeader, { 
        column: column,
        title: 'Start Date'
    }),
    cell: ({ row }) => {
      const date = row.getValue('startDate') as Date
      const formatted = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
      return h('div', formatted)
    },
  },
  {
    accessorKey: 'dueDate',
    header: ({ column }) => h(DataTableColumnHeader, { 
        column: column,
        title: 'Due Date'
    }),
    cell: ({ row }) => {
      const date = row.getValue('dueDate') as Date
      const formatted = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
      return h('div', formatted)
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
        class: `flex max-w-32 truncate w-32 items-center ${projectClass}` 
      }, project)
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => h(DataTableColumnHeader, { 
        column: column,
        title: 'Status'
    }),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const statusClass = {
        'not-started': 'bg-red-100 text-red-800',
        'in-progress': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-green-100 text-green-800',
      }[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
      
      return h('div', { 
        class: `w-22 items-center px-2.5 py-0.5 rounded-full text-xs text-center font-medium ${statusClass}` 
      }, status)
    },
  },
]