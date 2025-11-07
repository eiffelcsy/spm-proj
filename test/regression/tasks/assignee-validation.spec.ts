import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/tasks/index.post'
import type { H3Event } from 'h3'

/**
 * REGRESSION TEST SUITE: Assignee Validation Bugs
 * 
 * These tests verify that previously fixed assignee validation bugs remain fixed.
 * The validation ensures tasks have between 1 and 5 assignees.
 */

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

vi.mock('~/server/utils/activityLogger', () => ({
  logTaskCreation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/server/utils/notificationService', () => ({
  createTaskAssignmentNotification: vi.fn().mockResolvedValue(undefined),
  getTaskDetails: vi.fn().mockResolvedValue({
    title: 'Test Task',
    projectName: 'Test Project'
  }),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    defineEventHandler: (fn: any) => fn,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('REGRESSION: Assignee Validation', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { readBody } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    
    mockEvent = {
      node: { req: {}, res: {} }
    } as any
    
    mockSupabase = {
      from: vi.fn()
    }
  })

  describe('Bug Fix: Tasks Created with Zero Assignees', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: Tasks could be created with zero assignees, causing issues in
     *      task assignment workflows and notifications.
     * 
     * Fixed: Added validation to require at least one assignee before task creation.
     * 
     * Impact: High - Business logic violation
     */
    it('should reject task creation with zero assignees', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          return {
            ...mockTaskInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'task_assignees') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'not-started',
        priority: '5',
        repeat_interval: '0',
        notes: 'Test notes',
        tags: [],
        project_id: 1,
        assignee_ids: [], // Zero assignees
        subtasks: []
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('At least one assignee is required for the task')
      }
    })

    it('should reject task creation with empty array assignee_ids', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          return {
            ...mockTaskInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'task_assignees') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        assignee_ids: [] // Explicitly empty array
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('At least one assignee is required for the task')
      }
    })
  })

  describe('Bug Fix: Tasks Created with More Than 5 Assignees', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: Tasks could be created with more than 5 assignees, causing performance
     *      issues and notification spam.
     * 
     * Fixed: Added validation to enforce maximum of 5 assignees per task.
     * 
     * Impact: Medium - Performance and UX issue
     */
    it('should reject task creation with more than 5 assignees', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          return {
            ...mockTaskInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'task_assignees') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        assignee_ids: [1, 2, 3, 4, 5, 6], // 6 assignees - exceeds limit
        subtasks: []
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('Maximum 5 assignees allowed per task')
      }
    })

    it('should accept task creation with exactly 5 assignees', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') return mockTaskInsert
        if (table === 'task_assignees') return mockAssigneeInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'not-started',
        priority: '5',
        repeat_interval: '0',
        notes: 'Test notes',
        tags: [],
        project_id: 1,
        assignee_ids: [1, 2, 3, 4, 5], // Exactly 5 assignees - should pass
        subtasks: []
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.task).toBeDefined()
    })
  })

  describe('Bug Fix: Subtasks Bypassing Assignee Validation', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: Subtasks could be created without assignees or with more than 5 assignees,
     *      bypassing the same validation rules as parent tasks.
     * 
     * Fixed: Added validation for subtask assignees before subtask creation.
     * 
     * Impact: High - Business logic violation
     */
    it('should reject subtask with zero assignees', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Parent Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          return {
            ...mockTaskInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'task_assignees') {
          return {
            ...mockAssigneeInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Parent Task',
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            assignee_ids: [] // No assignees - should fail
          }
        ]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('Subtask 1: At least one assignee is required')
      }
    })

    it('should reject subtask with more than 5 assignees', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Parent Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          return {
            ...mockTaskInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'task_assignees') {
          return {
            ...mockAssigneeInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Parent Task',
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            assignee_ids: [1, 2, 3, 4, 5, 6] // 6 assignees - exceeds limit
          }
        ]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('Subtask 1: Maximum 5 assignees allowed')
      }
    })
  })

  describe('Bug Fix: Non-Array assignee_ids Causing Crashes', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: When assignee_ids was not an array (e.g., string, null, object),
     *      the code would crash instead of handling gracefully.
     * 
     * Fixed: Added Array.isArray() check and default to empty array.
     * 
     * Impact: Medium - Application stability
     */
    it('should handle non-array assignee_ids for parent task', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          return {
            ...mockTaskInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'task_assignees') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        assignee_ids: 'not-an-array' // Not an array
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        // Should handle gracefully and reject with validation error
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('At least one assignee is required for the task')
      }
    })

    it('should handle non-array assignee_ids for subtask', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Parent Task',
            creator_id: 1
          },
          error: null
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          return {
            ...mockTaskInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'task_assignees') {
          return {
            ...mockAssigneeInsert,
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Parent Task',
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            assignee_ids: null // Not an array
          }
        ]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        // Should handle gracefully and reject with validation error
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('Subtask 1: At least one assignee is required')
      }
    })
  })
})

