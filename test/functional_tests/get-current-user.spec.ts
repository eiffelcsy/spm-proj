import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../server/api/user/me.get'
import type { H3Event } from 'h3'

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

function createQuery<T>(response: QueryResponse<T>) {
  const promise = Promise.resolve(response)
  const builder: any = {}

  const chainable = (method: string) => {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  ;['select', 'eq'].forEach(chainable)

  builder.single = vi.fn().mockResolvedValue(response)
  builder.maybeSingle = vi.fn().mockResolvedValue(response)

  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)

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

describe('GET /api/user/me', () => {
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
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123', email: 'user@example.com' } as any)
  })

  it('should return 401 when user is not authenticated', async () => {
    const { serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: expect.stringContaining('Not authenticated'),
    })
  })

  it('should return 500 when staff query fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult(null, { message: 'Boom' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Boom',
    })
  })

  it('should return 403 when staff record is missing', async () => {
    supabase = createSupabaseMock({
      staff: createResult(null),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: expect.stringContaining('No staff record'),
    })
  })

  it('should return staff profile for authenticated user', async () => {
    supabase = createSupabaseMock({
      staff: createResult({
        id: 42,
        fullname: 'Jane Doe',
        is_manager: true,
        is_admin: false,
        department: 'Engineering',
      }),
    })

    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123', email: 'jane@example.com' } as any)

    const response = await handler(mockEvent as any)

    expect(response).toEqual({
      id: 42,
      fullname: 'Jane Doe',
      email: 'jane@example.com',
      isManager: true,
      isAdmin: false,
      department: 'Engineering',
    })
    expect(supabase.from).toHaveBeenCalledWith('staff')
  })
})


