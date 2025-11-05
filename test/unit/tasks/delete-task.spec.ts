import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/tasks/[id]/index.delete'
import type { H3Event } from 'h3'

// Mock the Supabase server functions
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

// Mock the utility functions
vi.mock('~/server/utils/activityLogger', () => ({
  logTaskDeletion: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/server/utils/notificationService', () => ({
  createTaskDeletionNotification: vi.fn().mockResolvedValue(undefined),
  getTaskDetails: vi.fn().mockResolvedValue({
    title: 'Test Task',
    projectName: 'Test Project'
  }),
}))

// Mock h3 functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
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

describe('DELETE /api/tasks/[id] - Delete Task API Endpoint', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockGetRouterParam: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { getRouterParam } = await import('h3')
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

  describe('Successful Task Deletion', () => {
    it('should soft delete task successfully', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      // Mock staff lookup with manager status
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
          data: { id: 1, deleted_at: null },
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
        data: [{ id: 1 }, { id: 2 }],
        error: null
      }
      
      // Mock subtasks query
      const mockSubtasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [],
        error: null
      }
      
      // Mock task update (soft delete)
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{
            id: 1,
            title: 'Test Task',
            deleted_at: new Date().toISOString()
          }],
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
          if (callCount === 4) return mockSubtasksQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.message).toBe('Task soft deleted successfully')
      expect(response.deletedTask).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
    })

    it('should cascade soft delete descendant subtasks before deleting task', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'manager-1' } as any)
      mockGetRouterParam.mockReturnValue('10')

      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 5, department: 'Engineering', is_manager: true, is_admin: false },
          error: null
        })
      }

      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 10, deleted_at: null },
          error: null
        })
      }

      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 5 }]
      }

      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 5 }, { id: 6 }],
        error: null
      }

      const createSubtaskQuery = (children: Array<{ id: number }>) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: children,
        error: null
      })

      const subtaskQueries = [
        createSubtaskQuery([{ id: 11 }, { id: 12 }]),
        createSubtaskQuery([{ id: 13 }]),
        createSubtaskQuery([]),
        createSubtaskQuery([])
      ]

      const cascadeUpdate = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null })
      }

      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 10, title: 'Parent Task', deleted_at: new Date().toISOString() }],
          error: null
        })
      }

      let staffCall = 0
      let taskCall = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          staffCall++
          return staffCall === 1 ? mockStaffQuery : mockDepartmentStaffQuery
        }
        if (table === 'tasks') {
          taskCall++
          if (taskCall === 1) return mockTaskExistsQuery
          if (taskCall >= 2 && taskCall <= 5) {
            return subtaskQueries[taskCall - 2]
          }
          if (taskCall === 6) {
            return cascadeUpdate
          }
          return mockTaskUpdate
        }
        if (table === 'task_assignees') {
          return mockAssigneesQuery
        }
        return {}
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      const response = await handler(mockEvent as any)

      expect(response.success).toBe(true)
      expect(cascadeUpdate.update).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String) }))
      expect(cascadeUpdate.in).toHaveBeenCalledWith('id', [11, 12, 13])
    })

  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      mockGetRouterParam.mockReturnValue('1')
      
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
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Task ID is required')
      }
    })

    it('should return 400 if task ID is invalid', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('invalid')
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Invalid task ID format')
      }
    })

    it('should return 403 if user has no department', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, department: null, is_manager: true, is_admin: false },
          error: null
        })
      }
      
      const mockTaskExistsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, deleted_at: null },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 2 }]
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
        }
        if (table === 'tasks') return mockTaskExistsQuery
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toContain('You do not have permission')
      }
    })

    it('should return 403 if user is not a manager', async () => {
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
          data: { id: 1, deleted_at: null },
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
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') return mockTaskExistsQuery
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toBe('Only managers can delete tasks')
      }
    })

    it('should return 403 if task is not visible to user department', async () => {
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
          data: { id: 1, deleted_at: null },
          error: null
        })
      }
      
      // Task assigned to someone from a different department
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 99 }]
      }
      
      // Department staff doesn't include assignee
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }, { id: 2 }],
        error: null
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') {
          callCount++
          if (callCount === 1) return mockStaffQuery
          return mockDepartmentStaffQuery
        }
        if (table === 'tasks') return mockTaskExistsQuery
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toContain('You do not have permission')
      }
    })
  })

  describe('Task Not Found', () => {
    it('should return 404 if task does not exist', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('999')
      
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
          data: null,
          error: { code: 'PGRST116' }
        })
      }
      
      const mockDeletedTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          callCount++
          if (callCount === 1) return mockTaskExistsQuery
          return mockDeletedTaskQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.statusMessage).toBe('Task not found')
      }
    })

    it('should return 404 if task is already soft deleted', async () => {
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
          data: null,
          error: { code: 'PGRST116' }
        })
      }
      
      const mockDeletedTaskQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, deleted_at: '2024-01-01T00:00:00Z' }
        })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          callCount++
          if (callCount === 1) return mockTaskExistsQuery
          return mockDeletedTaskQuery
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.statusMessage).toBe('Task not found')
      }
    })
  })

  describe('Activity Logging and Notifications', () => {
    it('should log task deletion activity', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { logTaskDeletion } = await import('~/server/utils/activityLogger')
      
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
          data: { id: 1, deleted_at: null },
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
      
      const mockSubtasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [],
        error: null
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, title: 'Test Task', deleted_at: new Date().toISOString() }],
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
          if (callCount === 4) return mockSubtasksQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      await handler(mockEvent as any)
      
      expect(logTaskDeletion).toHaveBeenCalledWith(mockSupabase, 1, 1)
    })

    it('should create notifications for task deletion', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { createTaskDeletionNotification } = await import('~/server/utils/notificationService')
      
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
          data: { id: 1, deleted_at: null },
          error: null
        })
      }
      
      const mockAssigneesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ assigned_to_staff_id: 2 }, { assigned_to_staff_id: 3 }]
      }
      
      const mockDepartmentStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
        error: null
      }
      
      const mockSubtasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [],
        error: null
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 1, title: 'Test Task', deleted_at: new Date().toISOString() }],
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
          if (callCount === 4) return mockSubtasksQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      await handler(mockEvent as any)
      
      expect(createTaskDeletionNotification).toHaveBeenCalledTimes(2)
      expect(createTaskDeletionNotification).toHaveBeenCalledWith(
        mockSupabase,
        1,
        2,
        1,
        'Test Task',
        'Test Project'
      )
      expect(createTaskDeletionNotification).toHaveBeenCalledWith(
        mockSupabase,
        1,
        3,
        1,
        'Test Task',
        'Test Project'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors during staff lookup', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Failed to fetch staff ID')
      }
    })

    it('should handle database errors during task deletion', async () => {
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
          data: { id: 1, deleted_at: null },
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
      
      const mockSubtasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        data: [],
        error: null
      }
      
      const mockTaskUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to delete task' }
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
          if (callCount === 4) return mockSubtasksQuery
          return mockTaskUpdate
        }
        if (table === 'task_assignees') return mockAssigneesQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Failed to soft delete task')
      }
    })

    it('wraps unexpected exceptions in an internal server error', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      mockGetRouterParam.mockReturnValue('1')

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected failure')
      })

      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Internal server error'
      })
    })
  })
})
