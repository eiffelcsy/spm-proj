import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the event handler
const mockSupabaseServiceRole = vi.fn()
const mockSupabaseUser = vi.fn()
const mockGetRouterParam = vi.fn()
const mockReadBody = vi.fn()

// Mock Supabase operations
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIs = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()

// Mock utility functions
const mockLogTaskUpdate = vi.fn()
const mockGetTaskDetails = vi.fn()
const mockCreateTaskUpdateNotification = vi.fn()

// Mock imports
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: () => mockSupabaseServiceRole(),
  serverSupabaseUser: () => mockSupabaseUser()
}))

vi.mock('h3', () => ({
  defineEventHandler: (fn: any) => fn,
  getRouterParam: (...args: any[]) => mockGetRouterParam(...args),
  readBody: (...args: any[]) => mockReadBody(...args),
  createError: (opts: any) => ({ ...opts, __isError: true })
}))

vi.mock('../../../utils/activityLogger', () => ({
  logTaskUpdate: (...args: any[]) => mockLogTaskUpdate(...args),
  logTaskAssignment: vi.fn(),
  logTaskCompletion: vi.fn(),
  logActivity: vi.fn()
}))

vi.mock('../../../utils/notificationService', () => ({
  createTaskUpdateNotification: (...args: any[]) => mockCreateTaskUpdateNotification(...args),
  getTaskDetails: (...args: any[]) => mockGetTaskDetails(...args),
  createTaskAssignmentNotification: vi.fn(),
  createTaskUnassignmentNotification: vi.fn()
}))

vi.mock('../../../utils/recurringTaskService', () => ({
  replicateCompletedTask: vi.fn()
}))

describe('Update Task Priority - PUT /api/tasks/[id]', () => {
  let supabaseClient: any
  let mockEvent: any

  const mockStaffData = {
    id: 1,
    department: 'Engineering'
  }

  const mockTaskData = {
    id: 100,
    title: 'Test Task',
    start_date: '2024-01-01',
    due_date: '2024-01-10',
    status: 'in-progress',
    notes: 'Task notes',
    priority: '5',
    repeat_interval: 0,
    tags: ['#test']
  }

  beforeEach(() => {
    // Setup Supabase client mock
    supabaseClient = {
      from: mockFrom
    }

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate
    })

    mockSelect.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      single: mockSingle
    })

    mockEq.mockReturnValue({
      eq: mockEq,
      is: mockIs,
      single: mockSingle,
      select: mockSelect
    })

    mockIs.mockReturnValue({
      single: mockSingle
    })

    mockUpdate.mockReturnValue({
      eq: mockEq,
      select: mockSelect
    })

    // Default mocks
    mockSupabaseServiceRole.mockReturnValue(supabaseClient)
    mockSupabaseUser.mockResolvedValue({ id: 'user-123' })
    mockGetRouterParam.mockReturnValue('100')
    mockReadBody.mockResolvedValue({ priority: '7' })
    
    mockGetTaskDetails.mockResolvedValue({
      title: 'Test Task',
      projectName: 'Test Project'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Priority Update Basic Functionality', () => {
    beforeEach(() => {
      setupSuccessfulAuth()
    })

    it('should update task priority successfully', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '8' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: '8'
        })
      )
    })

    it('should accept priority as string', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '10' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: '10'
        })
      )
    })

    it('should accept priority as number', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: 5 })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 5
        })
      )
    })

    it('should update only priority without affecting other fields', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '9' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.priority).toBe('9')
      expect(updateCall.title).toBeUndefined()
      expect(updateCall.status).toBeUndefined()
      expect(updateCall.notes).toBeUndefined()
    })

    it('should return success true when priority is updated', async () => {
      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should return updated task with new priority', async () => {
      const updatedTask = { ...mockTaskData, priority: '8' }
      mockSelect.mockResolvedValueOnce({
        data: updatedTask,
        error: null
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.task.priority).toBe('8')
    })
  })

  describe('Priority Value Validation', () => {
    beforeEach(() => {
      setupSuccessfulAuth()
    })

    it('should accept priority value 1', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '1' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should accept priority value 10', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '10' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should accept priority value 5', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '5' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should accept all valid priority values from 1 to 10', async () => {
      for (let priority = 1; priority <= 10; priority++) {
        vi.clearAllMocks()
        setupSuccessfulAuth()
        mockReadBody.mockResolvedValueOnce({ priority: String(priority) })

        const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
        const result = await handler.default(mockEvent)

        expect(result.success).toBe(true)
      }
    })

    it('should accept priority value 0', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '0' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should accept negative priority values', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '-1' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should accept priority values greater than 10', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '100' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle null priority value', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: null })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle undefined priority by not updating it', async () => {
      mockReadBody.mockResolvedValueOnce({ status: 'completed' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.priority).toBeUndefined()
    })

    it('should handle empty string priority', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle non-numeric priority strings', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: 'high' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })
  })

  describe('Priority Change Logging', () => {
    beforeEach(() => {
      setupSuccessfulAuth()
    })

    it('should log priority change when priority is updated', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '8' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockLogTaskUpdate).toHaveBeenCalledWith(
        supabaseClient,
        100,
        1,
        expect.arrayContaining([
          expect.objectContaining({
            field: 'priority',
            oldValue: '5',
            newValue: '8'
          })
        ])
      )
    })

    it('should not log when priority is unchanged', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '5' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockLogTaskUpdate).not.toHaveBeenCalled()
    })

    it('should log priority change from null to numeric value', async () => {
      const taskWithNullPriority = { ...mockTaskData, priority: null }
      mockSingle.mockResolvedValueOnce({
        data: taskWithNullPriority,
        error: null
      })

      mockReadBody.mockResolvedValueOnce({ priority: '5' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockLogTaskUpdate).toHaveBeenCalled()
    })

    it('should log priority change from numeric value to null', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: null })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockLogTaskUpdate).toHaveBeenCalledWith(
        supabaseClient,
        100,
        1,
        expect.arrayContaining([
          expect.objectContaining({
            field: 'priority',
            oldValue: '5',
            newValue: null
          })
        ])
      )
    })

    it('should include priority in change summary for notifications', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '10' })

      mockEq.mockResolvedValueOnce({
        data: [{ assigned_to_staff_id: 1 }],
        error: null
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockCreateTaskUpdateNotification).toHaveBeenCalledWith(
        supabaseClient,
        100,
        1,
        1,
        'Test Task',
        expect.stringContaining('Priority'),
        'Test Project'
      )
    })
  })

  describe('Priority Update with Multiple Field Changes', () => {
    beforeEach(() => {
      setupSuccessfulAuth()
    })

    it('should update priority along with status', async () => {
      mockReadBody.mockResolvedValueOnce({
        priority: '9',
        status: 'completed'
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: '9',
          status: 'completed'
        })
      )
    })

    it('should update priority along with task name', async () => {
      mockReadBody.mockResolvedValueOnce({
        priority: '8',
        task_name: 'Updated Task Name'
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: '8',
          title: 'Updated Task Name'
        })
      )
    })

    it('should update priority along with notes', async () => {
      mockReadBody.mockResolvedValueOnce({
        priority: '7',
        notes: 'Updated notes'
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: '7',
          notes: 'Updated notes'
        })
      )
    })

    it('should update priority along with dates', async () => {
      mockReadBody.mockResolvedValueOnce({
        priority: '6',
        start_date: '2024-02-01',
        end_date: '2024-02-10'
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: '6',
          start_date: '2024-02-01',
          due_date: '2024-02-10'
        })
      )
    })

    it('should log all changed fields including priority', async () => {
      mockReadBody.mockResolvedValueOnce({
        priority: '9',
        status: 'completed',
        task_name: 'Updated Task'
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockLogTaskUpdate).toHaveBeenCalledWith(
        supabaseClient,
        100,
        1,
        expect.arrayContaining([
          expect.objectContaining({ field: 'priority' }),
          expect.objectContaining({ field: 'status' }),
          expect.objectContaining({ field: 'title' })
        ])
      )
    })
  })

  describe('Priority Update Permission Checks', () => {
    it('should require authentication to update priority', async () => {
      mockSupabaseUser.mockResolvedValueOnce(null)

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(401)
      }
    })

    it('should require user to be assigned to task to update priority', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: mockStaffData, error: null })
        .mockResolvedValueOnce({ data: { id: 100 }, error: null })

      mockEq.mockResolvedValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: [{ assigned_to_staff_id: 2 }],
          error: null
        })
      })

      mockEq.mockResolvedValueOnce({
        data: [{ id: 1 }, { id: 2 }],
        error: null
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
      }
    })

    it('should allow creator to update priority of unassigned task', async () => {
      setupSuccessfulAuth()
      
      mockEq.mockResolvedValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      mockSingle.mockResolvedValueOnce({
        data: { creator_id: 1 },
        error: null
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should require task to exist before updating priority', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: mockStaffData, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
      }
    })
  })

  describe('Priority Update Edge Cases', () => {
    beforeEach(() => {
      setupSuccessfulAuth()
    })

    it('should handle very large priority numbers', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '999999' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle priority with decimal values', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '5.5' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle priority with leading zeros', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '007' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle priority with whitespace', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '  5  ' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle priority update when task has subtasks', async () => {
      mockReadBody.mockResolvedValueOnce({
        priority: '8',
        subtasks: [
          { id: 101, title: 'Subtask 1', assignee_ids: [1] }
        ]
      })

      mockSingle.mockResolvedValueOnce({
        data: { id: 101, parent_task_id: 100 },
        error: null
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
    })

    it('should handle concurrent priority updates', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '9' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      const result = await handler.default(mockEvent)

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Priority Update Database Errors', () => {
    beforeEach(() => {
      setupSuccessfulAuth()
    })

    it('should return 500 if database update fails', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toContain('Failed to update task')
      }
    })

    it('should rollback if priority update fails', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      
      try {
        await handler.default(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.statusCode).toBe(500)
      }
    })
  })

  describe('Priority Update Notification Behavior', () => {
    beforeEach(() => {
      setupSuccessfulAuth()
    })

    it('should notify all assignees when priority changes', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '10' })

      mockEq.mockResolvedValueOnce({
        data: [
          { assigned_to_staff_id: 1 },
          { assigned_to_staff_id: 2 },
          { assigned_to_staff_id: 3 }
        ],
        error: null
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockCreateTaskUpdateNotification).toHaveBeenCalledTimes(3)
    })

    it('should not notify if priority is unchanged', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '5' })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      expect(mockCreateTaskUpdateNotification).not.toHaveBeenCalled()
    })

    it('should include priority change in notification message', async () => {
      mockReadBody.mockResolvedValueOnce({ priority: '10' })

      mockEq.mockResolvedValueOnce({
        data: [{ assigned_to_staff_id: 1 }],
        error: null
      })

      const handler = await import('../../../server/api/tasks/[id]/index.put.ts')
      await handler.default(mockEvent)

      const notificationCall = mockCreateTaskUpdateNotification.mock.calls[0]
      expect(notificationCall[5]).toMatch(/Priority.*5.*10/)
    })
  })

  // Helper function to setup successful authorization
  function setupSuccessfulAuth() {
    mockSingle.mockReset()
    mockEq.mockReset()

    mockSingle
      .mockResolvedValueOnce({ data: mockStaffData, error: null })
      .mockResolvedValueOnce({ data: { id: 100 }, error: null })
      .mockResolvedValueOnce({ data: mockTaskData, error: null })

    mockEq.mockResolvedValueOnce({
      eq: vi.fn().mockResolvedValue({
        data: [{ assigned_to_staff_id: 1 }],
        error: null
      })
    })

    mockEq.mockResolvedValueOnce({
      data: [{ id: 1 }],
      error: null
    })

    mockSelect.mockResolvedValueOnce({
      data: { ...mockTaskData, priority: '7' },
      error: null
    })

    mockEq.mockResolvedValueOnce({
      data: [{ assigned_to_staff_id: 1 }],
      error: null
    })
  }
})