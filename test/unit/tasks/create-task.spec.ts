import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/tasks/index.post'
import type { H3Event } from 'h3'

// Mock the Supabase server functions
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

// Mock the utility functions
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

// Mock h3 functions
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

describe('POST /api/tasks - Create Task API Endpoint', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    const { readBody } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    
    // Setup mock event
    mockEvent = {
      node: { req: {}, res: {} }
    } as any
    
    // Setup mock Supabase client with chainable methods
    mockSupabase = {
      from: vi.fn()
    }
  })

  describe('Successful Task Creation', () => {
    it('should create task successfully with all required fields', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      // Mock authenticated user
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      // Mock staff lookup
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null
        })
      }
      
      // Mock task insert
      const mockTaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            title: 'Test Task',
            notes: 'Test notes',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            priority: 5,
            repeat_interval: 0,
            project_id: 1,
            creator_id: 1,
            tags: ['urgent', 'frontend'],
            parent_task_id: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null
          },
          error: null
        })
      }
      
      // Mock task_assignees insert
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
      
      // Mock request body
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'not-started',
        priority: '5',
        repeat_interval: '0',
        notes: 'Test notes',
        tags: ['urgent', 'frontend'],
        project_id: 1,
        assignee_ids: [2, 3],
        subtasks: []
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.task).toBeDefined()
      expect(response.task.title).toBe('Test Task')
      expect(response.task.status).toBe('not-started')
      expect(response.task.priority).toBe(5)
      expect(mockSupabase.from).toHaveBeenCalledWith('staff')
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.from).toHaveBeenCalledWith('task_assignees')
    })

    it('should create task with subtasks successfully', async () => {
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
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 1,
            title: 'Test Task with Subtasks',
            creator_id: 1,
            notes: 'Test notes',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'not-started',
            priority: 5,
            repeat_interval: 0,
            project_id: 1,
            tags: ['urgent'],
            parent_task_id: null
          },
          error: null
        })
      }
      
      // For subtasks insert
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{
            id: 2,
            title: 'Subtask 1',
            parent_task_id: 1,
            creator_id: 1,
            notes: 'Subtask notes',
            start_date: '2024-01-02',
            due_date: '2024-01-15',
            status: 'not-started',
            priority: 3,
            repeat_interval: 0,
            project_id: 1,
            tags: []
          }],
          error: null
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      let taskInsertCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskInsertCallCount++
          if (taskInsertCallCount === 1) return mockTaskInsert
          return mockSubtaskInsert
        }
        if (table === 'task_assignees') return mockAssigneeInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task with Subtasks',
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'not-started',
        priority: '5',
        repeat_interval: '0',
        notes: 'Test notes',
        tags: ['urgent'],
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
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(response.task.title).toBe('Test Task with Subtasks')
      expect(response.subtasks).toHaveLength(1)
      expect(response.subtasks[0].title).toBe('Subtask 1')
      expect(response.subtasks[0].parent_task_id).toBe(1)
    })

    it('should calculate due_date from start_date and repeat_interval', async () => {
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
        start_date: '2024-01-01',
        status: 'not-started',
        priority: '5',
        repeat_interval: '7', // 7 days
        notes: 'Test notes',
        tags: [],
        project_id: 1,
        assignee_ids: [2],
        subtasks: []
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedPayload.due_date).toBe('2024-01-08') // 7 days after start_date
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        assignee_ids: [1]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(401)
        expect(error.statusMessage).toBe('Not authenticated')
      }
    })

    it('should return 403 if no staff record found', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        assignee_ids: [1]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.statusMessage).toBe('No staff record found for authenticated user.')
      }
    })
  })

  describe('Assignee Validation', () => {
    it('should reject task with no assignees', async () => {
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
      
      const mockAssigneeDelete = {
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
        assignee_ids: [], // Empty assignees
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

    it('should reject task with more than 5 assignees', async () => {
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
        start_date: '2024-01-01',
        due_date: '2024-01-31',
        status: 'not-started',
        priority: '5',
        repeat_interval: '0',
        notes: 'Test notes',
        tags: [],
        project_id: 1,
        assignee_ids: [1, 2, 3, 4, 5, 6], // 6 assignees (exceeds limit)
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

    it('should reject subtask with no assignees', async () => {
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
            eq: vi.fn().mockResolvedValue({ error: null }),
            insert: vi.fn().mockResolvedValue({ error: null })
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
        assignee_ids: [2],
        subtasks: [{
          title: 'Subtask 1',
          start_date: '2024-01-02',
          due_date: '2024-01-15',
          status: 'not-started',
          priority: '3',
          notes: 'Subtask notes',
          repeat_interval: '0',
          tags: [],
          assignee_ids: [] // Empty assignees
        }]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toContain('Subtask 1: At least one assignee is required')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors during staff lookup', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      
      vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
      
      const mockStaffQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        assignee_ids: [1]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Database connection failed')
      }
    })

    it('should handle database errors during task insert', async () => {
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
          data: null,
          error: { message: 'Failed to insert task' }
        })
      }
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') return mockTaskInsert
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
        expect(error.statusMessage).toBe('Failed to insert task')
      }
    })
  })

  describe('Activity Logging and Notifications', () => {
    it('should log task creation activity', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { logTaskCreation } = await import('~/server/utils/activityLogger')
      
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
        assignee_ids: [2],
        subtasks: []
      })
      
      await handler(mockEvent as any)
      
      expect(logTaskCreation).toHaveBeenCalledWith(mockSupabase, 1, 1)
    })

    it('should create notifications for task assignment', async () => {
      const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
      const { createTaskAssignmentNotification } = await import('~/server/utils/notificationService')
      
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
        assignee_ids: [2, 3],
        subtasks: []
      })
      
      await handler(mockEvent as any)
      
      expect(createTaskAssignmentNotification).toHaveBeenCalledTimes(2)
      expect(createTaskAssignmentNotification).toHaveBeenCalledWith(
        mockSupabase,
        1,
        2,
        1,
        'Test Task',
        'Test Project'
      )
      expect(createTaskAssignmentNotification).toHaveBeenCalledWith(
        mockSupabase,
        1,
        3,
        1,
        'Test Task',
        'Test Project'
      )
    })
  })

  describe('Subtask Error Handling', () => {
    it('should handle subtask insert error', async () => {
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
      
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to insert subtask' }
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }
      
      let taskInsertCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskInsertCallCount++
          if (taskInsertCallCount === 1) return mockTaskInsert
          return mockSubtaskInsert
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
        expect(error.statusMessage).toContain('Failed to insert subtask')
      }
    })

    it('should handle subtask assignee insert error', async () => {
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
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockSubtaskAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Failed to insert subtask assignees' }
        })
      }
      
      let taskInsertCallCount = 0
      let assigneeInsertCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskInsertCallCount++
          if (taskInsertCallCount === 1) return mockTaskInsert
          return mockSubtaskInsert
        }
        if (table === 'task_assignees') {
          assigneeInsertCallCount++
          if (assigneeInsertCallCount === 1) return mockAssigneeInsert
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
        expect(error.statusMessage).toContain('Failed to insert subtask assignees')
      }
    })

    it('should handle subtask with repeat_interval calculation', async () => {
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
      
      let capturedSubtaskPayload: any = null
      const mockSubtaskInsert = {
        insert: vi.fn((payload: any) => {
          capturedSubtaskPayload = payload[0]
          return mockSubtaskInsert
        }),
        select: vi.fn().mockResolvedValue({
          data: [{
            id: 2,
            title: 'Subtask 1',
            parent_task_id: 1,
            creator_id: 1,
            ...capturedSubtaskPayload
          }],
          error: null
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      let taskInsertCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskInsertCallCount++
          if (taskInsertCallCount === 1) return mockTaskInsert
          return mockSubtaskInsert
        }
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
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            start_date: '2024-01-02',
            status: 'not-started',
            priority: '3',
            notes: 'Subtask notes',
            repeat_interval: '7', // 7 days
            tags: [],
            assignee_ids: [2]
          }
        ]
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedSubtaskPayload.due_date).toBe('2024-01-09') // 7 days after start_date
    })

    it('should handle subtask without repeat_interval property', async () => {
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
      
      let capturedSubtaskPayload: any = null
      const mockSubtaskInsert = {
        insert: vi.fn((payload: any) => {
          capturedSubtaskPayload = payload[0]
          return mockSubtaskInsert
        }),
        select: vi.fn().mockResolvedValue({
          data: [{
            id: 2,
            title: 'Subtask 1',
            parent_task_id: 1,
            creator_id: 1,
            ...capturedSubtaskPayload
          }],
          error: null
        })
      }
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      let taskInsertCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskInsertCallCount++
          if (taskInsertCallCount === 1) return mockTaskInsert
          return mockSubtaskInsert
        }
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
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            start_date: '2024-01-02',
            status: 'not-started',
            priority: '3',
            notes: 'Subtask notes',
            tags: [],
            assignee_ids: [2]
            // No repeat_interval property - should default to null
          }
        ]
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedSubtaskPayload.repeat_interval).toBe(null)
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
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          callCount++
          if (callCount === 1) return mockTaskInsert
          return mockTaskDelete
        }
        if (table === 'task_assignees') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
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
        // The error might be wrapped by catch block, but should still contain the message
        expect(error.statusCode).toBeGreaterThanOrEqual(400)
        expect(error.statusMessage || error.message).toContain('Subtask 1: Maximum 5 assignees allowed')
      }
    })

    it('should handle task with repeat_interval calculation', async () => {
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
        start_date: '2024-01-01',
        repeat_interval: 7, // 7 days
        assignee_ids: [2]
      })
      
      const response = await handler(mockEvent as any)
      
      expect(response.success).toBe(true)
      expect(capturedPayload.due_date).toBe('2024-01-08') // 7 days after start_date
    })

    it('should handle project member insert error with rollback', async () => {
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
            project_id: 5
          },
          error: null
        })
      }
      
      const mockProjectMemberInsert = {
        insert: vi.fn().mockResolvedValue({ error: { message: 'Project member insert failed' } })
      }
      
      const mockTaskDelete = {
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
        if (table === 'task_assignees') return mockProjectMemberInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        project_id: 5,
        assignee_ids: [2]
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Project member insert failed')
        expect(mockTaskDelete.delete).toHaveBeenCalled()
      }
    })

    it('should handle parent task with assignee_ids that is not an array', async () => {
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
        assignee_ids: 'not-an-array' // Not an array - should default to []
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
        expect(error.statusMessage).toBe('At least one assignee is required for the task')
      }
    })

    it('should handle subtask with assignee_ids that is not an array', async () => {
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
      
      const mockSubtaskInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 2, title: 'Subtask 1', parent_task_id: 1 }],
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
      
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          callCount++
          if (callCount === 1) return mockTaskInsert
          if (callCount === 2) return mockSubtaskInsert
          return mockTaskDelete
        }
        if (table === 'task_assignees') return mockAssigneeInsert
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
        assignee_ids: [2],
        subtasks: [
          {
            title: 'Subtask 1',
            assignee_ids: 'not-an-array' // Not an array
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

    it('should handle assignee insert error with rollback', async () => {
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
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Failed to insert assignees' }
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
            ...mockAssigneeInsert,
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
        assignee_ids: [2],
        subtasks: []
      })
      
      try {
        await handler(mockEvent as any)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Failed to insert assignees')
      }
    })

    it('should handle subtask assignee insert error with rollback', async () => {
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
      
      const mockAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({ error: null })
      }
      
      const mockSubtaskAssigneeInsert = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Failed to insert subtask assignees' }
        })
      }
      
      const mockTaskDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        in: vi.fn().mockReturnThis()
      }
      
      let taskInsertCallCount = 0
      let assigneeInsertCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'staff') return mockStaffQuery
        if (table === 'tasks') {
          taskInsertCallCount++
          if (taskInsertCallCount === 1) return mockTaskInsert
          if (taskInsertCallCount === 2) return mockSubtaskInsert
          return mockTaskDelete
        }
        if (table === 'task_assignees') {
          assigneeInsertCallCount++
          if (assigneeInsertCallCount === 1) return mockAssigneeInsert
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
        expect(error.statusMessage).toBe('Failed to insert subtask assignees')
      }
    })

    it('should handle subtask with more than 5 assignees validation', async () => {
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
            insert: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {}
      })
      
      vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
      
      mockReadBody.mockResolvedValue({
        title: 'Test Task',
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
})
