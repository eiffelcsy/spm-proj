import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/tasks/[id]/comments/[commentId].put'
import type { H3Event } from 'h3'

const mockGetRouterParam = vi.hoisted(() => vi.fn())
const mockReadBody = vi.hoisted(() => vi.fn())

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    defineEventHandler: (fn: any) => fn,
    getRouterParam: mockGetRouterParam,
    readBody: mockReadBody,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      if (error.data !== undefined) {
        err.data = error.data
      }
      return err
    },
  }
})

const mockGetVisibleStaffIds = vi.hoisted(() => vi.fn())
vi.mock('../../../server/utils/departmentHierarchy', () => ({
  getVisibleStaffIds: mockGetVisibleStaffIds,
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

type QueryResponse<T> = { data: T; error: any }
type ResponseEntry = QueryResponse<any> | (() => any)

function createResult<T>(data: T, error: any = null): QueryResponse<T> {
  return { data, error }
}

function createQuery<T>(response: QueryResponse<T>, configure?: (builder: any) => void) {
  const promise = Promise.resolve(response)
  const builder: any = {}

  const chainable = (method: string) => {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  ;['select', 'eq', 'is', 'in', 'order', 'insert', 'update', 'delete'].forEach(chainable)

  builder.single = vi.fn().mockResolvedValue(response)
  builder.maybeSingle = vi.fn().mockResolvedValue(response)

  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)

  configure?.(builder)

  return builder
}

function createSupabaseMock(responses: Record<string, ResponseEntry | ResponseEntry[]>) {
  const queues: Record<string, ResponseEntry[]> = {}

  for (const [table, entry] of Object.entries(responses)) {
    queues[table] = Array.isArray(entry) ? [...entry] : [entry]
  }

  return {
    from: vi.fn((table: string) => {
      if (!queues[table]) {
        queues[table] = []
      }
      const queue = queues[table]
      const entry = queue.length > 0 ? queue.shift()! : createResult<any>(null)
      if (typeof entry === 'function') {
        return entry()
      }
      return createQuery(entry)
    }),
  }
}

interface RouterParams {
  id?: string | null
  commentId?: string | null
}

function setRouterParams(params: RouterParams) {
  mockGetRouterParam.mockImplementation((_, key) => {
    if (key === 'id') return params.id ?? null
    if (key === 'commentId') return params.commentId ?? null
    return null
  })
}

describe('PUT /api/tasks/[id]/comments/[commentId]', () => {
  let mockEvent: Partial<H3Event>
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    } as Partial<H3Event>

    supabase = createSupabaseMock({})

    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

    vi.mocked(serverSupabaseServiceRole).mockImplementation(async () => supabase)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)

    mockReadBody.mockReset()
    mockReadBody.mockResolvedValue({ content: 'Updated comment' })
    mockGetVisibleStaffIds.mockReset()
    mockGetVisibleStaffIds.mockResolvedValue([55])

    setRouterParams({ id: '42', commentId: '7' })
  })

  it('should return 401 if user is not authenticated', async () => {
    const { serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: expect.stringContaining('Unauthorized'),
    })
  })

  it('should return 400 if task ID is missing', async () => {
    setRouterParams({ id: null, commentId: '7' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Task ID and Comment ID are required',
    })
  })

  it('should return 400 if comment ID is missing', async () => {
    setRouterParams({ id: '42', commentId: null })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Task ID and Comment ID are required',
    })
  })

  it('should return 400 when comment content is empty', async () => {
    mockReadBody.mockResolvedValue({ content: '   ' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Comment content is required',
    })
  })

  it('should return 400 when comment content exceeds limit', async () => {
    mockReadBody.mockResolvedValue({ content: 'a'.repeat(2001) })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Comment content cannot exceed 2000 characters',
    })
  })

  it('should return 500 when staff lookup fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult(null, new Error('boom')),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff ID',
    })
  })

  it('should return 404 when task is not found', async () => {
    supabase = createSupabaseMock({
      tasks: createResult(null, new Error('missing')),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Task not found',
    })
  })

  it('should return 403 when no visible departments are available', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42 }),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
    })

    mockGetVisibleStaffIds.mockResolvedValue([])

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'You do not have permission to edit comments on this task',
    })
  })

  it('should return 403 when no assignee is in visible departments', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42 }),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 88 }]),
    })

    mockGetVisibleStaffIds.mockResolvedValue([55])

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'You do not have permission to edit comments on this task',
    })
  })

  it('should return 404 when comment is not found', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42 }),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
      task_comments: createResult(null, new Error('missing comment')),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Comment not found',
    })
  })

  it('should return 403 when editing comment from another staff member', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42 }),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
      task_comments: createResult({
        id: 7,
        task_id: 42,
        staff_id: 99,
        content: 'Other comment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      }),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied - You can only edit your own comments',
    })
  })

  it('should return 500 when the update fails', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42 }),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
      task_comments: [
        createResult({
          id: 7,
          task_id: 42,
          staff_id: 10,
          content: 'Original comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        }),
        createResult(null, new Error('update failed')),
      ],
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to update comment',
    })
  })

  it('should return 500 when updated comment response is empty', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42 }),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
      task_comments: [
        createResult({
          id: 7,
          task_id: 42,
          staff_id: 10,
          content: 'Original comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        }),
        createResult(null),
      ],
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to update comment',
    })
  })

  it('should update the comment successfully', async () => {
    const now = '2024-01-02T00:00:00Z'
    vi.useFakeTimers().setSystemTime(new Date(now))

    const updatedComment = createResult({
      id: 7,
      task_id: 42,
      staff_id: 10,
      content: 'Updated comment',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: now,
      deleted_at: null,
      staff: {
        id: 10,
        fullname: 'Alice',
      },
    })

    supabase = createSupabaseMock({
      tasks: createResult({ id: 42 }),
      staff: createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
      task_comments: [
        createResult({
          id: 7,
          task_id: 42,
          staff_id: 10,
          content: 'Original comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        }),
        updatedComment,
      ],
    })

    mockReadBody.mockResolvedValue({ content: 'Updated comment' })

    try {
      const response = await handler(mockEvent as any)

      expect(response.success).toBe(true)
      expect(response.comment).toMatchObject({
        id: 7,
        content: 'Updated comment',
        staff_id: 10,
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('should wrap unexpected errors as internal server error', async () => {
    const unexpectedSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'staff') {
          return createQuery(createResult({ id: 10, fullname: 'Alice', department: 'Engineering' }))
        }
        if (table === 'tasks') {
          return {
            select: vi.fn(() => {
              throw new Error('unexpected failure')
            }),
          }
        }
        return createQuery(createResult(null))
      }),
    }

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(unexpectedSupabase as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  })
})


