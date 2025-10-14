import { h } from 'vue'
import { Badge } from '@/components/ui/badge'
import DataTableColumnHeader from '../data-table-column-header.vue'

/**
 * Format a date value for display
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—'
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dueDate: string | Date | null | undefined, status?: string): boolean {
  if (!dueDate) return false
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  if (!(due instanceof Date) || isNaN(due.getTime())) return false
  return due < new Date() && status !== 'completed'
}

/**
 * Get status badge classes
 */
export function getStatusClasses(status: string): string {
  const statusClass = {
    'not-started': 'bg-red-100 text-red-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
  }[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  
  return `w-22 capitalize items-center px-2.5 py-0.5 rounded-full text-xs text-center font-medium ${statusClass}`
}

/**
 * Get priority display text
 */
export function getPriorityDisplay(priority: number | string | null | undefined): string {
  if (!priority) return 'Not Set'
  
  const priorityNum = typeof priority === 'string' ? parseInt(priority) : priority
  if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 10) return 'Not Set'
  
  const priorityOptions = [
    { level: 1, label: 'Lowest' },
    { level: 2, label: 'Very Low' },
    { level: 3, label: 'Low' },
    { level: 4, label: 'Medium Low' },
    { level: 5, label: 'Medium' },
    { level: 6, label: 'Medium High' },
    { level: 7, label: 'High' },
    { level: 8, label: 'Very High' },
    { level: 9, label: 'Critical' },
    { level: 10, label: 'Emergency' }
  ]
  
  const option = priorityOptions.find(p => p.level === priorityNum)
  return option ? `Level ${option.level} (${option.label})` : 'Not Set'
}

/**
 * Get priority color class
 */
export function getPriorityColorClass(priority: number | string | null | undefined): string {
  if (!priority) return 'bg-gray-400'
  
  const priorityNum = typeof priority === 'string' ? parseInt(priority) : priority
  if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 10) return 'bg-gray-400'
  
  const colorClasses = [
    'bg-blue-400',    // Level 1 - Lowest
    'bg-blue-500',    // Level 2 - Very Low
    'bg-indigo-500',  // Level 3 - Low
    'bg-green-500',   // Level 4 - Medium Low
    'bg-yellow-500',  // Level 5 - Medium
    'bg-orange-500',  // Level 6 - Medium High
    'bg-red-400',     // Level 7 - High
    'bg-red-500',     // Level 8 - Very High
    'bg-red-600',     // Level 9 - Critical
    'bg-purple-600'   // Level 10 - Emergency
  ]
  
  return colorClasses[priorityNum - 1] || 'bg-gray-400'
}

/**
 * Create a reusable title column
 */
export function createTitleColumn() {
  return {
    accessorKey: 'title',
    header: ({ column }: any) => h(DataTableColumnHeader, { 
      column: column,
      title: 'Title'
    }),
    cell: ({ row }: any) => {
      return h('div', { class: 'max-w-[500px] w-72 truncate font-medium' }, row.getValue('title'))
    },
  }
}

/**
 * Create a reusable start date column
 */
export function createStartDateColumn() {
  return {
    accessorKey: 'startDate',
    header: ({ column }: any) => h(DataTableColumnHeader, { 
      column: column,
      title: 'Start Date'
    }),
    cell: ({ row }: any) => {
      const value = row.getValue('startDate') as string | null
      return h('div', formatDate(value))
    },
  }
}

/**
 * Create a reusable due date column
 */
export function createDueDateColumn(options?: { showOverdue?: boolean }) {
  return {
    accessorKey: 'dueDate',
    header: ({ column }: any) => h(DataTableColumnHeader, { 
      column: column,
      title: 'Due Date'
    }),
    cell: ({ row }: any) => {
      const value = row.getValue('dueDate') as string | null
      const status = row.original?.status
      const overdueClass = options?.showOverdue && isOverdue(value, status) 
        ? 'text-red-600 font-semibold' 
        : ''
      return h('div', { class: overdueClass }, formatDate(value))
    },
  }
}

/**
 * Create a reusable status column
 */
export function createStatusColumn() {
  return {
    accessorKey: 'status',
    header: ({ column }: any) => h(DataTableColumnHeader, { 
      column: column,
      title: 'Status'
    }),
    cell: ({ row }: any) => {
      const status = row.getValue('status') as string
      return h(Badge, { 
        class: getStatusClasses(status)
      }, () => status.replace('-', ' '))
    },
  }
}

/**
 * Create a reusable priority column
 */
export function createPriorityColumn() {
  return {
    accessorKey: 'priority',
    header: ({ column }: any) => h(DataTableColumnHeader, { 
      column: column,
      title: 'Priority'
    }),
    cell: ({ row }: any) => {
      const priority = row.getValue('priority')
      return h(
        'div',
        { class: 'flex items-center space-x-2' },
        [
          h('div', {
            class: `w-2 h-2 rounded-full ${getPriorityColorClass(priority)}`
          }),
          h('span', { class: 'text-sm' }, getPriorityDisplay(priority))
        ]
      )
    },
    enableSorting: true,
    enableFiltering: true,
  }
}

