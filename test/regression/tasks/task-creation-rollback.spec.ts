import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/tasks/index.post'
import type { H3Event } from 'h3'

/**
 * REGRESSION TEST SUITE: Task Creation Rollback Scenarios
 * 
 * These tests verify that previously fixed rollback bugs remain fixed.
 * The rollback mechanism ensures data consistency when task creation fails.
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

describe('REGRESSION: Task Creation Rollback', () => {
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

  describe('Bug Fix: Orphaned Task on Assignee Insert Failure', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: When assignee insert failed after task creation, the parent task
     *      was not rolled back, leaving orphaned tasks in the database.
     * 
     * Fixed: Added rollbackParent() function that deletes task and assignees
     *       when assignee insert fails.
     * 
     * Impact: High - Data integrity issue
     */
    it('should rollback parent task when assignee insert fails', async () => {
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
      
      // Assignee insert fails
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Failed to insert assignees' }
        })
      }
      
      // Rollback operations
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockAssigneeDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          callCount++
          if (callCount === 1) return mockTaskInsert
          return mockTaskDelete
        }
        if (table === 'task_assignees') {
          callCount++
          if (callCount === 2) return mockAssigneeInsert
          return mockAssigneeDelete
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
        assignee_ids: [2],
        subtasks: []
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        // Verify rollback was called
        expect(mockTaskDelete.delete).toHaveBeenCalled()
        expect(mockTaskDelete.eq).toHaveBeenCalledWith('id', 1)
        expect(mockAssigneeDelete.delete).toHaveBeenCalled()
        expect(mockAssigneeDelete.eq).toHaveBeenCalledWith('task_id', 1)
      }
    })
  })

  describe('Bug Fix: Orphaned Parent Task on Subtask Insert Failure', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: When subtask insert failed, the parent task was not rolled back,
     *      leaving orphaned parent tasks without their subtasks.
     * 
     * Fixed: Added rollbackParent() call when subtask insert fails.
     * 
     * Impact: High - Data integrity issue
     */
    it('should rollback parent task when subtask insert fails', async () => {
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
      
      // Subtask insert fails
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to insert subtask' }
        })
      }
      
      // Rollback operations
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockAssigneeDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      let taskCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskCallCount++
          if (taskCallCount === 1) return mockTaskInsert
          if (taskCallCount === 2) return mockSubtaskInsert
          return mockTaskDelete
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
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'not-started',
        priority: '5',
        repeat_interval: '0',
        notes: 'Test notes',
        tags: [],
        project_id: 1,
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            start_date: '2024-01-02',
            due_date: '2024-01-15',
            status: 'not-started',
            priority: '3',
            notes: 'Subtask notes',
            repeat_interval: '0',
            tags: [],
            assignee_ids: [2]
          }
        ]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        // Verify rollback was called
        expect(mockTaskDelete.delete).toHaveBeenCalled()
        expect(mockTaskDelete.eq).toHaveBeenCalledWith('id', 1)
      }
    })
  })

  describe('Bug Fix: Orphaned Subtasks on Subtask Assignee Insert Failure', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: When subtask assignee insert failed, subtasks were not cleaned up,
     *      leaving orphaned subtasks in the database.
     * 
     * Fixed: Added cleanup of subtasks and their assignees before rolling back parent.
     * 
     * Impact: High - Data integrity issue
     */
    it('should cleanup subtasks when subtask assignee insert fails', async () => {
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
      
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{
            id: 2,
            title: 'Subtask 1',
            parent_task_id: 1,
            creator_id: 1
          }],
          error: null
        })
      }
      
      // Subtask assignee insert fails
      const mockSubtaskAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Failed to insert subtask assignees' }
        }),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        in: vi.fn().mockReturnThis()
      }
      
      let taskCallCount = 0
      let assigneeCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskCallCount++
          if (taskCallCount === 1) return mockTaskInsert
          if (taskCallCount === 2) return mockSubtaskInsert
          return mockTaskDelete
        }
        if (table === 'task_assignees') {
          assigneeCallCount++
          if (assigneeCallCount === 1) return mockAssigneeInsert
          return {
            ...mockSubtaskAssigneeInsert,
            delete: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Parent Task',
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'not-started',
        priority: '5',
        repeat_interval: '0',
        notes: 'Test notes',
        tags: [],
        project_id: 1,
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            start_date: '2024-01-02',
            due_date: '2024-01-15',
            status: 'not-started',
            priority: '3',
            notes: 'Subtask notes',
            repeat_interval: '0',
            tags: [],
            assignee_ids: [2]
          }
        ]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        // Verify subtask cleanup was attempted
        expect(mockTaskDelete.in).toHaveBeenCalledWith('id', [2])
      }
    })
  })

  describe('Bug Fix: Task Not Rolled Back on Validation Failure', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: When validation failed (e.g., no assignees), the task was not rolled back.
     * 
     * Fixed: Added rollbackParent() call before throwing validation errors.
     * 
     * Impact: Medium - Data integrity issue
     */
    it('should rollback task when validation fails (no assignees)', async () => {
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
      
      const mockAssigneeDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      let taskCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskCallCount++
          if (taskCallCount === 1) return mockTaskInsert
          // Return delete chainable for rollback
          return mockTaskDelete
        }
        if (table === 'task_assignees') return mockAssigneeDelete
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
        assignee_ids: [], // No assignees - should trigger validation error
        subtasks: []
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('At least one assignee is required for the task')
        // Verify rollback was called
        expect(mockTaskDelete.delete).toHaveBeenCalled()
        expect(mockTaskDelete.eq).toHaveBeenCalledWith('id', 1)
      }
    })
  })
})

