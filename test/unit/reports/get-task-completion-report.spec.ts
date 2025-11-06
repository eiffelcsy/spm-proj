import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/reports/task-completion.get'
import type { H3Event } from 'h3'

// Mock the Supabase server functions
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

// Mock the utility functions
vi.mock('~/server/utils/departmentHierarchy', () => ({
  getVisibleStaffIds: vi.fn(),
}))

// Mock h3 functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    getQuery: vi.fn(),
    defineEventHandler: (fn: any) => fn,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('GET /api/reports/task-completion - Task Completion Report API Endpoint', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockGetQuery: any

  // Helper to create awaitable query builders
  const createAwaitableQuery = (data: any, error: any = null) => {
    const result = { data, error }
    const query: any = {}
    query.select = vi.fn().mockReturnValue(query)
    query.is = vi.fn().mockReturnValue(query)
    query.gte = vi.fn().mockReturnValue(query)
    query.lt = vi.fn().mockReturnValue(query)
    query.eq = vi.fn().mockReturnValue(query)
    query.in = vi.fn().mockReturnValue(query)
    query.limit = vi.fn().mockReturnValue(query)
    // Make the query builder itself awaitable by implementing then
    query.then = (resolve: any, reject?: any) => {
      return Promise.resolve(result).then(resolve, reject)
    }
    return query
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { getQuery } = await import('h3')
    mockGetQuery = vi.mocked(getQuery)
    
    // Setup mock event
    mockEvent = {
      node: { req: {}, res: {} }
    } as any
    
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn()
    }
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      mockGetQuery.mockReturnValue({})
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 401,
        statusMessage: expect.stringContaining('Unauthorized')
      })
    })

    it('should return 403 if user is not a manager or admin', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: false, is_admin: false, department: 'Developers' },
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockGetQuery.mockReturnValue({})
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: expect.stringContaining('Only managers and admins')
      })
    })

    it('should return 500 when staff data is null', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetQuery.mockReturnValue({})
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null, // staffData is null
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff data'
      })
    })
  })

  describe('Successful Report Generation', () => {
    it('should generate report with all filters', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1, 2, 3])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery([
        {
          id: 1,
          title: 'Task 1',
          status: 'completed',
          start_date: '2024-01-01',
          due_date: '2024-01-31',
          completed_at: '2024-01-15',
          created_at: '2024-01-01T00:00:00Z',
          project_id: 1,
          creator_id: 1
        },
        {
          id: 2,
          title: 'Task 2',
          status: 'in-progress',
          start_date: '2024-01-10',
          due_date: '2024-02-01',
          completed_at: null,
          created_at: '2024-01-10T00:00:00Z',
          project_id: 1,
          creator_id: 1
        }
      ])
      
      const mockVisibleAssigneeQuery = createAwaitableQuery([
        { task_id: 1 },
        { task_id: 2 }
      ])
      
      const mockAssigneeQuery = createAwaitableQuery([
        { task_id: 1 },
        { task_id: 2 }
      ])
      
      const mockStaffListQuery = createAwaitableQuery([
        { id: 1, fullname: 'John Doe' }
      ])
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project' },
          error: null
        })
      }
      
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { fullname: 'John Doe' },
          error: null
        })
      }
      
      let staffCallCount = 0
      let taskAssigneeCallCount = 0
      let projectCallCount = 0
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCallCount++
          if (staffCallCount === 1) return mockStaffQuery // Initial staff lookup
          if (staffCallCount === 2) return mockUserQuery // User name lookup for filter
          return mockStaffListQuery // Staff list for each task's assignees
        }
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          taskAssigneeCallCount++
          if (taskAssigneeCallCount === 1) return mockVisibleAssigneeQuery // Visible assigned tasks
          if (taskAssigneeCallCount === 2) return mockAssigneeQuery // Assigned tasks for user filter
          // For each task in the loop (assignees)
          return mockAssigneeQuery
        }
        if (table === 'projects') {
          projectCallCount++
          if (projectCallCount === 1) return mockProjectQuery // Project name for filter
          // For each task in the loop (project info)
          return mockProjectQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        user_id: '1',
        project_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.metrics).toBeDefined()
      expect(response.data.metrics.totalTasks).toBe(2)
      expect(response.data.metrics.completedTasks).toBe(1)
      expect(response.data.metrics.inProgressTasks).toBe(1)
      expect(response.data.tasks).toBeDefined()
    })

    it('should filter tasks by visible staff when no user_id provided', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1, 2])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              title: 'Task 1',
              status: 'completed',
              start_date: '2024-01-01',
              due_date: '2024-01-31',
              completed_at: '2024-01-15',
              created_at: '2024-01-01T00:00:00Z',
              project_id: 1,
              creator_id: 1
            }
          ],
          error: null
        })
      }
      
      const mockVisibleAssigneeQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ task_id: 1 }],
          error: null
        })
      }
      
      const mockAssigneeQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }],
        error: null
      }
      
      const mockStaffListQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: 1, fullname: 'John Doe' }],
          error: null
        })
      }
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project' },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockStaffListQuery
        }
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 2) return mockVisibleAssigneeQuery
          return mockAssigneeQuery
        }
        if (table === 'projects') return mockProjectQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data.metrics.totalTasks).toBe(1)
    })

    it('should return empty results when no visible staff', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              title: 'Task 1',
              status: 'completed',
              start_date: '2024-01-01',
              due_date: '2024-01-31',
              completed_at: '2024-01-15',
              created_at: '2024-01-01T00:00:00Z',
              project_id: 1,
              creator_id: 1
            }
          ],
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'tasks') return mockTasksQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({})
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data.metrics.totalTasks).toBe(0)
    })

    it('should return 403 if user_id is not in visible staff', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1, 2])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery([
        {
          id: 1,
          title: 'Task 1',
          status: 'completed',
          start_date: '2024-01-01',
          due_date: '2024-01-31',
          completed_at: '2024-01-15',
          created_at: '2024-01-01T00:00:00Z',
          project_id: 1,
          creator_id: 1
        }
      ])
      const mockVisibleAssigneeQuery = createAwaitableQuery([
        { task_id: 1 }
      ])
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') return mockVisibleAssigneeQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        user_id: '999' // Not in visible staff
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: expect.stringMatching(/Cannot view reports for this user|Access denied|Internal server error/)
      })
    })

    it('should calculate projected tasks correctly', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              title: 'Future Task',
              status: 'not-started',
              start_date: futureDate.toISOString().split('T')[0],
              due_date: null,
              completed_at: null,
              created_at: '2024-01-01T00:00:00Z',
              project_id: 1,
              creator_id: 1
            }
          ],
          error: null
        })
      }
      
      const mockVisibleAssigneeQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ task_id: 1 }],
          error: null
        })
      }
      
      const mockAssigneeQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }],
        error: null
      }
      
      const mockStaffListQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [{ id: 1, fullname: 'John Doe' }],
          error: null
        })
      }
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project' },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockStaffListQuery
        }
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 2) return mockVisibleAssigneeQuery
          return mockAssigneeQuery
        }
        if (table === 'projects') return mockProjectQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({})
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data.metrics.projectedTasks).toBeGreaterThanOrEqual(0)
    })

    it('should handle tasks fetch error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery(null, { message: 'Database error' })
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'tasks') return mockTasksQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({})
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: expect.stringMatching(/Failed to fetch tasks|Internal server error/)
      })
    })

    it('should handle visible assignee fetch error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery([
        {
          id: 1,
          title: 'Task 1',
          status: 'completed',
          start_date: '2024-01-01',
          due_date: '2024-01-31',
          completed_at: '2024-01-15',
          created_at: '2024-01-01T00:00:00Z',
          project_id: 1,
          creator_id: 1
        }
      ])
      
      const mockVisibleAssigneeQuery = createAwaitableQuery(null, { message: 'Database error' })
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 2) return mockVisibleAssigneeQuery
          // Return empty for any other calls
          return createAwaitableQuery([])
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({})
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: expect.stringMatching(/Failed to fetch visible assigned tasks|Internal server error/)
      })
    })

    it('should handle assignee error when filtering by user_id', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery([
        {
          id: 1,
          title: 'Task 1',
          status: 'completed',
          start_date: '2024-01-01',
          due_date: '2024-01-31',
          completed_at: '2024-01-15',
          created_at: '2024-01-01T00:00:00Z',
          project_id: 1,
          creator_id: 1
        }
      ])
      
      const mockVisibleAssigneeQuery = createAwaitableQuery([
        { task_id: 1 }
      ])
      
      const mockAssigneeQuery = createAwaitableQuery(null, { message: 'Failed to fetch assigned tasks' })
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 2) return mockVisibleAssigneeQuery
          return mockAssigneeQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        user_id: '1'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: expect.stringContaining('Failed to fetch assigned tasks')
      })
    })

    it('should handle catch block with non-createError errors', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getVisibleStaffIds } = await import('~/server/utils/departmentHierarchy')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      vi.mocked(getVisibleStaffIds).mockResolvedValue([1])
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      // Create a query that throws an error when awaited
      const createErrorQuery = () => {
        const error = new Error('Unexpected error')
        const query: any = {
          then: (onResolve: any, onReject: any) => {
            return Promise.reject(error).then(onResolve, onReject)
          },
          catch: (onReject: any) => Promise.reject(error).catch(onReject),
          finally: (onFinally: any) => Promise.reject(error).finally(onFinally)
        }
        query.select = vi.fn().mockReturnValue(query)
        query.is = vi.fn().mockReturnValue(query)
        query.gte = vi.fn().mockReturnValue(query)
        query.lt = vi.fn().mockReturnValue(query)
        query.eq = vi.fn().mockReturnValue(query)
        query.in = vi.fn().mockReturnValue(query)
        return query
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return createErrorQuery()
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({})
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Internal server error'
      })
    })
  })
})

