import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from './data-table-column-header.vue'
import type { Task } from './data/schema'
import DropdownAction from '@/components/tasks/data-table-dropdown.vue'


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
      const value = row.getValue('startDate') as string | null
      if (!value) return h('div', '—') // show dash if empty

      const date = new Date(value) // safely convert string to Date
      if (isNaN(date.getTime())) return h('div', '—') // invalid date guard

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
      const value = row.getValue('dueDate') as string | null
      if (!value) return h('div', '—') // show dash if empty

      const date = new Date(value) // safely convert string to Date
      if (isNaN(date.getTime())) return h('div', '—') // invalid date guard

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