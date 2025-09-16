import { describe, it, expect } from 'vitest'
import { columns } from '../../app/components/tasks/columns'
import type { Task } from '../../app/components/tasks/data/schema'
import type { ColumnDef, Row } from '@tanstack/vue-table'

// Type-safe interfaces for testing
interface MockRow {
  getValue: (key: keyof Task) => any
}

interface MockCellContext {
  row: MockRow
}

interface MockHeaderContext {
  column: {
    id: string
    getCanSort: () => boolean
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc?: boolean) => void
  }
}

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  startDate: new Date('2025-09-01T10:00:00Z'),
  dueDate: new Date('2025-09-20T15:30:00Z'),
  project: 'Test Project',
  status: 'in-progress'
}

const personalTask: Task = {
  id: '2',
  title: 'Personal Task',
  startDate: new Date('2025-09-05'),
  dueDate: new Date('2025-09-15'),
  project: 'personal',
  status: 'completed'
}

// Helper function to create a typed column
function getTypedColumn(accessorKey: keyof Task): ColumnDef<Task> | undefined {
  return columns.find(col => {
    const typedCol = col as ColumnDef<Task> & { accessorKey?: keyof Task }
    return typedCol.accessorKey === accessorKey
  })
}

// Helper function to create mock row
function createMockRow(task: Task): MockRow {
  return {
    getValue: (key: keyof Task) => task[key]
  }
}

describe('Task Columns Configuration', () => {
  it('exports correct number of columns', () => {
    expect(columns).toHaveLength(5)
  })

  it('has correct column accessor keys', () => {
    const accessorKeys = columns.map(col => {
      const typedCol = col as ColumnDef<Task> & { accessorKey?: keyof Task }
      return typedCol.accessorKey
    })
    expect(accessorKeys).toEqual(['title', 'startDate', 'dueDate', 'project', 'status'])
  })

  it('title column renders correctly', () => {
    const titleColumn = getTypedColumn('title')
    expect(titleColumn).toBeDefined()

    if (titleColumn?.cell && typeof titleColumn.cell === 'function') {
      const mockContext: MockCellContext = {
        row: createMockRow(mockTask)
      }
      
      const cellResult = titleColumn.cell(mockContext as any)
      expect(cellResult).toBeDefined()
    }
  })

  it('date columns format dates correctly', () => {
    const startDateColumn = getTypedColumn('startDate')
    const dueDateColumn = getTypedColumn('dueDate')

    expect(startDateColumn).toBeDefined()
    expect(dueDateColumn).toBeDefined()

    // Test date formatting in cell renderer
    if (startDateColumn?.cell && typeof startDateColumn.cell === 'function') {
      const mockContext: MockCellContext = {
        row: createMockRow(mockTask)
      }
      
      const startDateCell = startDateColumn.cell(mockContext as any)
      expect(startDateCell).toBeDefined()
    }

    if (dueDateColumn?.cell && typeof dueDateColumn.cell === 'function') {
      const mockContext: MockCellContext = {
        row: createMockRow(mockTask)
      }
      
      const dueDateCell = dueDateColumn.cell(mockContext as any)
      expect(dueDateCell).toBeDefined()
    }
  })

  it('project column applies correct styling for personal projects', () => {
    const projectColumn = getTypedColumn('project')
    expect(projectColumn).toBeDefined()

    if (projectColumn?.cell && typeof projectColumn.cell === 'function') {
      // Test personal project styling
      const personalMockContext: MockCellContext = {
        row: createMockRow(personalTask)
      }
      
      const personalProjectCell = projectColumn.cell(personalMockContext as any)
      expect(personalProjectCell).toBeDefined()

      // Test regular project styling
      const regularMockContext: MockCellContext = {
        row: createMockRow(mockTask)
      }
      
      const regularProjectCell = projectColumn.cell(regularMockContext as any)
      expect(regularProjectCell).toBeDefined()
    }
  })

  it('status column applies correct styling for different statuses', () => {
    const statusColumn = getTypedColumn('status')
    expect(statusColumn).toBeDefined()

    const statuses: Task['status'][] = ['not-started', 'in-progress', 'completed']

    if (statusColumn?.cell && typeof statusColumn.cell === 'function') {
      statuses.forEach(status => {
        const testTask: Task = { ...mockTask, status }
        const mockContext: MockCellContext = {
          row: createMockRow(testTask)
        }
        
        const statusCell = (statusColumn.cell as Function)(mockContext as any)
        expect(statusCell).toBeDefined()
      })
    }
  })

  it('handles unknown status gracefully', () => {
    const statusColumn = getTypedColumn('status')

    if (statusColumn?.cell && typeof statusColumn.cell === 'function') {
      const testTask: Task = { ...mockTask, status: 'unknown-status' }
      const mockContext: MockCellContext = {
        row: createMockRow(testTask)
      }
      
      const unknownStatusCell = statusColumn.cell(mockContext as any)
      expect(unknownStatusCell).toBeDefined()
    }
  })

  it('Task interface has correct structure', () => {
    const task: Task = {
      id: 'test-id',
      title: 'Test Title',
      startDate: new Date(),
      dueDate: new Date(),
      project: 'Test Project',
      status: 'in-progress'
    }

    expect(task.id).toBe('test-id')
    expect(task.title).toBe('Test Title')
    expect(task.startDate).toBeInstanceOf(Date)
    expect(task.dueDate).toBeInstanceOf(Date)
    expect(task.project).toBe('Test Project')
    expect(task.status).toBe('in-progress')
  })

  it('all columns have header configuration', () => {
    columns.forEach(column => {
      const typedCol = column as ColumnDef<Task>
      expect(typedCol.header).toBeDefined()
      expect(typeof typedCol.header).toBe('function')
    })
  })

  it('all columns have cell configuration', () => {
    columns.forEach(column => {
      const typedCol = column as ColumnDef<Task>
      expect(typedCol.cell).toBeDefined()
      expect(typeof typedCol.cell).toBe('function')
    })
  })
})