import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import DataTable from '@/components/tasks/data-table.vue'
import { columns } from '@/components/tasks/columns'
import type { Task } from '@/components/tasks/data/schema'

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Test Task 1',
    startDate: new Date('2025-09-01'),
    dueDate: new Date('2025-09-20'),
    project: 'Test Project',
    status: 'not-started'
  },
  {
    id: '2',
    title: 'Test Task 2',
    startDate: new Date('2025-09-10'),
    dueDate: new Date('2025-09-15'),
    project: 'personal',
    status: 'in-progress'
  },
  {
    id: '3',
    title: 'Test Task 3',
    startDate: new Date('2025-09-12'),
    dueDate: new Date('2025-09-18'),
    project: 'Another Project',
    status: 'completed'
  }
]

describe('DataTable Component', () => {
  it('renders table with correct structure', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('thead').exists()).toBe(true)
    expect(wrapper.find('tbody').exists()).toBe(true)
  })

  it('displays correct number of rows', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    const bodyRows = wrapper.findAll('tbody tr')
    expect(bodyRows).toHaveLength(mockTasks.length)
  })

  it('displays correct column headers', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    const headers = wrapper.findAll('thead th')
    expect(headers).toHaveLength(columns.length)

    // Check if headers contain expected text (DataTableColumnHeader components)
    const headerTexts = headers.map(h => h.text())
    expect(headerTexts.some(text => text.includes('Title'))).toBe(true)
    expect(headerTexts.some(text => text.includes('Start Date'))).toBe(true)
    expect(headerTexts.some(text => text.includes('Due Date'))).toBe(true)
    expect(headerTexts.some(text => text.includes('Project'))).toBe(true)
    expect(headerTexts.some(text => text.includes('Status'))).toBe(true)
  })

  it('displays task data correctly', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    // Check if task titles are displayed
    const tableText = wrapper.text()
    expect(tableText).toContain('Test Task 1')
    expect(tableText).toContain('Test Task 2')
    expect(tableText).toContain('Test Task 3')
  })

  it('formats dates correctly', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    // Check if dates are formatted (US format: Sep 1, 2025)
    const tableText = wrapper.text()
    expect(tableText).toContain('Sep 1, 2025')
    expect(tableText).toContain('Sep 10, 2025')
    expect(tableText).toContain('Sep 12, 2025')
  })

  it('displays status badges with correct styling', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    const statusElements = wrapper.findAll('[class*="bg-"]')
    expect(statusElements.length).toBeGreaterThan(0)

    // Check if different status colors are applied
    const tableHtml = wrapper.html()
    expect(tableHtml).toContain('bg-red-100') // not-started
    expect(tableHtml).toContain('bg-yellow-100') // in-progress
    expect(tableHtml).toContain('bg-green-100') // completed
  })

  it('applies special styling to personal projects', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    const tableHtml = wrapper.html()
    expect(tableHtml).toContain('text-gray-500 italic') // personal project styling
  })

  it('displays "No results" when data is empty', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: []
      }
    })

    expect(wrapper.text()).toContain('No results.')
  })

  it('includes toolbar component', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    expect(wrapper.findComponent({ name: 'DataTableToolbar' }).exists()).toBe(true)
  })

  it('includes pagination component', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    expect(wrapper.findComponent({ name: 'DataTablePagination' }).exists()).toBe(true)
  })

  it('handles sorting functionality', async () => {
    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: mockTasks
      }
    })

    // Check if sorting is initialized by checking if table headers are clickable
    const headerButton = wrapper.find('button')
    expect(headerButton.exists()).toBe(true)
  })

  it('truncates long titles correctly', async () => {
    const longTitleTask: Task = {
      id: '4',
      title: 'This is a very long task title that should be truncated to fit within the specified width constraints',
      startDate: new Date('2025-09-01'),
      dueDate: new Date('2025-09-20'),
      project: 'Test Project',
      status: 'not-started'
    }

    const wrapper = await mountSuspended(DataTable, {
      props: {
        columns,
        data: [longTitleTask]
      }
    })

    const titleCell = wrapper.find('[class*="truncate"]')
    expect(titleCell.exists()).toBe(true)
    expect(titleCell.classes()).toContain('truncate')
  })
})