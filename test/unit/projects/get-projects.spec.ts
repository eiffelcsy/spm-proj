import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import type { H3Event } from 'h3'

import indexHandler from '../../../server/api/projects/index.get'
import activeHandler from '../../../server/api/projects/active.get'

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

  ;['select', 'eq', 'is', 'order', 'in'].forEach(chainable)

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

let serverSupabaseServiceRoleMock: ReturnType<typeof vi.fn>
let serverSupabaseUserMock: ReturnType<typeof vi.fn>

beforeAll(async () => {
  const module = await import('#supabase/server')
  serverSupabaseServiceRoleMock = vi.mocked(module.serverSupabaseServiceRole)
  serverSupabaseUserMock = vi.mocked(module.serverSupabaseUser)
})

describe.each([
  ['GET /api/projects', indexHandler],
  ['GET /api/projects/active', activeHandler],
])('%s', (_suiteName, handler) => {
  let mockEvent: Partial<H3Event>
  let supabase: any

  function setSupabaseResponses(responses: Record<string, ResponseEntry | ResponseEntry[]>) {
    supabase = createSupabaseMock(responses)
    serverSupabaseServiceRoleMock.mockResolvedValue(supabase)
    return supabase
  }

  beforeEach(() => {
    mockGetVisibleStaffIds.mockReset()
    serverSupabaseServiceRoleMock.mockReset()
    serverSupabaseUserMock.mockReset()

    mockGetVisibleStaffIds.mockResolvedValue([101, 102])
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
      statusMessage: expect.stringContaining('Not authenticated'),
    })
  })

  it('throws 500 when staff lookup fails', async () => {
    setSupabaseResponses({
      staff: createResult(null, { message: 'Staff lookup failed' }),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Staff lookup failed',
    })
  })

  it('throws 403 when staff record is missing', async () => {
    setSupabaseResponses({
      staff: createResult(null, null),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'No staff record found for authenticated user.',
    })
  })

  it('returns an empty array when user has no department', async () => {
    const supabaseInstance = setSupabaseResponses({
      staff: createResult({ id: 7, department: null }),
    })

    const response = await handler(mockEvent as any)

    expect(response).toEqual([])
    expect(mockGetVisibleStaffIds).not.toHaveBeenCalled()
    expect(supabaseInstance.from).toHaveBeenCalledTimes(1)
  })

  it('returns an empty array when no visible staff IDs are found', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([])
    const supabaseInstance = setSupabaseResponses({
      staff: createResult({ id: 7, department: 'Engineering' }),
    })

    const response = await handler(mockEvent as any)

    expect(response).toEqual([])
    expect(mockGetVisibleStaffIds).toHaveBeenCalledTimes(1)
    expect(supabaseInstance.from).toHaveBeenCalledTimes(1)
  })

  it('throws 500 when project fetch fails', async () => {
    setSupabaseResponses({
      staff: createResult({ id: 7, department: 'Engineering' }),
      projects: createResult(null, { message: 'Project fetch failed' }),
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Project fetch failed',
    })
  })

  it('returns an empty array when there are no projects', async () => {
    setSupabaseResponses({
      staff: createResult({ id: 7, department: 'Engineering' }),
      projects: createResult([]),
    })

    const response = await handler(mockEvent as any)

    expect(response).toEqual([])
  })

  it('returns only projects with assignees in visible departments', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([101, 102])

    const projects = [
      { id: 1, name: 'Visible Project' },
      { id: 2, name: 'Assignee Error Project' },
      { id: 3, name: 'Hidden Project' },
      { id: 4, name: 'Tasks Error Project' },
    ]

    setSupabaseResponses({
      staff: createResult({ id: 7, department: 'Engineering' }),
      projects: createResult(projects),
      tasks: [
        createResult([{ id: 11 }]),
        createResult([{ id: 21 }]),
        createResult([{ id: 31 }]),
        createResult(null, { message: 'Tasks fetch failed' }),
      ],
      task_assignees: [
        createResult([{ assigned_to_staff_id: 101 }]),
        createResult(null, { message: 'Assignee fetch failed' }),
        createResult([{ assigned_to_staff_id: 999 }]),
      ],
    })

    const response = await handler(mockEvent as any)

    expect(response).toEqual([
      { id: 1, name: 'Visible Project' },
    ])
  })

  it('returns projects owned by visible staff (active.get.ts continue path)', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([101, 102])

    const projects = [
      { id: 1, name: 'Owned Project', owner_id: 101 },
      { id: 2, name: 'Other Project', owner_id: 999 },
    ]

    setSupabaseResponses({
      staff: createResult({ id: 7, department: 'Engineering' }),
      projects: createResult(projects),
    })

    const response = await activeHandler(mockEvent as any)

    // Project 1 should be included because owner_id (101) is in visibleStaffIds
    // Project 2 should not be included because owner_id (999) is not in visibleStaffIds
    expect(response).toEqual([
      { id: 1, name: 'Owned Project', owner_id: 101 },
    ])
  })
})


