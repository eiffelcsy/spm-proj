import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/admin/archive/index.get'
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

  ;['select', 'eq', 'is', 'not', 'order', 'in'].forEach(chainable)

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
    auth: {
      admin: {
        listUsers: vi.fn(),
      },
    },
  }
}

describe('GET /api/admin/archive', () => {
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

    ;(global as any).createError = mockCreateError

    supabase = createSupabaseMock({})

    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-1' } as any)
  })

  it('should return 401 when user is not authenticated', async () => {
    const { serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Not authenticated',
    })
  })

  it('should surface staff lookup errors', async () => {
    supabase = createSupabaseMock({
      staff: createResult(null, new Error('staff failure')),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'staff failure',
    })
  })

  it('should forbid non-admin staff', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 10, is_admin: false }),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied. Admin privileges required.',
    })
  })

  it('should propagate archived task query errors', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 1, is_admin: true }),
      tasks: createResult(null, new Error('task error')),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'task error',
    })
  })

  it('should propagate archived project query errors', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 1, is_admin: true }),
      tasks: createResult([], null),
      projects: createResult(null, new Error('project error')),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'project error',
    })
  })

  it('should propagate project lookup errors', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 1, is_admin: true }),
      tasks: createResult([
        { id: 1, title: 'T', status: 'archived', deleted_at: '2024-01-01', project_id: 3, creator_id: 9, parent_task_id: null, priority: 1 },
      ]),
      projects: [
        createResult([{ id: 3, name: 'Archived Project', status: 'archived', priority: 1, deleted_at: '2024-01-02', owner_id: 2, created_at: '2023-01-01' }]),
        createResult(null, new Error('lookup failed')),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to load project details for archived tasks.',
    })
  })

  it('should return archived tasks and projects with relations', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 1, is_admin: true }),
      tasks: createResult([
        {
          id: 1,
          title: 'Old Task',
          status: 'archived',
          deleted_at: '2024-01-01T00:00:00Z',
          project_id: 3,
          creator_id: 9,
          parent_task_id: null,
          priority: 5,
        },
        {
          id: 2,
          title: 'Orphan Task',
          status: 'archived',
          deleted_at: '2024-01-02T00:00:00Z',
          project_id: null,
          creator_id: 9,
          parent_task_id: null,
          priority: 3,
        },
      ]),
      projects: [
        createResult([
          {
            id: 3,
            name: 'Archived Project',
            status: 'archived',
            priority: 1,
            deleted_at: '2024-01-01T00:00:00Z',
            owner_id: 2,
            created_at: '2023-01-01T00:00:00Z',
          },
        ]),
        createResult([
          { id: 3, name: 'Archived Project', deleted_at: '2024-01-01T00:00:00Z' },
        ]),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.tasks).toHaveLength(2)
    expect(response.tasks[0]).toMatchObject({
      id: 1,
      project: { id: 3, name: 'Archived Project' },
    })
    expect(response.tasks[1]).toMatchObject({
      id: 2,
      project: null,
    })

    expect(response.projects).toHaveLength(1)
    expect(response.projects[0]).toMatchObject({
      id: 3,
      task_count: 1,
    })
  })

  it('should tolerate missing project lookups and default project task counts to zero', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 1, is_admin: true }),
      tasks: createResult([
        {
          id: 1,
          title: 'Old Task',
          status: 'archived',
          deleted_at: '2024-01-01T00:00:00Z',
          project_id: 3,
          creator_id: 9,
          parent_task_id: null,
          priority: 5,
        },
        {
          id: 2,
          title: 'Missing Project Task',
          status: 'archived',
          deleted_at: '2024-01-03T00:00:00Z',
          project_id: 4,
          creator_id: 9,
          parent_task_id: null,
          priority: 1,
        },
      ]),
      projects: [
        createResult([
          {
            id: 3,
            name: 'Archived Project',
            status: 'archived',
            priority: 1,
            deleted_at: '2024-01-01T00:00:00Z',
            owner_id: 2,
            created_at: '2023-01-01T00:00:00Z',
          },
          {
            id: 5,
            name: 'Unrelated Project',
            status: 'archived',
            priority: 2,
            deleted_at: '2024-01-05T00:00:00Z',
            owner_id: 4,
            created_at: '2023-02-01T00:00:00Z',
          },
        ]),
        createResult([
          { id: 3, name: 'Archived Project', deleted_at: '2024-01-01T00:00:00Z' },
        ]),
      ],
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.tasks).toHaveLength(2)
    expect(response.tasks.find((task: any) => task.id === 1)).toMatchObject({
      project: { id: 3, name: 'Archived Project' },
    })
    expect(response.tasks.find((task: any) => task.id === 2)).toMatchObject({
      id: 2,
      project: null,
    })

    const archivedProject = response.projects.find((project: any) => project.id === 3)
    const unrelatedProject = response.projects.find((project: any) => project.id === 5)

    expect(archivedProject).toMatchObject({ task_count: 1 })
    expect(unrelatedProject).toMatchObject({ task_count: 0 })
  })

  it('should skip project lookup when no archived tasks reference a project', async () => {
    supabase = createSupabaseMock({
      staff: createResult({ id: 1, is_admin: true }),
      tasks: createResult([
        {
          id: 1,
          title: 'Archived Orphan',
          status: 'archived',
          deleted_at: '2024-03-01T00:00:00Z',
          project_id: null,
          creator_id: 4,
          parent_task_id: null,
          priority: 2,
        },
      ]),
      projects: createResult([], null),
    })

    const { serverSupabaseServiceRole } = await import('#supabase/server')
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response.tasks).toHaveLength(1)
    expect(response.tasks[0]).toMatchObject({ id: 1, project: null })
    expect(response.projects).toEqual([])

    const projectCalls = supabase.from.mock.calls.filter(([table]) => table === 'projects')
    expect(projectCalls).toHaveLength(1)
  })
})
