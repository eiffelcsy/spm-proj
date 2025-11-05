import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/tasks/[id]/index.put'
import type { H3Event } from 'h3'

// Mock the Supabase server functions
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

// Mock the utility functions
vi.mock('~/server/utils/activityLogger', () => ({
  logTaskUpdate: vi.fn().mockResolvedValue(undefined),
  logTaskAssignment: vi.fn().mockResolvedValue(undefined),
  logTaskCompletion: vi.fn().mockResolvedValue(undefined),
  logTaskUnassignment: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/server/utils/notificationService', () => ({
  createTaskAssignmentNotification: vi.fn().mockResolvedValue(undefined),
  createTaskUnassignmentNotification: vi.fn().mockResolvedValue(undefined),
  createTaskUpdateNotification: vi.fn().mockResolvedValue(undefined),
  getTaskDetails: vi.fn().mockResolvedValue({
    title: 'Test Task',
    projectName: 'Test Project'
  }),
}))

vi.mock('~/server/utils/recurringTaskService', () => ({
  replicateCompletedTask: vi.fn().mockResolvedValue({
    success: true,
    newTask: {
      id: 2,
      title: 'Test Task',
      due_date: '2024-02-07',
      start_date: '2024-02-01'
    }
  }),
}))

// Mock h3 functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    getRouterParam: vi.fn(),
    defineEventHandler: (fn: any) => fn,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('PUT /api/tasks/[id] - Update Task API Endpoint', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: any
  let mockGetRouterParam: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { readBody, getRouterParam } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    mockGetRouterParam = vi.mocked(getRouterParam)
    
    // Setup mock event
    mockEvent = {
      node: { req: {}, res: {} }
    } as any
    
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn()
    }
  })

  describe('Successful Task Update', () => {
    it('should update task successfully', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      // Mock staff lookup
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }
      
      // Mock task existence check
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      // Mock task assignees check
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }
      
      // Mock department staff
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }],
        error: null
      }
      
      // Mock current task data
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Old Title',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            notes: 'Old notes',
            priority: 5,
            repeat_interval: 0,
            tags: ['old']
          },
          error: null
        })
      }
      
      // Mock task update
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Updated Task',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'in-progress',
            notes: 'Updated notes',
            priority: 7,
            repeat_interval: 0,
            tags: ['updated'],
            project_id: 1
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Updated Task',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'in-progress',
        priority: '7',
        repeat_interval: '0',
        notes: 'Updated notes',
        tags: ['updated']
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.task).toBeDefined()
      expect(response.task.title).toBe('Updated Task')
      expect(response.task.status).toBe('in-progress')
      expect(response.task.priority).toBe(7)
    })

    it('should calculate due_date from start_date and repeat_interval', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }],
        error: null
      }
      
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Test Task',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            notes: 'Test notes',
            priority: 5,
            repeat_interval: 0,
            tags: []
          },
          error: null
        })
      }
      
      let capturedUpdateData: any = null
      const mockTaskUpdate = {
        update: vi.fn((data: any) => {
          capturedUpdateData = data
          return mockTaskUpdate
        }),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            ...capturedUpdateData,
            repeat_interval: 7,
            project_id: 1
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        start_date: '2024-01-01',
        repeat_interval: 7 // 7 days
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedUpdateData.due_date).toBe('2024-01-08') // 7 days after start_date
    })

    it('should trigger recurring task replication when completed', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { replicateCompletedTask } = await import('~/server/utils/recurringTaskService')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }],
        error: null
      }
      
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Test Task',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started', // Was not completed
            notes: 'Test notes',
            priority: 5,
            repeat_interval: 7,
            tags: []
          },
          error: null
        })
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
        id: 1,
            title: 'Test Task',
            status: 'completed', // Now completed
            repeat_interval: 7,
            project_id: 1
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        status: 'completed'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(replicateCompletedTask).toHaveBeenCalled()
      expect(response.replicatedTask).toBeDefined()
      expect(response.replicatedTask.id).toBe(2)
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      mockGetRouterParam.mockReturnValue('1')
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(401)
        expect(error.statusMessage).toContain('Unauthorized')
      }
    })

    it('should return 400 if task ID is missing', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue(null)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Task ID is required')
      }
    })

    it('should return 400 if request body is missing', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      mockReadBody.mockResolvedValue(null)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Request body is required')
      }
    })

    it('should return 403 if user has no permission to edit task', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: false, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      // User is not assigned to task
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 99 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }, { id: 99 }],
        error: null
      }
      
      // No subtasks
      const mockSubtasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [],
        error: null
      }
      
      const mockSubAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: []
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          return mockSubtasksQuery
        }
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          return mockSubAssigneesQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task'
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toContain('You do not have permission to edit this task')
      }
    })

    it('should allow managers to edit any task in their department', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      // Task assigned to someone else in the department
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 2 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }, { id: 2 }],
        error: null
      }
      
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Test Task',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            notes: 'Test notes',
            priority: 5,
            repeat_interval: 0,
            tags: []
          },
          error: null
        })
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Updated Task',
            status: 'in-progress',
            repeat_interval: 0,
            project_id: 1
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Updated Task',
        status: 'in-progress'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.task.title).toBe('Updated Task')
    })

    it('should return 500 when fetching department staff fails', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }

      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }

      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }

      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ data: null, error: { message: 'Department fetch failed' } })
      }

      let staffCall = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCall++
          if (staffCall === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') return mockTaskExistsQuery
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      mockReadBody.mockResolvedValue({
        task_name: 'Updated Task'
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Failed to fetch department staff'
      })
    })

    it('should return 403 when user has no department', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: null, is_manager: false, is_admin: false },
          error: null
        })
      }

      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }

      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') return mockTaskExistsQuery
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      mockReadBody.mockResolvedValue({
        task_name: 'Test Task'
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: 'You do not have permission to view or edit this task'
      })
    })
  })

  describe('Validation', () => {
    it('should reject invalid priority value', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }],
        error: null
      }
      
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Test Task',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            notes: 'Test notes',
            priority: 5,
            repeat_interval: 0,
            tags: []
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          return mockCurrentTaskQuery
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        priority: 11 // Invalid: must be 1-10
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('Invalid priority')
      }
    })

    it('should reject more than 5 assignees', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }],
        error: null
      }
      
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Test Task',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            notes: 'Test notes',
            priority: 5,
            repeat_interval: 0,
            tags: []
          },
          error: null
        })
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            status: 'not-started',
            repeat_interval: 0,
            project_id: 1
          },
          error: null
        })
      }
      
      const mockCurrentAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          return mockCurrentAssigneesQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        assignee_ids: [1, 2, 3, 4, 5, 6] // 6 assignees (exceeds limit)
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Maximum 5 assignees allowed per task')
      }
    })

    it('should reject removing assignees by non-manager', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: false, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }, { assigned_to_staff_id: 2 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }, { id: 2 }],
        error: null
      }
      
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Test Task',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            notes: 'Test notes',
            priority: 5,
            repeat_interval: 0,
            tags: []
          },
          error: null
        })
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
        id: 1,
            title: 'Test Task',
        status: 'not-started',
        repeat_interval: 0,
            project_id: 1
          },
          error: null
        })
      }
      
      const mockCurrentAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }, { assigned_to_staff_id: 2 }]
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          return mockCurrentAssigneesQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        assignee_ids: [1] // Removing assignee 2
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toContain('Only managers can unassign assignees')
      }
    })

    it('should reject invalid subtask priority', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }

      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
      }

      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }

      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }],
        error: null
      }

      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Test Task', start_date: '2024-01-01', due_date: '2024-01-31',
            status: 'not-started', notes: 'Test notes', priority: 5, repeat_interval: 0, tags: []
          },
          error: null
        })
      }

      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 1, status: 'not-started', project_id: 1 }, error: null })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        subtasks: [{ title: 'Sub A', start_date: '2024-02-01', priority: 99, status: 'not-started', repeat_interval: 0, tags: [] }]
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: expect.stringContaining('Invalid subtask priority')
      })
    })

    it('should return 400 when subtask id not found during update', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null })
      }

      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      const mockAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ id: 1 }], error: null }
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { title: 'T', start_date: '2024-01-01', due_date: '2024-01-31', status: 'not-started', notes: '', priority: 1, repeat_interval: 0, tags: [] }, error: null })
      }

      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 1, status: 'not-started', project_id: 1 }, error: null })
      }

      const mockFetchSubNotFound = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }) }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          if (callCount === 5) return mockTaskUpdate
          return mockFetchSubNotFound
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        subtasks: [{ id: 999, title: 'Sub A', start_date: '2024-02-01', priority: 3, status: 'not-started', repeat_interval: 0, tags: [] }]
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: expect.stringContaining('Subtask id 999 not found')
      })
    })
  })

  describe('Activity Logging and Notifications', () => {
    it('should log task updates', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { logTaskUpdate } = await import('~/server/utils/activityLogger')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 1 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }],
        error: null
      }
      
      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Old Title',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            notes: 'Old notes',
            priority: 5,
            repeat_interval: 0,
            tags: []
          },
          error: null
        })
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'New Title',
            status: 'in-progress',
            repeat_interval: 0,
            project_id: 1
          },
          error: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'New Title',
        status: 'in-progress'
      })
      
      await handler(mockEvent as any)
      
      expect(logTaskUpdate).toHaveBeenCalledWith(
        mockSupabase,
        1,
        1,
        expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
          expect.objectContaining({ field: 'status' })
        ])
      )
    })
  })

  describe('Update DB error paths', () => {
    it('returns 404 when update returns PGRST116', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null }) }
      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      const mockAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ id: 1 }], error: null }
      const mockCurrentTaskQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { title: 'T', start_date: '2024-01-01', due_date: '2024-01-31', status: 'not-started', notes: '', priority: 1, repeat_interval: 0, tags: [] }, error: null }) }

      const updateErr = { code: 'PGRST116' }
      const mockTaskUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: updateErr }) }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') { callCount++; return callCount === 2 ? mockTaskExistsQuery : (callCount === 4 ? mockCurrentTaskQuery : mockTaskUpdate) }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'T' })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Task not found' })
    })

    it('returns 500 when update returns generic error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null }) }
      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      const mockAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ id: 1 }], error: null }
      const mockCurrentTaskQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { title: 'T', start_date: '2024-01-01', due_date: '2024-01-31', status: 'not-started', notes: '', priority: 1, repeat_interval: 0, tags: [] }, error: null }) }

      const mockTaskUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }) }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') { callCount++; return callCount === 2 ? mockTaskExistsQuery : (callCount === 4 ? mockCurrentTaskQuery : mockTaskUpdate) }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'T' })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({ statusCode: 500, statusMessage: 'Failed to update task' })
    })
  })
})
