import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../server/api/tasks/[id]/index.get'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

type QueryResponse<T = any> = { data: T; error: any }
type ResponseEntry = QueryResponse | (() => QueryResponse)
type TableResponses = Record<string, ResponseEntry | ResponseEntry[]>

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

vi.mock('~/server/utils/departmentHierarchy', () => ({
  getVisibleStaffIds: vi.fn(),
}))

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

function createResult<T>(data: T, error: any = null): QueryResponse<T> {
  return { data, error }
}

function createQuery<T>(response: QueryResponse<T>) {
  const promise = Promise.resolve(response)
  const builder: any = {}
  builder.select = vi.fn().mockReturnValue(builder)
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.is = vi.fn().mockReturnValue(builder)
  builder.in = vi.fn().mockReturnValue(builder)
  builder.order = vi.fn().mockReturnValue(builder)
  builder.single = vi.fn().mockResolvedValue(response)
  builder.maybeSingle = vi.fn().mockResolvedValue(response)
  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)
  return builder
}

function createSupabaseMock(responses: TableResponses) {
  const queues = Object.fromEntries(
    Object.entries(responses).map(([table, entry]) => [
      table,
      Array.isArray(entry) ? [...entry] : [entry],
    ]),
  ) as Record<string, ResponseEntry[]>

  return {
    from: vi.fn((table: string) => {
      if (!queues[table]) {
        queues[table] = []
      }
      const queue = queues[table]
      const entry = queue.length > 0 ? queue.shift()! : createResult(null)
      const response = typeof entry === 'function' ? entry() : entry
      return createQuery(response)
    }),
  }
}

describe('GET /api/tasks/[id] - Task Details API', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockGetRouterParam: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const { getRouterParam } = await import('h3')
    mockGetRouterParam = vi.mocked(getRouterParam)

    const { getVisibleStaffIds } = await import('../../server/utils/departmentHierarchy')
    vi.mocked(getVisibleStaffIds).mockResolvedValue([1, 2, 3])

    mockEvent = {
      node: { req: {}, res: {} },
    } as Partial<H3Event>
  })

  async function authenticateUser(user: any = { id: 'user-123' }) {
    vi.mocked(serverSupabaseUser).mockResolvedValue(user as any)
  }

  async function setupSupabase(responses: TableResponses) {
    mockSupabase = createSupabaseMock(responses)
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)
  }

  async function setVisibleStaffIds(ids: number[]) {
    const { getVisibleStaffIds } = await import('../../server/utils/departmentHierarchy')
    vi.mocked(getVisibleStaffIds).mockResolvedValue(ids)
  }

  function setTaskId(value: string | null) {
    mockGetRouterParam.mockReturnValue(value as any)
  }

  describe('Successful Task Retrieval', () => {
    it('should retrieve task details successfully with all associated data', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 3, fullname: 'John Creator' }),
          createResult([
            { id: 1, fullname: 'John Doe' },
            { id: 3, fullname: 'John Creator' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Test Task',
            notes: 'Test notes',
            start_date: '2024-01-01',
            due_date: '2024-01-31',
            status: 'in-progress',
            priority: 5,
            repeat_interval: 0,
            project_id: 2,
            creator_id: 3,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        projects: [createResult({ id: 2, name: 'Test Project' })],
        task_assignees: [
          createResult([
            { assigned_to_staff_id: 1, assigned_by_staff_id: 3 },
          ]),
        ],
        activity_timeline: [
          createResult([
            {
              id: 1,
              task_id: 1,
              staff_id: 1,
              action: 'created',
              timestamp: '2024-01-01T00:00:00Z',
              staff: { fullname: 'John Doe' },
            },
          ]),
        ],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task).toBeDefined()
      expect(result.task.id).toBe(1)
      expect(result.task.title).toBe('Test Task')
      expect(result.task.creator).toEqual({ id: 3, fullname: 'John Creator' })
      expect(result.task.project).toEqual({ id: 2, name: 'Test Project' })
      expect(result.task.assignees).toHaveLength(1)
      expect(result.task.assignees[0].assigned_to.fullname).toBe('John Doe')
      expect(result.task.history).toHaveLength(1)
      expect(result.task.subtasks).toEqual([])
    })

    it('should retrieve task with subtasks successfully', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: true, is_admin: false }),
          createResult({ id: 3, fullname: 'John Creator' }),
          createResult([
            { id: 1, fullname: 'John Doe' },
            { id: 3, fullname: 'John Creator' },
          ]),
          createResult({ id: 3, fullname: 'John Creator' }),
          createResult([
            { id: 1, fullname: 'John Doe' },
            { id: 3, fullname: 'John Creator' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Parent Task',
            parent_task_id: null,
            creator_id: 3,
            deleted_at: null,
          }),
          createResult([
            {
              id: 2,
              title: 'Subtask 1',
              parent_task_id: 1,
              creator_id: 3,
              deleted_at: null,
            },
          ]),
        ],
        projects: [createResult({ id: 2, name: 'Test Project' })],
        task_assignees: [
          createResult([
            { assigned_to_staff_id: 1, assigned_by_staff_id: 3 },
          ]),
          createResult([
            { assigned_to_staff_id: 1, assigned_by_staff_id: 3 },
          ]),
        ],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.subtasks).toHaveLength(1)
      expect(result.task.subtasks[0].title).toBe('Subtask 1')
      expect(result.task.subtasks[0].creator).toEqual({ id: 3, fullname: 'John Creator' })
      expect(result.task.subtasks[0].assignees[0].assigned_to.fullname).toBe('John Doe')
    })

  })

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
      setTaskId('1')

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 401,
        statusMessage: 'Unauthorized - User not authenticated',
      })
    })

    it('should return 500 if staff record lookup fails', async () => {
      await authenticateUser()
      setTaskId('1')

      await setupSupabase({
        staff: [createResult(null, { message: 'Database error' })],
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID',
      })
    })

    it('should return 500 if staff record not found', async () => {
      await authenticateUser()
      setTaskId('1')

      await setupSupabase({
        staff: [createResult(null)],
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID',
      })
    })

    it('should return 400 if task ID is missing', async () => {
      await authenticateUser()
      setTaskId(null)

      await setupSupabase({
        staff: [createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false })],
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Task ID is required',
      })
    })

    it('should return 404 if task is not found', async () => {
      await authenticateUser()
      setTaskId('1')

      await setupSupabase({
        staff: [createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false })],
        tasks: [createResult(null, { code: 'PGRST116' })],
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 404,
        statusMessage: 'Task not found',
      })
    })

    it('should return 500 if task fetch fails with non-404 error', async () => {
      await authenticateUser()
      setTaskId('1')

      await setupSupabase({
        staff: [createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false })],
        tasks: [createResult(null, { code: 'UNKNOWN', message: 'Database down' })],
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Failed to fetch task',
      })
    })

    it('should exclude soft-deleted tasks', async () => {
      await authenticateUser()
      setTaskId('1')

      await setupSupabase({
        staff: [createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false })],
        tasks: [createResult(null, { code: 'PGRST116' })],
      })

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 404,
        statusMessage: 'Task not found',
      })
    })
  })

  describe('Visibility and Permission Checks', () => {
    it('should return 403 if user has no visible staff IDs', async () => {
      await authenticateUser()
      setTaskId('1')
      await setVisibleStaffIds([])

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult([
            { id: 1, fullname: 'John Doe' },
            { id: 2, fullname: 'Jane Smith' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Test Task',
            creator_id: 2,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 2, assigned_by_staff_id: 1 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: 'You do not have permission to view this task',
      })
    })

    it('should return 403 if no assignee is from visible departments', async () => {
      await authenticateUser()
      setTaskId('1')
      await setVisibleStaffIds([1, 2])

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'Current User' }),
          createResult([
            { id: 99, fullname: 'External User' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Test Task',
            creator_id: 1,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 99, assigned_by_staff_id: 1 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: 'You do not have permission to view this task',
      })
    })

    it('should allow access if assignee is from visible departments', async () => {
      await authenticateUser()
      setTaskId('1')
      await setVisibleStaffIds([2])

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'Current User' }),
          createResult([
            { id: 2, fullname: 'Visible Staff' },
            { id: 1, fullname: 'Current User' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Test Task',
            creator_id: 1,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 2, assigned_by_staff_id: 1 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.assignees[0].assigned_to.fullname).toBe('Visible Staff')
    })
  })

  describe('Permission Calculations', () => {
    it('should allow managers to edit and delete any task', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: true, is_admin: false }),
          createResult({ id: 2, fullname: 'Other Creator' }),
          createResult([
            { id: 2, fullname: 'Other User' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Managed Task',
            creator_id: 2,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 2, assigned_by_staff_id: 1 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.permissions.canEdit).toBe(true)
      expect(result.task.permissions.canDelete).toBe(true)
    })

    it('should deny admins from editing or deleting task', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: true }),
          createResult({ id: 2, fullname: 'Other Creator' }),
          createResult([
            { id: 2, fullname: 'Other User' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Admin Task',
            creator_id: 2,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 2, assigned_by_staff_id: 1 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.permissions.canEdit).toBe(false)
      expect(result.task.permissions.canDelete).toBe(false)
    })

    it('should allow assigned user to edit and delete task', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'Current User' }),
          createResult([
            { id: 1, fullname: 'Current User' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Assigned Task',
            creator_id: 2,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 1, assigned_by_staff_id: 2 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.permissions.canEdit).toBe(true)
      expect(result.task.permissions.canDelete).toBe(true)
    })

    it('should deny creator when task assigned to someone else', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'Current User' }),
          createResult([
            { id: 2, fullname: 'Assigned User' },
            { id: 1, fullname: 'Current User' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Creator Task',
            creator_id: 1,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 2, assigned_by_staff_id: 1 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.permissions.canEdit).toBe(false)
      expect(result.task.permissions.canDelete).toBe(false)
    })

    it('should deny edit and delete for non-assigned, non-creator user', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 2, fullname: 'Other Creator' }),
          createResult([
            { id: 3, fullname: 'Assigned User' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Restricted Task',
            creator_id: 2,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 3, assigned_by_staff_id: 2 },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.permissions.canEdit).toBe(false)
      expect(result.task.permissions.canDelete).toBe(false)
    })
  })

  describe('Activity Timeline', () => {
    it('should fetch activity timeline successfully', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'John Doe' }),
          createResult([
            { id: 1, fullname: 'John Doe' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Timeline Task',
            creator_id: 1,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 1, assigned_by_staff_id: null },
        ])],
        activity_timeline: [
          createResult([
            {
              id: 1,
              task_id: 1,
              staff_id: 1,
              action: 'created',
              timestamp: '2024-01-01T00:00:00Z',
              staff: { fullname: 'John Doe' },
            },
            {
              id: 2,
              task_id: 1,
              staff_id: 1,
              action: 'updated',
              timestamp: '2024-01-02T00:00:00Z',
              staff: { fullname: 'John Doe' },
            },
          ]),
        ],
      }

      await setupSupabase(responses)

      const result = await handler(mockEvent as any)

      expect(result.task.history).toHaveLength(2)
      expect(result.task.history[0].action).toBe('created')
      expect(result.task.history[1].action).toBe('updated')
    })

    it('should handle timeline fetch errors gracefully', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'John Doe' }),
          createResult([
            { id: 1, fullname: 'John Doe' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Timeline Task',
            creator_id: 1,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 1, assigned_by_staff_id: null },
        ])],
        activity_timeline: [createResult(null, { message: 'Timeline fetch failed' })],
      }

      await setupSupabase(responses)

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Failed to fetch activity timeline',
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle general errors and return 500', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'John Doe' }),
          createResult([
            { id: 1, fullname: 'John Doe' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Error Task',
            creator_id: 1,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 1, assigned_by_staff_id: null },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const { getVisibleStaffIds } = await import('../../server/utils/departmentHierarchy')
      vi.mocked(getVisibleStaffIds).mockRejectedValue(new Error('Hierarchy error'))

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 500,
        statusMessage: 'Internal server error',
      })
    })

    it('should propagate errors with existing status code', async () => {
      await authenticateUser()
      setTaskId('1')

      const responses: TableResponses = {
        staff: [
          createResult({ id: 1, department: 'Engineering', is_manager: false, is_admin: false }),
          createResult({ id: 1, fullname: 'John Doe' }),
          createResult([
            { id: 1, fullname: 'John Doe' },
          ]),
        ],
        tasks: [
          createResult({
            id: 1,
            title: 'Error Task',
            creator_id: 1,
            project_id: null,
            parent_task_id: null,
            deleted_at: null,
          }),
          createResult([]),
        ],
        task_assignees: [createResult([
          { assigned_to_staff_id: 1, assigned_by_staff_id: null },
        ])],
        activity_timeline: [createResult([])],
      }

      await setupSupabase(responses)

      const { createError } = await import('h3')
      const { getVisibleStaffIds } = await import('../../server/utils/departmentHierarchy')
      vi.mocked(getVisibleStaffIds).mockRejectedValue(
        createError({ statusCode: 403, statusMessage: 'Custom visibility error' }),
      )

      await expect(handler(mockEvent as any)).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: 'Custom visibility error',
      })
    })
  })
})
