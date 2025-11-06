import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/notifications/[id]/index.get'
import type { H3Event } from 'h3'

const mockGetRouterParam = vi.hoisted(() => vi.fn())
const mockDefineEventHandler = vi.hoisted(() => (fn: any) => fn)
const mockCreateError = vi.hoisted(() => (error: any) => {
  const err = new Error(error.statusMessage) as any
  err.statusCode = error.statusCode
  err.statusMessage = error.statusMessage
  if (error.data !== undefined) {
    err.data = error.data
  }
  return err
})

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    defineEventHandler: mockDefineEventHandler,
    getRouterParam: mockGetRouterParam,
    createError: mockCreateError,
  }
})

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

type QueryResponse<T> = { data: T; error: any }
type ResponseEntry = QueryResponse<any> | (() => QueryResponse<any>)

function createResult<T>(data: T, error: any = null): QueryResponse<T> {
  return { data, error }
}

function createQuery<T>(response: QueryResponse<T>, configure?: (builder: any) => void) {
  const promise = Promise.resolve(response)
  const builder: any = {}

  const chainable = (method: string) => {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  ;['select', 'eq', 'is', 'update'].forEach(chainable)

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
      const entry = queue.length > 0 ? queue.shift()! : createResult(null)
      const response = typeof entry === 'function' ? entry() : entry
      return createQuery(response)
    }),
  }
}

function setNotificationId(value: string | null) {
  mockGetRouterParam.mockImplementation((_, param) => (param === 'id' ? value : null))
}

describe('GET /api/notifications/[id]', () => {
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

    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)

    setNotificationId('42')
  })

  it('should return 401 if user is not authenticated', async () => {
    const { serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: expect.stringContaining('Unauthorized'),
    })
  })

  it('should return 400 if notification ID is missing', async () => {
    setNotificationId(null)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Notification ID is required',
    })
  })

  it('should return 500 when staff lookup fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult(null, new Error('boom')),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch staff ID',
    })
  })

  it('should return 404 when notification does not belong to the user', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10 }),
      notifications: [createResult(null, new Error('not found'))],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Notification not found',
    })
  })

  it('should return 500 when marking notification as read fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10 }),
      notifications: [
        createResult({ id: 42, staff_id: 10 }),
        createResult(null, new Error('update failed')),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to mark notification as read',
    })
  })

  it('should mark the notification as read successfully', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10 }),
      notifications: [
        createResult({ id: 42, staff_id: 10 }),
        createResult(null),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response).toEqual({
      success: true,
      message: 'Notification marked as read',
    })
    expect(supabase.from).toHaveBeenCalledWith('notifications')
  })

  it('should handle unexpected errors in catch block', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10 }),
    })

    // Make the update throw an unexpected error (without statusCode)
    const mockUpdate = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error without statusCode')
      }),
    }

    supabase.from.mockImplementation((table: string) => {
      if (table === 'staff') {
        return createQuery(createResult({ id: 10 }))
      }
      if (table === 'notifications') {
        return mockUpdate
      }
      return createQuery(createResult(null))
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  })
})


