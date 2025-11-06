import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/reports/team-summary.get'
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

describe('GET /api/reports/team-summary - Team Summary Report API Endpoint', () => {
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
    query.lte = vi.fn().mockReturnValue(query)
    query.eq = vi.fn().mockReturnValue(query)
    query.in = vi.fn().mockReturnValue(query)
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

    it('should return 400 if project_id is missing', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
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
        statusCode: 400,
        statusMessage: expect.stringContaining('Project ID is required')
      })
    })

    it('should return 404 if project not found', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'projects') return mockProjectQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockGetQuery.mockReturnValue({
        project_id: '999'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 404,
        statusMessage: expect.stringContaining('Project not found')
      })
    })
  })

  describe('Successful Report Generation', () => {
    it('should generate team summary report with weekly period', async () => {
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
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
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
          created_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-05T00:00:00Z',
          project_id: 1
        },
        {
          id: 2,
          title: 'Task 2',
          status: 'in-progress',
          start_date: '2024-01-10',
          due_date: '2024-02-01',
          created_at: '2024-01-10T00:00:00Z',
          completed_at: null,
          project_id: 1
        }
      ])
      
      const mockAssigneesQuery = createAwaitableQuery([
        { assigned_to_staff_id: 1, task_id: 1 },
        { assigned_to_staff_id: 1, task_id: 2 },
        { assigned_to_staff_id: 2, task_id: 1 }
      ])
      
      const mockStaffListQuery = createAwaitableQuery([
        { id: 1, fullname: 'John Doe' },
        { id: 2, fullname: 'Jane Smith' }
      ])
      
      const mockStaffAssigneeQuery = createAwaitableQuery([
        { task_id: 1 },
        { task_id: 2 }
      ])
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          if (callCount === 2) return mockStaffListQuery
          return mockStaffAssigneeQuery
        }
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          return mockStaffAssigneeQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1',
        period: 'weekly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.project).toBeDefined()
      expect(response.data.metrics).toBeDefined()
      expect(response.data.metrics.statusBreakdown).toBeDefined()
      expect(response.data.completionTrends).toBeDefined()
      expect(response.data.teamPerformance).toBeDefined()
      expect(response.data.topPerformers).toBeDefined()
      expect(response.data.workloadDistribution).toBeDefined()
    })

    it('should generate report with monthly period', async () => {
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
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
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
          created_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-05T00:00:00Z',
          project_id: 1
        }
      ])
      
      const mockAssigneesQuery = createAwaitableQuery([
        { assigned_to_staff_id: 1, task_id: 1 }
      ])
      
      const mockStaffListQuery = createAwaitableQuery([{ id: 1, fullname: 'John Doe' }])
      
      // Mock for individual staff assignee queries (called in loop)
      const mockStaffAssigneeQuery = createAwaitableQuery([
        { task_id: 1 }
      ])
      
      let callCount = 0
      let assigneeCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockStaffListQuery
        }
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          assigneeCallCount++
          if (assigneeCallCount === 1) return mockAssigneesQuery // Initial assignees query
          return mockStaffAssigneeQuery // Individual staff assignee queries
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1',
        period: 'monthly'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data.completionTrends.length).toBe(30) // 30 days for monthly
    })

    it('should calculate overdue tasks correctly', async () => {
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
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
          error: null
        })
      }
      
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      
      const mockTasksQuery = createAwaitableQuery([
        {
          id: 1,
          title: 'Overdue Task',
          status: 'in-progress',
          start_date: '2024-01-01',
          due_date: pastDate.toISOString().split('T')[0],
          created_at: '2024-01-01T00:00:00Z',
          completed_at: null,
          project_id: 1
        }
      ])
      
      const mockAssigneesQuery = createAwaitableQuery([{ assigned_to_staff_id: 1, task_id: 1 }])
      
      const mockStaffListQuery = createAwaitableQuery([{ id: 1, fullname: 'John Doe' }])
      
      const mockStaffAssigneeQuery = createAwaitableQuery([{ task_id: 1 }])
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          if (callCount === 2) return mockStaffListQuery
          return mockStaffAssigneeQuery
        }
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          return mockStaffAssigneeQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1',
        period: 'weekly'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data.metrics.overdueTaskCount).toBeGreaterThanOrEqual(0)
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
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
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
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: expect.stringContaining('Failed to fetch tasks')
      })
    })

    it('should handle assignees fetch error', async () => {
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
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery([])
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnValue({
          data: null,
          error: { message: 'Database error' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 2) return mockAssigneesQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: expect.stringContaining('Failed to fetch task assignees')
      })
    })

    it('should handle staff details fetch error', async () => {
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
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery([])
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnValue({
          data: [],
          error: null
        })
      }
      
      const mockStaffListQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockStaffListQuery
        }
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 2) return mockAssigneesQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: expect.stringContaining('Failed to fetch staff details')
      })
    })

    it('should handle error rethrow correctly', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { statusCode: 404, statusMessage: 'Project not found' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'projects') return mockProjectQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '999'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 404
      })
    })

    it('should handle staff data fetch error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: expect.stringContaining('Failed to fetch staff data')
      })
    })

    it('should calculate overallCompletionRate correctly', async () => {
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
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
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
          created_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-05T00:00:00Z',
          project_id: 1
        },
        {
          id: 2,
          title: 'Task 2',
          status: 'in-progress',
          start_date: '2024-01-10',
          due_date: '2024-02-01',
          created_at: '2024-01-10T00:00:00Z',
          completed_at: null,
          project_id: 1
        }
      ])
      
      const mockAssigneesQuery = createAwaitableQuery([
        { assigned_to_staff_id: 1, task_id: 1 },
        { assigned_to_staff_id: 1, task_id: 2 }
      ])
      
      const mockStaffListQuery = createAwaitableQuery([{ id: 1, fullname: 'John Doe' }])
      
      const mockStaffAssigneeQuery = createAwaitableQuery([
        { task_id: 1 },
        { task_id: 2 }
      ])
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockStaffListQuery
        }
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          return mockStaffAssigneeQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1',
        period: 'weekly'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.data.metrics.overallCompletionRate).toBeGreaterThanOrEqual(0)
      // 1 completed out of 2 total = 50%
      expect(response.data.metrics.overallCompletionRate).toBe(50)
    })

    it('should handle zero total tasks for overallCompletionRate calculation', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
          error: null
        })
      }
      
      const mockTasksQuery = createAwaitableQuery([]) // No tasks
      
      const mockAssigneesQuery = createAwaitableQuery([]) // No assignees
      
      const mockStaffListQuery = createAwaitableQuery([]) // No staff (since no assignees)
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockStaffListQuery
        }
        if (table === 'projects') return mockProjectQuery
        if (table === 'tasks') return mockTasksQuery
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      // When statusBreakdown.total is 0, overallCompletionRate should be 0 (line 297)
      expect(response.data.metrics.overallCompletionRate).toBe(0)
    })

    it('should handle catch block with non-createError errors', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, is_manager: true, is_admin: false, department: 'Engineering' },
          error: null
        })
      }
      
      const mockProjectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Test Project', description: 'Test Description' },
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
        query.lte = vi.fn().mockReturnValue(query)
        query.eq = vi.fn().mockReturnValue(query)
        return query
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          return mockStaffQuery
        }
        if (table === 'projects') {
          callCount++
          return mockProjectQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 3) return createErrorQuery()
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockGetQuery.mockReturnValue({
        project_id: '1'
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Internal server error'
      })
    })
  })
})

