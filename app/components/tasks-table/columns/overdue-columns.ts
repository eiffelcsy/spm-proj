// Create special columns for overdue tasks with red highlighting
import { h, computed } from 'vue'
import DataTableColumnHeader from '../data-table-column-header.vue'
import DropdownAction from '../data-table-dropdown.vue'
import { Badge } from '@/components/ui/badge'

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
    {
      accessorKey: 'startDate',
      header: ({ column }: any) => h(DataTableColumnHeader, { 
          column: column,
          title: 'Start Date'
      }),
      cell: ({ row }: any) => {
        const value = row.getValue('startDate') as string | null
        if (!value) return h('div', '—')
  
        const date = new Date(value)
        if (isNaN(date.getTime())) return h('div', '—')
  
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
      header: ({ column }: any) => h(DataTableColumnHeader, { 
          column: column,
          title: 'Due Date'
      }),
      cell: ({ row }: any) => {
        const value = row.getValue('dueDate') as string | null
        if (!value) return h('div', '—')
  
        const date = new Date(value)
        if (isNaN(date.getTime())) return h('div', '—')
  
        const formatted = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(date)
        return h('div', { class: 'text-red-600 font-semibold' }, formatted)
      },
    },
  // Find the project column in this file and replace it with:
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
    {
      accessorKey: 'status',
      header: ({ column }: any) => h(DataTableColumnHeader, { 
          column: column,
          title: 'Status'
      }),
      cell: ({ row }: any) => {
        const status = row.getValue('status') as string
        const statusClass = {
          'not-started': 'bg-red-100 text-red-800',
          'in-progress': 'bg-yellow-100 text-yellow-800',
          'completed': 'bg-green-100 text-green-800',
        }[status.toLowerCase()] || 'bg-red-100 text-red-800'
        
        return h(Badge, { 
          class: `w-22 items-center px-2.5 py-0.5 rounded-full text-xs text-center font-medium ${statusClass}` 
        }, status.replace('-', ' '))
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }: any) => {
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
  ])