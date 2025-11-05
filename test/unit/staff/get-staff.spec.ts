import { describe, it, beforeEach, beforeAll, expect, vi } from 'vitest'
import type { H3Event } from 'h3'

import handler from '../../../server/api/staff/index.get'

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

;(globalThis as any).createError = mockCreateError

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    defineEventHandler: mockDefineEventHandler,
    createError: mockCreateError,
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

  ;['select', 'eq', 'single', 'order', 'in'].forEach(chainable)

  builder.single = vi.fn().mockResolvedValue(response)

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

  const authAdminListUsers = vi.fn().mockResolvedValue({ data: { users: [] }, error: null })

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
        listUsers: authAdminListUsers,
      },
    },
  }
}

let serverSupabaseServiceRoleMock: ReturnType<typeof vi.fn>
let serverSupabaseUserMock: ReturnType<typeof vi.fn>

beforeAll(async () => {
  const module = await import('#supabase/server')
  serverSupabaseServiceRoleMock = vi.mocked(module.serverSupabaseServiceRole)
  serverSupabaseUserMock = vi.mocked(module.serverSupabaseUser)
})

describe('GET /api/staff', () => {
  let mockEvent: Partial<H3Event>
  let supabase: any

  function setSupabaseResponses(responses: Record<string, ResponseEntry | ResponseEntry[]>) {
    supabase = createSupabaseMock(responses)
    serverSupabaseServiceRoleMock.mockResolvedValue(supabase)
    return supabase
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetVisibleStaffIds.mockReset()
    serverSupabaseServiceRoleMock.mockReset()
    serverSupabaseUserMock.mockReset()

    mockGetVisibleStaffIds.mockResolvedValue([1, 2])
    setSupabaseResponses({})
    serverSupabaseUserMock.mockResolvedValue({ id: 'user-123' } as any)

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    } as Partial<H3Event>
  })

  it('throws 401 when user is not authenticated', async () => {
    serverSupabaseUserMock.mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Unauthorized - User not authenticated',
    })
  })

  it('throws 500 when fetching current staff fails', async () => {
    setSupabaseResponses({
      staff: createResult(null, { message: 'Staff lookup failed' }),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Staff lookup failed',
    })
  })

  it('returns an empty array when no visible staff IDs', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([])

    setSupabaseResponses({
      staff: createResult({ department: 'Engineering' }),
    })

    const response = await handler(mockEvent as any)

    expect(response).toEqual([])
  })

  it('throws 500 when fetching staff list fails', async () => {
    setSupabaseResponses({
      staff: [
        createResult({ department: 'Engineering' }),
        createResult(null, { message: 'Staff fetch failed' }),
      ],
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Staff fetch failed',
    })
  })

  it('throws 500 when listing auth users fails', async () => {
    const supabaseInstance = setSupabaseResponses({
      staff: [
        createResult({ department: 'Engineering' }),
        createResult([
          { id: 1, fullname: 'Alice', user_id: 'alice-id' },
          { id: 2, fullname: 'Bob', user_id: 'bob-id' },
        ]),
      ],
    })

    supabaseInstance.auth.admin.listUsers.mockResolvedValue({ data: null, error: { message: 'List users failed' } })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'List users failed',
    })
  })

  it('returns staff with emails from auth roster', async () => {
    const staffRows = [
      { id: 1, fullname: 'Alice', user_id: 'alice-id' },
      { id: 2, fullname: 'Bob', user_id: 'bob-id' },
      { id: 3, fullname: 'Charlie', user_id: 'missing-id' },
    ]

    const supabaseInstance = setSupabaseResponses({
      staff: [
        createResult({ department: 'Engineering' }),
        createResult(staffRows),
      ],
    })

    supabaseInstance.auth.admin.listUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'alice-id', email: 'alice@example.com' },
          { id: 'bob-id', email: 'bob@example.com' },
          { id: 'someone-else', email: 'other@example.com' },
        ],
      },
      error: null,
    })

    const response = await handler(mockEvent as any)

    expect(response).toEqual([
      { id: 1, fullname: 'Alice', email: 'alice@example.com' },
      { id: 2, fullname: 'Bob', email: 'bob@example.com' },
      { id: 3, fullname: 'Charlie', email: null },
    ])
    expect(mockGetVisibleStaffIds).toHaveBeenCalledWith(expect.anything(), 'Engineering')
  })
})


