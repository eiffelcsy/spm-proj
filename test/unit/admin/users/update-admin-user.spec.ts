import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/admin/users/[id].put'
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
    readBody: vi.fn(),
    getRouterParam: vi.fn(),
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

  ;['select', 'eq', 'update'].forEach(chainable)

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

describe('PUT /api/admin/users/[id]', () => {
  let mockEvent: Partial<H3Event>
  let supabase: any
  let mockReadBody: any
  let mockGetRouterParam: any

  beforeEach(async () => {
    vi.clearAllMocks()

    mockEvent = { node: { req: {}, res: {} } } as any

    ;(global as any).createError = mockCreateError

    const { readBody, getRouterParam } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    mockGetRouterParam = vi.mocked(getRouterParam)

    mockGetRouterParam.mockImplementation((_, key) => {
      if (key === 'id') return '5'
      return null
    })

    mockReadBody.mockResolvedValue({
      is_admin: true,
      is_manager: false,
    })

    supabase = createSupabaseMock({})

    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'admin-user' } as any)
  })

  it('should require staff ID parameter', async () => {
    mockGetRouterParam.mockReturnValueOnce(null)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Staff ID is required',
    })
  })

  it('should return 401 when user is not authenticated', async () => {
    const { serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Not authenticated',
    })
  })

  it('should propagate staff lookup errors', async () => {
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

  it('should forbid non-admin updates', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 2, is_admin: false }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied. Admin privileges required.',
    })
  })

  it('should block admins from modifying themselves', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 5, is_admin: true }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Cannot modify your own admin status',
    })
  })

  it('should require at least one field to update', async () => {
    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 2, is_admin: true }),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    mockReadBody.mockResolvedValue({})
    mockGetRouterParam.mockImplementation((_, key) => (key === 'id' ? '6' : null))

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'No valid fields to update',
    })
  })

  it('should propagate update errors', async () => {
    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 2, is_admin: true }),
        createResult(null, null),
      ],
      staff_update: createResult(null, new Error('update failed')),
    })

    supabase.from.mockImplementation((table: string) => {
      if (table === 'staff') {
        const entries = [
          createResult({ id: 2, is_admin: true }),
          createResult(null, null),
        ]
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue(entries.shift()) }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue(createResult(null, new Error('update failed'))) }),
          }),
        } as any
      }
      return createQuery(createResult(null))
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    mockGetRouterParam.mockImplementation((_, key) => (key === 'id' ? '6' : null))

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'update failed',
    })
  })

  it('should return 404 when no rows updated', async () => {
    const staffSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue(createResult({ id: 2, is_admin: true })) }),
    })

    const updateSelect = vi.fn().mockResolvedValue(createResult([], null))
    const updateChain = {
      eq: vi.fn().mockReturnValue({ select: updateSelect }),
    }

    supabase = {
      from: vi.fn((table: string) => {
        if (table === 'staff') {
          return {
            select: staffSelect,
            update: vi.fn().mockReturnValue(updateChain),
          }
        }
        return createQuery(createResult(null))
      }),
    }

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    mockGetRouterParam.mockImplementation((_, key) => (key === 'id' ? '6' : null))

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Staff member not found',
    })
  })

  it('should update staff member successfully', async () => {
    const staffSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue(createResult({ id: 2, is_admin: true })) }),
    })

    const updatedRow = [{ id: 6, fullname: 'Updated User', is_admin: true, is_manager: false }]

    const updateChain = {
      eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue(createResult(updatedRow, null)) }),
    }

    supabase = {
      from: vi.fn((table: string) => {
        if (table === 'staff') {
          return {
            select: staffSelect,
            update: vi.fn().mockReturnValue(updateChain),
          }
        }
        return createQuery(createResult(null))
      }),
    }

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    mockGetRouterParam.mockImplementation((_, key) => (key === 'id' ? '6' : null))
    mockReadBody.mockResolvedValue({ fullname: 'Updated User', is_admin: true })

    const response = await handler(mockEvent as any)

    expect(response).toMatchObject({
      success: true,
      message: 'Staff member updated successfully',
    })
    expect(response.data).toMatchObject({ id: 6, fullname: 'Updated User' })
  })
})
