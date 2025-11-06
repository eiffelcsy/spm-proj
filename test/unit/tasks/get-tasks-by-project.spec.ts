import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/tasks/by-project.get'
import type { H3Event } from 'h3'

const mockDefineEventHandler = vi.hoisted(() => (fn: any) => fn)
const mockGetQuery = vi.hoisted(() => vi.fn())
const mockCreateError = vi.hoisted(() => (error: any) => {
  const err = new Error(error.statusMessage) as any
  err.statusCode = error.statusCode
  err.statusMessage = error.statusMessage
  if (error.data !== undefined) {
    err.data = error.data
  }
  return err
})

const mockGetVisibleStaffIds = vi.hoisted(() => vi.fn())

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    defineEventHandler: mockDefineEventHandler,
    getQuery: mockGetQuery,
    createError: mockCreateError,
  }
})

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

  ;['select', 'eq', 'is', 'in', 'order'].forEach(chainable)

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

describe('GET /api/tasks/by-project', () => {
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

    mockGetQuery.mockReturnValue({ project_id: '5' })
    mockGetVisibleStaffIds.mockResolvedValue([10])

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

  it('should return 400 when project_id is missing', async () => {
    mockGetQuery.mockReturnValue({})

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'project_id query parameter is required',
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

  it('should return 500 when project verification fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult(null, { message: 'boom' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to verify project',
    })
  })

  it('should return 404 when project does not exist', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult(null),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Project not found',
    })
  })

  it('should return empty result when user cannot see any staff', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([])

    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult({ id: 5 }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response).toEqual({ tasks: [], count: 0 })
  })

  it('should return 500 when tasks query fails', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult({ id: 5 }),
      tasks: createResult(null, { message: 'boom' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  })

  it('should return filtered project tasks the user can see', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering' }),
        createResult({ id: 2, fullname: 'Creator User' }),
        createResult([{ id: 10, fullname: 'Assignee User' }]),
      ],
      projects: [
        createResult({ id: 5 }),
        createResult({ id: 5, name: 'Project X' }),
      ],
      tasks: createResult([
        {
          id: 1,
          project_id: 5,
          creator_id: 2,
          parent_task_id: null,
        },
      ]),
      task_assignees: [
        createResult([{ task_id: 1, assigned_to_staff_id: 10 }]),
        createResult([{ assigned_to_staff_id: 10, assigned_by_staff_id: null }]),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.count).toBe(1)
    expect(response.tasks[0]).toMatchObject({
      id: 1,
      creator: { id: 2, fullname: 'Creator User' },
      project: { id: 5, name: 'Project X' },
    })
    expect(response.tasks[0].assignees[0].assigned_to).toMatchObject({ id: 10, fullname: 'Assignee User' })
  })

  it('should handle assignee fetch error', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult({ id: 5 }),
      tasks: createResult([
        {
          id: 1,
          project_id: 5,
          creator_id: 2,
          parent_task_id: null,
        },
      ]),
      task_assignees: createResult(null, { message: 'Assignee fetch failed' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  })

  it('should return empty result when no visible tasks', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult({ id: 5 }),
      tasks: createResult([
        {
          id: 1,
          project_id: 5,
          creator_id: 2,
          parent_task_id: null,
        },
      ]),
      task_assignees: createResult([{ task_id: 1, assigned_to_staff_id: 20 }]), // Different staff ID
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response).toEqual({ tasks: [], count: 0 })
  })

  it('should handle task without creator_id', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering' }),
        createResult([{ id: 10, fullname: 'Assignee User' }]),
      ],
      projects: [
        createResult({ id: 5 }),
        createResult({ id: 5, name: 'Project X' }),
      ],
      tasks: createResult([
        {
          id: 1,
          project_id: 5,
          creator_id: null,
          parent_task_id: null,
        },
      ]),
      task_assignees: [
        createResult([{ task_id: 1, assigned_to_staff_id: 10 }]),
        createResult([{ assigned_to_staff_id: 10, assigned_by_staff_id: null }]),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.count).toBe(1)
    expect(response.tasks[0].creator).toBeNull()
  })

  it('should handle task without project_id', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering' }),
        createResult({ id: 2, fullname: 'Creator User' }),
        createResult([{ id: 10, fullname: 'Assignee User' }]),
      ],
      projects: createResult({ id: 5 }),
      tasks: createResult([
        {
          id: 1,
          project_id: null,
          creator_id: 2,
          parent_task_id: null,
        },
      ]),
      task_assignees: [
        createResult([{ task_id: 1, assigned_to_staff_id: 10 }]),
        createResult([{ assigned_to_staff_id: 10, assigned_by_staff_id: null }]),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.count).toBe(1)
    expect(response.tasks[0].project).toBeNull()
  })

  it('should handle PGRST116 error code when fetching tasks', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult({ id: 5 }),
      tasks: createResult(null, { code: 'PGRST116' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response).toEqual({ tasks: [], count: 0 })
  })

  it('should handle error when fetching tasks', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult({ id: 5 }),
      tasks: createResult(null, { message: 'Database error', code: 'OTHER_ERROR' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  })

  it('should handle error when fetching task assignees', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10])

    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering' }),
      projects: createResult({ id: 5 }),
      tasks: createResult([
        {
          id: 1,
          project_id: 5,
          creator_id: 2,
          parent_task_id: null,
        },
      ]),
      task_assignees: createResult(null, { message: 'Assignee fetch error' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  })
})


