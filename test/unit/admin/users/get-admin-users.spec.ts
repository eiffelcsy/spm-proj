import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/admin/users/index.get'
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

  ;['select', 'eq', 'order'].forEach(chainable)

  builder.single = vi.fn().mockResolvedValue(response)
  builder.maybeSingle = vi.fn().mockResolvedValue(response)

  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)

  return builder
}

function createSupabaseMock(responses: Record<string, ResponseEntry | ResponseEntry[]>, listUsers?: () => any) {
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
    auth: {
      admin: {
        listUsers: vi.fn(listUsers ?? (() => ({ data: { users: [] }, error: null }))),
      },
    },
  }
}

describe('GET /api/admin/users', () => {
  let mockEvent: Partial<H3Event>
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    mockEvent = { node: { req: {}, res: {} } } as Partial<H3Event>

    ;(global as any).createError = mockCreateError

    supabase = createSupabaseMock({})

    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'admin-user' } as any)
  })

  it('should return 401 when user is not authenticated', async () => {
    const { serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Not authenticated',
    })
  })

  it('should propagate admin staff lookup errors', async () => {
    supabase = createSupabaseMock({
      staff: createResult(null, new Error('staff error')),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'staff error',
    })
  })

  it('should return 403 when requester is not admin', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 1, is_admin: false }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied. Admin privileges required.',
    })
  })

  it('should propagate staff fetch errors', async () => {
    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 1, is_admin: true }),
        createResult(null, new Error('list error')),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'list error',
    })
  })

  it('should propagate auth admin errors', async () => {
    const failingSupabase = createSupabaseMock(
      {
        staff: [
          createResult({ id: 1, is_admin: true }),
          createResult([
            {
              id: 10,
              fullname: 'Alice',
              user_id: 'user-10',
              contact_number: null,
              is_manager: false,
              is_admin: false,
              designation: null,
              department: null,
              created_at: '2024-01-01T00:00:00Z',
            },
          ]),
        ],
      },
      () => ({ data: null, error: new Error('listUsers failed') })
    )

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(failingSupabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'listUsers failed',
    })
  })

  it('should return staff members with email data', async () => {
    supabase = createSupabaseMock(
      {
        staff: [
          createResult({ id: 1, is_admin: true }),
          createResult([
            {
              id: 10,
              fullname: 'Alice',
              user_id: 'user-10',
              contact_number: '123',
              is_manager: true,
              is_admin: false,
              designation: 'Lead',
              department: 'Engineering',
              created_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 11,
              fullname: 'Bob',
              user_id: 'user-11',
              contact_number: null,
              is_manager: false,
              is_admin: true,
              designation: null,
              department: 'Support',
              created_at: '2024-02-01T00:00:00Z',
            },
          ]),
        ],
      },
      () => ({
        data: {
          users: [
            { id: 'user-10', email: 'alice@example.com' },
            { id: 'user-11', email: 'bob@example.com' },
          ],
        },
        error: null,
      })
    )

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const result = await handler(mockEvent as any)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      fullname: 'Alice',
      email: 'alice@example.com',
      staff_type: 'manager',
      is_manager: true,
      is_admin: false,
    })
    expect(result[1]).toMatchObject({
      fullname: 'Bob',
      email: 'bob@example.com',
      staff_type: 'admin',
      is_admin: true,
      department: 'Support',
    })
  })
})
