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
      const err = new Error(error.statusMessage || error.message || 'Error') as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage || error.message
      // Preserve data property if it exists
      if (error.data !== undefined) {
        err.data = error.data
      }
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

    it('should not include replicatedTask when replication returns no new task', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { replicateCompletedTask } = await import('~/server/utils/recurringTaskService')

      replicateCompletedTask.mockResolvedValueOnce({ success: false, error: 'replication failed' } as any)

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
            status: 'completed',
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
          return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          return mockAssigneesQuery
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        status: 'completed'
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const response = await handler(mockEvent as any)

      expect(response.success).toBe(true)
      expect(response.replicatedTask).toBeUndefined()
      expect(replicateCompletedTask).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to replicate task 1:'), expect.anything())

      consoleErrorSpy.mockRestore()
    })

    it('wraps unexpected errors in an internal server error response', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { replicateCompletedTask } = await import('~/server/utils/recurringTaskService')

      replicateCompletedTask.mockRejectedValueOnce(new Error('replication blew up'))

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
            status: 'completed',
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
          return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          callCount++
          if (callCount === 2) return mockTaskExistsQuery
          if (callCount === 4) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          return mockAssigneesQuery
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        status: 'completed'
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Internal server error'
      })
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

    it('should allow non-manager user assigned to subtask to edit parent task', async () => {
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
      
      // Parent task assigned to someone else
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
      
      // Subtask query - user is assigned to subtask
      const mockSubtasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: [{ id: 10 }], error: null }).then(resolve)
      }
      
      const mockSubtaskAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ 
          data: [{ assigned_to_staff_id: 1, task_id: 10 }], 
          error: null 
        }).then(resolve)
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
            status: 'not-started',
            repeat_interval: 0,
            project_id: 1
          },
          error: null
        })
      }
      
      let staffCallCount = 0
      let tasksCallCount = 0
      let assigneesCallCount = 0
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCallCount++
          if (staffCallCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          tasksCallCount++
          if (tasksCallCount === 1) return mockTaskExistsQuery
          if (tasksCallCount === 2) return mockSubtasksQuery // Subtask query
          if (tasksCallCount === 3) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery // Parent task assignees
          return mockSubtaskAssigneesQuery // Subtask assignees
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Updated Task'
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
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

    it('should handle legacy assignee_id format (single assignee)', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { logTaskAssignment } = await import('~/server/utils/activityLogger')
      const { createTaskAssignmentNotification, getTaskDetails } = await import('~/server/utils/notificationService')
      
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
        data: []
      }
      
      const mockAssigneeUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      
      const mockAssigneeUpsert = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      vi.mocked(getTaskDetails).mockResolvedValue({
        title: 'Test Task',
        projectName: 'Test Project'
      })
      
      let staffCallCount = 0
      let tasksCallCount = 0
      let assigneesCallCount = 0
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCallCount++
          if (staffCallCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          tasksCallCount++
          if (tasksCallCount === 1) return mockTaskExistsQuery
          if (tasksCallCount === 2) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery
          if (assigneesCallCount === 2) return mockCurrentAssigneesQuery
          if (assigneesCallCount === 3) return mockAssigneeUpdate
          return mockAssigneeUpsert
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        assignee_id: 2 // Legacy single assignee format
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(mockAssigneeUpsert.upsert).toHaveBeenCalled()
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

    it('should reject task with no assignees', async () => {
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
      
      // mockAssigneesQuery needs to support chaining .select().eq().eq()
      let assigneesEqCallCount = 0
      const mockAssigneesQuery: any = {}
      mockAssigneesQuery.select = vi.fn().mockReturnValue(mockAssigneesQuery)
      mockAssigneesQuery.eq = vi.fn().mockImplementation(() => {
        assigneesEqCallCount++
        if (assigneesEqCallCount === 1) {
          // First eq('task_id') returns this for chaining
          return mockAssigneesQuery
        }
        // Second eq('is_active') returns a promise
        return Promise.resolve({ data: [{ assigned_to_staff_id: 1 }], error: null })
      })
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null })
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
            notes: '',
            priority: 1,
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
      
      const mockAssigneeUpdate: any = {
        update: vi.fn(),
        eq: vi.fn(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      mockAssigneeUpdate.update.mockReturnValue(mockAssigneeUpdate)
      mockAssigneeUpdate.eq.mockReturnValue(mockAssigneeUpdate)
      
      let callCount = 0
      let assigneesCallCount = 0
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
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery
          if (assigneesCallCount === 2) {
            // Create a fresh mock for current assignees query (needs to chain .select().eq().eq())
            let eqCallCount = 0
            const freshMock: any = {}
            freshMock.select = vi.fn().mockReturnValue(freshMock)
            freshMock.eq = vi.fn().mockImplementation(() => {
              eqCallCount++
              if (eqCallCount === 1) {
                // First eq('task_id') returns the mock for chaining
                return freshMock
              }
              // Second eq('is_active') returns a promise
              return Promise.resolve({ data: [{ assigned_to_staff_id: 1 }], error: null })
            })
            return freshMock
          }
          // Third call is for deactivation (update)
          return mockAssigneeUpdate
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'Test Task', assignee_ids: [] })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'At least one assignee is required for the task'
      })
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

    it('should include due date changes in update logs and notifications', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { logTaskUpdate } = await import('~/server/utils/activityLogger')
      const { createTaskUpdateNotification } = await import('~/server/utils/notificationService')

      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'manager-1' } as any)
      mockGetRouterParam.mockReturnValue('42')

      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 7, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }

      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 42 },
          error: null
        })
      }

      const mockCurrentTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            title: 'Existing Title',
            start_date: '2024-01-05',
            due_date: '2024-01-20',
            status: 'in-progress',
            notes: 'Keep working',
            priority: 4,
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
            id: 42,
            title: 'Existing Title',
            due_date: '2024-02-01',
            status: 'in-progress',
            project_id: 3
          },
          error: null
        })
      }

      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 7 }]
      }

      const mockNotificationAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 7 }]
      }

      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 7 }],
        error: null
      }

      let staffCall = 0
      let taskCall = 0
      let assigneeCall = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCall++
          return staffCall === 1 ? mockStaffQuery : mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          taskCall++
          if (taskCall === 1) return mockTaskExistsQuery
          if (taskCall === 2) return mockCurrentTaskQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          assigneeCall++
          return assigneeCall === 1 ? mockAssigneesQuery : mockNotificationAssigneesQuery
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      mockReadBody.mockResolvedValue({
        end_date: '2024-02-01'
      })

      await handler(mockEvent as any)

      expect(logTaskUpdate).toHaveBeenCalledWith(
        mockSupabase,
        42,
        7,
        expect.arrayContaining([
          expect.objectContaining({ field: 'due_date', newValue: '2024-02-01' })
        ])
      )
      expect(createTaskUpdateNotification).toHaveBeenCalledWith(
        mockSupabase,
        42,
        7,
        7,
        'Test Task',
        expect.stringContaining('Due Date'),
        'Test Project'
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

    it('should handle assignee upsert error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null }) }
      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      const mockAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ id: 1 }], error: null }
      const mockCurrentTaskQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { title: 'T', start_date: '2024-01-01', due_date: '2024-01-31', status: 'not-started', notes: '', priority: 1, repeat_interval: 0, tags: [] }, error: null }) }
      const mockTaskUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, status: 'not-started', project_id: 1 }, error: null }) }
      const mockCurrentAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockAssigneeUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve) }
      const mockAssigneeUpsert = { upsert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Upsert failed' } }) }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') { callCount++; return callCount === 2 ? mockTaskExistsQuery : (callCount === 4 ? mockCurrentTaskQuery : mockTaskUpdate) }
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          if (callCount === 5) return mockCurrentAssigneesQuery
          if (callCount === 6) return mockAssigneeUpdate
          return mockAssigneeUpsert
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'T', assignee_ids: [2] })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({ 
        statusCode: 500, 
        statusMessage: expect.stringMatching(/Failed to update task assignees|Internal server error/)
      })
    })

    it('should handle current task fetch error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null }) }
      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      const mockAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ id: 1 }], error: null }
      const mockCurrentTaskQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } }) }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') { callCount++; return callCount === 2 ? mockTaskExistsQuery : mockCurrentTaskQuery }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'T' })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({ statusCode: 500, statusMessage: 'Failed to fetch current task data' })
    })

    it('should handle getTaskDetails returning null', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getTaskDetails } = await import('~/server/utils/notificationService')
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null }) }
      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      const mockAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ id: 1 }], error: null }
      const mockCurrentTaskQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { title: 'T', start_date: '2024-01-01', due_date: '2024-01-31', status: 'not-started', notes: '', priority: 1, repeat_interval: 0, tags: [] }, error: null }) }
      const mockTaskUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, status: 'not-started', project_id: 1 }, error: null }) }
      const mockCurrentAssigneesQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), data: [{ assigned_to_staff_id: 1 }] }
      const mockAssigneeUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve) }
      const mockAssigneeUpsert = { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) }

      vi.mocked(getTaskDetails).mockResolvedValue(null)
      const { logTaskAssignment } = await import('~/server/utils/activityLogger')
      vi.mocked(logTaskAssignment).mockResolvedValue(undefined)

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') { callCount++; return callCount === 2 ? mockTaskExistsQuery : (callCount === 4 ? mockCurrentTaskQuery : mockTaskUpdate) }
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 3) return mockAssigneesQuery
          if (callCount === 5) return mockCurrentAssigneesQuery
          if (callCount === 6) return mockAssigneeUpdate
          return mockAssigneeUpsert
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'T' }) // No assignee changes

      const response = await handler(mockEvent as any)
      expect(response.success).toBe(true)
      // Should not throw error even if getTaskDetails returns null
    })

    it('should handle assignee upsert error with console.error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null }) }
      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      
      // mockAssigneesQuery needs to support chaining .select().eq().eq()
      let assigneesEqCallCount1 = 0
      const mockAssigneesQuery: any = {}
      mockAssigneesQuery.select = vi.fn().mockReturnValue(mockAssigneesQuery)
      mockAssigneesQuery.eq = vi.fn().mockImplementation(() => {
        assigneesEqCallCount1++
        if (assigneesEqCallCount1 === 1) return mockAssigneesQuery
        return Promise.resolve({ data: [{ assigned_to_staff_id: 1 }], error: null })
      })
      
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }) }
      const mockCurrentTaskQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { title: 'T', start_date: '2024-01-01', due_date: '2024-01-31', status: 'not-started', notes: '', priority: 1, repeat_interval: 0, tags: [] }, error: null }) }
      const mockTaskUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, status: 'not-started', project_id: 1 }, error: null }) }
      
      // mockCurrentAssigneesQuery needs to support chaining .select().eq().eq()
      let assigneesEqCallCount2 = 0
      const mockCurrentAssigneesQuery: any = {}
      mockCurrentAssigneesQuery.select = vi.fn().mockReturnValue(mockCurrentAssigneesQuery)
      mockCurrentAssigneesQuery.eq = vi.fn().mockImplementation(() => {
        assigneesEqCallCount2++
        if (assigneesEqCallCount2 === 1) return mockCurrentAssigneesQuery
        return Promise.resolve({ data: [{ assigned_to_staff_id: 1 }], error: null })
      })
      
      const mockAssigneeUpdate: any = {
        update: vi.fn(),
        eq: vi.fn(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      mockAssigneeUpdate.update.mockReturnValue(mockAssigneeUpdate)
      mockAssigneeUpdate.eq.mockReturnValue(mockAssigneeUpdate)
      
      const mockAssigneeUpsert = { upsert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Upsert failed' } }) }

      let callCount = 0
      let assigneesCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') { callCount++; return callCount === 2 ? mockTaskExistsQuery : (callCount === 4 ? mockCurrentTaskQuery : mockTaskUpdate) }
        if (table === 'task_assignees') {
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery
          if (assigneesCallCount === 2) return mockCurrentAssigneesQuery
          if (assigneesCallCount === 3) return mockAssigneeUpdate
          return mockAssigneeUpsert
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'T', assignee_ids: [2] })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(handler(mockEvent as any)).rejects.toMatchObject({ 
        statusCode: 500, 
        statusMessage: 'Failed to update task assignees'
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update assignees:', expect.any(Object))
      consoleSpy.mockRestore()
    })

    it('should handle removed assignees with notifications', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { getTaskDetails, createTaskUnassignmentNotification } = await import('~/server/utils/notificationService')
      const { logTaskUnassignment } = await import('~/server/utils/activityLogger')
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      const mockStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, department: 'Engineering', is_manager: true, is_admin: false }, error: null }) }
      const mockTaskExistsQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }) }
      
      // mockAssigneesQuery needs to support chaining .select().eq().eq()
      let assigneesEqCallCount1 = 0
      const mockAssigneesQuery: any = {}
      mockAssigneesQuery.select = vi.fn().mockReturnValue(mockAssigneesQuery)
      mockAssigneesQuery.eq = vi.fn().mockImplementation(() => {
        assigneesEqCallCount1++
        if (assigneesEqCallCount1 === 1) return mockAssigneesQuery
        return Promise.resolve({ data: [{ assigned_to_staff_id: 1 }, { assigned_to_staff_id: 2 }], error: null })
      })
      
      const mockDepartmentStaffQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }) }
      const mockCurrentTaskQuery = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { title: 'T', start_date: '2024-01-01', due_date: '2024-01-31', status: 'not-started', notes: '', priority: 1, repeat_interval: 0, tags: [] }, error: null }) }
      const mockTaskUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 1, status: 'not-started', project_id: 1 }, error: null }) }
      
      // mockCurrentAssigneesQuery needs to support chaining .select().eq().eq()
      let assigneesEqCallCount2 = 0
      const mockCurrentAssigneesQuery: any = {}
      mockCurrentAssigneesQuery.select = vi.fn().mockReturnValue(mockCurrentAssigneesQuery)
      mockCurrentAssigneesQuery.eq = vi.fn().mockImplementation(() => {
        assigneesEqCallCount2++
        if (assigneesEqCallCount2 === 1) return mockCurrentAssigneesQuery
        return Promise.resolve({ data: [{ assigned_to_staff_id: 1 }, { assigned_to_staff_id: 2 }], error: null })
      })
      
      const mockAssigneeUpdate: any = {
        update: vi.fn(),
        eq: vi.fn(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      mockAssigneeUpdate.update.mockReturnValue(mockAssigneeUpdate)
      mockAssigneeUpdate.eq.mockReturnValue(mockAssigneeUpdate)
      
      const mockAssigneeUpsert = { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) }

      vi.mocked(getTaskDetails).mockResolvedValue({ title: 'Test Task', projectName: 'Test Project' })
      vi.mocked(logTaskUnassignment).mockResolvedValue(undefined)
      vi.mocked(createTaskUnassignmentNotification).mockResolvedValue(undefined)

      let callCount = 0
      let assigneesCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') { callCount++; return callCount === 1 ? mockStaffQuery : mockDepartmentStaffQuery }
        if (table === 'tasks') { callCount++; return callCount === 2 ? mockTaskExistsQuery : (callCount === 4 ? mockCurrentTaskQuery : mockTaskUpdate) }
        if (table === 'task_assignees') {
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery
          if (assigneesCallCount === 2) return mockCurrentAssigneesQuery
          if (assigneesCallCount === 3) return mockAssigneeUpdate
          return mockAssigneeUpsert
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      mockReadBody.mockResolvedValue({ task_name: 'T', assignee_ids: [1] }) // Removing assignee 2

      const response = await handler(mockEvent as any)
      expect(response.success).toBe(true)
      expect(logTaskUnassignment).toHaveBeenCalledWith(expect.any(Object), 1, 1, 2)
      expect(createTaskUnassignmentNotification).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        2,
        1,
        'Test Task',
        'Test Project'
      )
    })
  })

  describe('Subtask Handling', () => {
    it('should create new subtask with assignees', async () => {
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
      
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 2,
            title: 'New Subtask',
            parent_task_id: 1,
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockSubtaskAssigneeUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      
      const mockSubtaskAssigneeUpsert = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let staffCallCount = 0
      let tasksCallCount = 0
      let assigneesCallCount = 0
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCallCount++
          if (staffCallCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          tasksCallCount++
          if (tasksCallCount === 1) return mockTaskExistsQuery
          if (tasksCallCount === 2) return mockCurrentTaskQuery
          if (tasksCallCount === 3) return mockTaskUpdate
          return mockSubtaskInsert
        }
        if (table === 'task_assignees') {
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery
          if (assigneesCallCount === 2) return mockSubtaskAssigneeUpdate
          return mockSubtaskAssigneeUpsert
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        subtasks: [
          {
            title: 'New Subtask',
            start_date: '2024-02-01',
            status: 'not-started',
            priority: 3,
            repeat_interval: 0,
            tags: [],
            assignee_ids: [1, 2]
          }
        ]
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
    })

    it('should update existing subtask', async () => {
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
      
      const mockSubtaskFetch = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 2,
            parent_task_id: 1
          },
          error: null
        })
      }
      
      const mockSubtaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      
      const mockSubtaskAssigneeUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      
      const mockSubtaskAssigneeUpsert = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let staffCallCount = 0
      let tasksCallCount = 0
      let assigneesCallCount = 0
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCallCount++
          if (staffCallCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          tasksCallCount++
          if (tasksCallCount === 1) return mockTaskExistsQuery
          if (tasksCallCount === 2) return mockCurrentTaskQuery
          if (tasksCallCount === 3) return mockTaskUpdate
          if (tasksCallCount === 4) return mockSubtaskFetch
          return mockSubtaskUpdate
        }
        if (table === 'task_assignees') {
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery
          if (assigneesCallCount === 2) return mockSubtaskAssigneeUpdate
          return mockSubtaskAssigneeUpsert
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        subtasks: [
          {
            id: 2,
            title: 'Updated Subtask',
            start_date: '2024-02-01',
            status: 'in-progress',
            priority: 5,
            repeat_interval: 0,
            tags: [],
            assignee_ids: [1]
          }
        ]
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
    })

    it('should reject subtask with no assignees', async () => {
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
      
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 2,
            title: 'Subtask',
            parent_task_id: 1
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
          if (callCount === 5) return mockTaskUpdate
          if (callCount === 6) return mockSubtaskInsert
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        subtasks: [
          {
            title: 'Subtask',
            start_date: '2024-02-01',
            status: 'not-started',
            priority: 3,
            repeat_interval: 0,
            tags: [],
            assignee_ids: [] // Empty assignees
          }
        ]
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: expect.stringContaining('at least one assignee required')
      })
    })

    it('should reject subtask with more than 5 assignees', async () => {
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
      
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 2,
            title: 'Subtask',
            parent_task_id: 1
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
          if (callCount === 5) return mockTaskUpdate
          if (callCount === 6) return mockSubtaskInsert
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        subtasks: [
          {
            title: 'Subtask',
            start_date: '2024-02-01',
            status: 'not-started',
            priority: 3,
            repeat_interval: 0,
            tags: [],
            assignee_ids: [1, 2, 3, 4, 5, 6] // 6 assignees
          }
        ]
      })
      
      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: expect.stringContaining('Maximum 5 assignees allowed per subtask')
      })
    })

    it('should handle subtask with repeat_interval calculation', async () => {
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
      
      let capturedSubtaskPayload: any = null
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
      
      const mockSubtaskInsert = {
        insert: vi.fn((payload: any) => {
          capturedSubtaskPayload = payload
          return mockSubtaskInsert
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 2,
            title: 'Subtask',
            parent_task_id: 1,
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockSubtaskAssigneeUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
      }
      
      const mockSubtaskAssigneeUpsert = {
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      let staffCallCount = 0
      let tasksCallCount = 0
      let assigneesCallCount = 0
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCallCount++
          if (staffCallCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          tasksCallCount++
          if (tasksCallCount === 1) return mockTaskExistsQuery
          if (tasksCallCount === 2) return mockCurrentTaskQuery
          if (tasksCallCount === 3) return mockTaskUpdate
          return mockSubtaskInsert
        }
        if (table === 'task_assignees') {
          assigneesCallCount++
          if (assigneesCallCount === 1) return mockAssigneesQuery
          if (assigneesCallCount === 2) return mockSubtaskAssigneeUpdate
          return mockSubtaskAssigneeUpsert
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        task_name: 'Test Task',
        subtasks: [
          {
            title: 'Subtask',
            start_date: '2024-01-02',
            status: 'not-started',
            priority: 3,
            repeat_interval: 7, // 7 days
            tags: [],
            assignee_ids: [1]
          }
        ]
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedSubtaskPayload.due_date).toBe('2024-01-09') // 7 days after start_date
    })
  })
})
