import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/tasks/index.post'
import type { H3Event } from 'h3'

/**
 * REGRESSION TEST SUITE: Data Validation Edge Cases
 * 
 * These tests verify that previously fixed data validation bugs remain fixed.
 * These bugs caused crashes or data corruption when invalid data was provided.
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

describe('REGRESSION: Data Validation Edge Cases', () => {
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

  describe('Bug Fix: Null Values Causing Crashes', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: Null values in request body caused crashes when code tried to
     *      access properties or call methods on null.
     * 
     * Fixed: Added null checks and default values throughout the handler.
     * 
     * Impact: Medium - Application stability
     */
    it('should handle null values in request body gracefully', async () => {
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
            creator_id: 1,
            notes: 'No notes...', // Should default to 'No notes...'
            start_date: null,
            due_date: null,
            status: null,
            priority: null
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
        notes: null, // Null value
        start_date: null,
        due_date: null,
        status: null,
        priority: null,
        assignee_ids: [1],
        subtasks: null // Null subtasks
      })
      
      const response = await handler(mockEvent as any)
      
      // Should not crash and should handle null values
      expect(response.success).toBe(true)
      expect(response.task).toBeDefined()
    })
  })

  describe('Bug Fix: Empty Arrays Treated as Valid', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: Empty arrays for subtasks were treated as valid, but should be
     *      handled as "no subtasks" scenario.
     * 
     * Fixed: Added Array.isArray() check and default to empty array.
     * 
     * Impact: Low - Logic issue
     */
    it('should handle empty subtasks array', async () => {
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
        assignee_ids: [1],
        subtasks: [] // Empty array
      })
      
      const response = await handler(mockEvent as any)
      
      // Should handle empty array and not create subtasks
      expect(response.success).toBe(true)
      expect(response.task).toBeDefined()
      expect(response.subtasks).toBeUndefined() // No subtasks created
    })
  })

  describe('Bug Fix: Invalid Data Types Causing Crashes', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: Invalid data types (e.g., string instead of number) caused
     *      crashes when code tried to perform operations on wrong types.
     * 
     * Fixed: Added type conversion and validation.
     * 
     * Impact: Medium - Application stability
     */
    it('should handle string priority values', async () => {
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
            creator_id: 1,
            priority: 5 // Should convert string '5' to number 5
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
        priority: '5', // String instead of number
        assignee_ids: [1],
        subtasks: []
      })
      
      const response = await handler(mockEvent as any)
      
      // Should handle string priority and convert it
      expect(response.success).toBe(true)
      expect(response.task).toBeDefined()
    })

    it('should handle string assignee IDs', async () => {
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
      
      let capturedMappings: any[] = []
      const mockAssigneeInsert = {
        insert: vi.fn((mappings: any[]) => {
          capturedMappings = mappings
          return Promise.resolve({ error: null })
        })
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
        assignee_ids: ['1', '2', '3'], // String IDs instead of numbers
        subtasks: []
      })
      
      const response = await handler(mockEvent as any)
      
      // Should convert string IDs to numbers
      expect(response.success).toBe(true)
      expect(capturedMappings[0].assigned_to_staff_id).toBe(1)
      expect(capturedMappings[1].assigned_to_staff_id).toBe(2)
      expect(capturedMappings[2].assigned_to_staff_id).toBe(3)
    })
  })

  describe('Bug Fix: Missing Required Fields Causing Crashes', () => {
    /**
     * REGRESSION TEST
     * 
     * Bug: Missing required fields (e.g., title) caused crashes when
     *      code tried to access undefined properties.
     * 
     * Fixed: Added default values and null checks.
     * 
     * Impact: Medium - Application stability
     */
    it('should handle missing optional fields', async () => {
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
      
      let capturedPayload: any = null
      const mockTaskInsert = {
        insert: vi.fn((payload: any) => {
          capturedPayload = payload[0]
          return mockTaskInsert
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            creator_id: 1,
            ...capturedPayload
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
        assignee_ids: [1]
        // Missing: notes, start_date, due_date, status, priority, etc.
      })
      
      const response = await handler(mockEvent as any)
      
      // Should handle missing fields with defaults
      expect(response.success).toBe(true)
      expect(capturedPayload.notes).toBe('No notes...') // Default value
      expect(capturedPayload.start_date).toBeNull()
      expect(capturedPayload.due_date).toBeNull()
    })
  })
})

