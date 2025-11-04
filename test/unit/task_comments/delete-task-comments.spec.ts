import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/tasks/[id]/comments/[commentId].delete'
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

describe('DELETE /api/tasks/[id]/comments/[commentId]', () => {
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

  it('should return 500 when staff lookup fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult(null, new Error('failed')),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff information',
    })
  })

  it('should return 404 when comment is not found', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ is_manager: true, is_admin: false }),
      task_comments: createResult(null, new Error('missing')),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Comment not found',
    })
  })

  it('should return 403 when user lacks permission to delete', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ is_manager: false, is_admin: false }),
      task_comments: createResult({ id: 7, task_id: 42, staff_id: 10 }),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied - Only managers or admins can delete comments',
    })
  })

  it('should return 500 when soft delete update fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ is_manager: true, is_admin: false }),
      task_comments: [
        createResult({ id: 7, task_id: 42, staff_id: 10 }),
        createResult(null, new Error('update failed')),
      ],
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to delete comment',
    })
  })

  it('should soft delete the comment when requester is manager', async () => {
    const timestamp = '2024-01-01T00:00:00Z'
    vi.useFakeTimers().setSystemTime(new Date(timestamp))

    supabase = createSupabaseMock({
      staff: createResult({ is_manager: true, is_admin: false }),
      task_comments: [
        createResult({ id: 7, task_id: 42, staff_id: 10 }),
        createResult([{ id: 7, deleted_at: timestamp }]),
      ],
    })

    try {
      const response = await handler(mockEvent as any)

      expect(response.success).toBe(true)
      expect(response.message).toBe('Comment deleted successfully')
      expect(supabase.from).toHaveBeenCalledWith('task_comments')
    } finally {
      vi.useRealTimers()
    }
  })
})


