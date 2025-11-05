import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/tasks/[id]/comments/index.get'
import type { H3Event } from 'h3'

const mockGetRouterParam = vi.hoisted(() => vi.fn())

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    defineEventHandler: (fn: any) => fn,
    getRouterParam: mockGetRouterParam,
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

function setTaskId(value: string | null) {
  mockGetRouterParam.mockImplementation((_, key) => (key === 'id' ? value : null))
}

describe('GET /api/tasks/[id]/comments', () => {
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

    mockGetVisibleStaffIds.mockReset()
    mockGetVisibleStaffIds.mockResolvedValue([55])

    setTaskId('42')
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
    setTaskId(null)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Task ID is required',
    })
  })

  it('should return 404 when task is not found', async () => {
    supabase = createSupabaseMock({
      tasks: createResult(null, new Error('missing')),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Task not found',
    })
  })

  it('should return 500 when staff lookup fails', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42, creator_id: 7 }),
      staff: createResult(null, new Error('boom')),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff ID',
    })
  })

  it('should return 403 when no visible departments are available', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42, creator_id: 7 }),
      staff: createResult({ id: 10, department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 75 }]),
    })

    mockGetVisibleStaffIds.mockResolvedValue([])

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'You do not have permission to view comments on this task',
    })
  })

  it('should return 403 when no assignee is in visible departments', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42, creator_id: 7 }),
      staff: createResult({ id: 10, department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 75 }]),
    })

    mockGetVisibleStaffIds.mockResolvedValue([55])

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'You do not have permission to view comments on this task',
    })
  })

  it('should return 500 when fetching comments fails', async () => {
    supabase = createSupabaseMock({
      tasks: createResult({ id: 42, creator_id: 7 }),
      staff: createResult({ id: 10, department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
      task_comments: createResult(null, new Error('query failed')),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch comments',
    })
  })

  it('should return comments when requester has access', async () => {
    const comments = [
      {
        id: 1,
        task_id: 42,
        staff_id: 55,
        content: 'First comment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
        staff: {
          id: 55,
          fullname: 'Alice',
        },
      },
    ]

    supabase = createSupabaseMock({
      tasks: createResult({ id: 42, creator_id: 7 }),
      staff: createResult({ id: 10, department: 'Engineering' }),
      task_assignees: createResult([{ assigned_to_staff_id: 55 }]),
      task_comments: createResult(comments),
    })

    mockGetVisibleStaffIds.mockResolvedValue([55])

    const response = await handler(mockEvent as any)

    expect(response.success).toBe(true)
    expect(response.comments).toHaveLength(1)
    expect(response.comments[0]).toMatchObject({
      id: 1,
      content: 'First comment',
      staff: {
        id: 55,
        fullname: 'Alice',
        email: null,
      },
    })
  })

  it('should wrap unexpected errors as internal server error', async () => {
    const unexpectedSupabase = {
      from: vi.fn((table: string) => {
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


