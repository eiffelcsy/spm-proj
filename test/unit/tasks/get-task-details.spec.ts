import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/tasks/[id]/index.get'
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

  ;['select', 'eq', 'is', 'in', 'order', 'limit', 'update'].forEach(chainable)

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

function setTaskId(value: string | null) {
  mockGetRouterParam.mockImplementation((_, key) => (key === 'id' ? value : null))
}

describe('GET /api/tasks/[id]', () => {
  let mockEvent: Partial<H3Event>
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    mockGetRouterParam.mockReset()
    mockGetVisibleStaffIds.mockReset()

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

    setTaskId('1')
    mockGetVisibleStaffIds.mockResolvedValue([10])
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
    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering', is_manager: false, is_admin: false }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    setTaskId(null)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Task ID is required',
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

  it('should return 404 when task is not found', async () => {
    const notFoundError = new Error('not found') as any
    notFoundError.code = 'PGRST116'

    supabase = createSupabaseMock({
      staff: createResult({ id: 10, department: 'Engineering', is_manager: false, is_admin: false }),
      tasks: createResult(null, notFoundError),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Task not found',
    })
  })

  it('should return 403 when no visible assignees are found', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([])

    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering', is_manager: false, is_admin: false }),
        createResult([{ id: 20, fullname: 'Other User' }]),
      ],
      tasks: [
        createResult({ id: 1, creator_id: null, project_id: null, parent_task_id: null }),
        createResult([]),
      ],
      task_assignees: createResult([{ assigned_to_staff_id: 20, assigned_by_staff_id: null }]),
      activity_timeline: createResult([]),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'You do not have permission to view this task',
    })
  })

  it('should return task details when user has access', async () => {
    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering', is_manager: false, is_admin: false }),
        createResult([{ id: 10, fullname: 'Current User' }]),
      ],
      tasks: [
        createResult({
          id: 1,
          creator_id: null,
          project_id: null,
          parent_task_id: null,
        }),
        createResult([]),
      ],
      task_assignees: createResult([{ assigned_to_staff_id: 10, assigned_by_staff_id: null }]),
      activity_timeline: createResult([]),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.task).toMatchObject({
      id: 1,
      assignees: [
        expect.objectContaining({
          assigned_to: expect.objectContaining({ id: 10, fullname: 'Current User' }),
        }),
      ],
      permissions: {
        canEdit: true,
        canDelete: true,
      },
    })
  })

  it('should return 500 when activity timeline fetch fails', async () => {
    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering', is_manager: true, is_admin: false }),
        createResult([{ id: 10, fullname: 'Current User' }]),
      ],
      tasks: [
        createResult({
          id: 1,
          creator_id: null,
          project_id: null,
          parent_task_id: null,
        }),
        createResult([]),
      ],
      task_assignees: createResult([{ assigned_to_staff_id: 10, assigned_by_staff_id: null }]),
      activity_timeline: createResult(null, { message: 'timeline failed' }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch activity timeline',
    })
  })

  it('should include subtasks with creators and assignees', async () => {
    mockGetVisibleStaffIds.mockResolvedValue([10, 13])

    supabase = createSupabaseMock({
      staff: [
        createResult({ id: 10, department: 'Engineering', is_manager: true, is_admin: false }),
        createResult({ id: 5, fullname: 'Main Creator' }),
        createResult([{ id: 10, fullname: 'Current User' }, { id: 11, fullname: 'Manager User' }]),
        createResult({ id: 12, fullname: 'Sub Creator' }),
        createResult([{ id: 13, fullname: 'Sub Assignee' }, { id: 11, fullname: 'Manager User' }]),
      ],
      tasks: [
        createResult({
          id: 1,
          creator_id: 5,
          project_id: 3,
          parent_task_id: null,
        }),
        createResult([{ id: 100, creator_id: 12, parent_task_id: 1, title: 'Subtask A' }]),
      ],
      projects: createResult({ id: 3, name: 'Project X' }),
      task_assignees: [
        createResult([{ assigned_to_staff_id: 10, assigned_by_staff_id: 11 }]),
        createResult([{ assigned_to_staff_id: 13, assigned_by_staff_id: 11 }]),
      ],
      activity_timeline: createResult([{ id: 1, action: 'update', staff_id: 11 }]),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.task).toMatchObject({
      project: { id: 3, name: 'Project X' },
      creator: { id: 5, fullname: 'Main Creator' },
      assignees: [
        expect.objectContaining({
          assigned_to: expect.objectContaining({ id: 10, fullname: 'Current User' }),
          assigned_by: expect.objectContaining({ id: 11, fullname: 'Manager User' }),
        }),
      ],
      subtasks: [
        expect.objectContaining({
          id: 100,
          creator: { id: 12, fullname: 'Sub Creator' },
          assignees: [
            expect.objectContaining({
              assigned_to: expect.objectContaining({ id: 13, fullname: 'Sub Assignee' })
            })
          ]
        })
      ],
      permissions: {
        canEdit: true,
        canDelete: true,
      },
      history: expect.any(Array)
    })
  })
})


