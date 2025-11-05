import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/tasks/overdue.get'
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

  ;['select', 'eq', 'is', 'in', 'order', 'lt', 'neq'].forEach(chainable)

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

describe('GET /api/tasks/overdue', () => {
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
  })

  it('should return 401 if user is not authenticated', async () => {
    const { serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: expect.stringContaining('Unauthorized'),
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

  it('should return empty result when no overdue tasks exist', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      task_assignees: createResult([]),
      tasks: createResult([]),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response).toEqual({ tasks: [], count: 0 })
  })

  it('should return 500 when tasks query fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      task_assignees: createResult([{ task_id: 1 }]),
      tasks: createResult(null, { message: 'boom' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  })

  it('should return overdue tasks with enriched data', async () => {
    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering' }),
        createResult({ id: 2, fullname: 'Creator User' }),
        createResult([{ id: 10, fullname: 'Assigned User' }]),
      ],
      task_assignees: [
        createResult([{ task_id: 1 }]),
        createResult([{ assigned_to_staff_id: 10, assigned_by_staff_id: null }]),
      ],
      tasks: createResult([
        {
          id: 1,
          title: 'Overdue Task',
          creator_id: 2,
          project_id: null,
        },
      ]),
      projects: createResult(null),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.count).toBe(1)
    expect(response.tasks[0].creator).toMatchObject({ id: 2, fullname: 'Creator User' })
    expect(response.tasks[0].assignees[0].assigned_to).toMatchObject({ id: 10, fullname: 'Assigned User' })
  })
})


