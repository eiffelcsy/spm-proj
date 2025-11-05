import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTableColumnHeader from '../data-table-column-header.vue'
import type { Task } from '../data/schema'
import { 
  createTitleColumn, 
  createStartDateColumn, 
  createDueDateColumn, 
  createStatusColumn,
  createAssigneesColumn,
  createTagsColumn,
  createNumericPriorityColumn
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
      const projectId = row.original.project_id
      const isPersonal = project === 'personal'
      const projectClass = isPersonal ? 'text-gray-500 italic' : 'text-blue-600 hover:underline cursor-pointer'
      
      return h('div', { 
        class: `whitespace-normal break-words min-w-[120px] max-w-[180px] leading-tight py-1` 
      }, [
        isPersonal || !projectId ? h('span', { class: projectClass }, project) : h('a', {
          class: projectClass,
          href: `/project/${projectId}`,
          onClick: (e: Event) => {
            e.stopPropagation()
            // Navigate using window.location to ensure proper routing
            window.location.href = `/project/${projectId}`
          }
        }, project)
      ])
    },
  },
  createNumericPriorityColumn(),
  createAssigneesColumn(),
  createTagsColumn(),
  createStatusColumn(),
]