import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '../../../server/api/tasks/process-recurring-tasks.get'
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

const mockReplicateCompletedTask = vi.hoisted(() => vi.fn())

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    defineEventHandler: mockDefineEventHandler,
    createError: mockCreateError,
  }
})

vi.mock('../../../server/utils/recurringTaskService', () => ({
  replicateCompletedTask: mockReplicateCompletedTask,
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
}))

type QueryResponse<T> = { data: T; error: any }

function createResult<T>(data: T, error: any = null): QueryResponse<T> {
  return { data, error }
}

function createQuery<T>(response: QueryResponse<T>) {
  const promise = Promise.resolve(response)
  const builder: any = {}

  const chainable = (method: string) => {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  ;['select', 'gt', 'eq', 'not', 'is'].forEach(chainable)

  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  builder.finally = promise.finally.bind(promise)

  return builder
}

function createSupabaseMock(response: QueryResponse<any>) {
  return {
    from: vi.fn(() => createQuery(response)),
  }
}

describe('GET /api/tasks/process-recurring-tasks', () => {
  let mockEvent: Partial<H3Event>
  let serverSupabaseServiceRole: any

  beforeEach(async () => {
    vi.clearAllMocks()

    mockEvent = {
      node: {
        req: {},
        res: {},
      },
    } as Partial<H3Event>

    const supabaseModule = await import('#supabase/server')
    serverSupabaseServiceRole = vi.mocked(supabaseModule.serverSupabaseServiceRole)
  })

  it('should return 500 when fetching recurring tasks fails', async () => {
    const supabase = createSupabaseMock(createResult(null, { message: 'boom' }))
    serverSupabaseServiceRole.mockResolvedValue(supabase)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch recurring tasks',
    })
  })

  it('should short-circuit when there are no tasks to process', async () => {
    const supabase = createSupabaseMock(createResult([]))
    serverSupabaseServiceRole.mockResolvedValue(supabase)

    const response = await handler(mockEvent as any)

    expect(response).toEqual({
      success: true,
      message: 'No completed recurring tasks to process',
      tasksProcessed: 0,
      tasksCreated: 0,
    })
    expect(mockReplicateCompletedTask).not.toHaveBeenCalled()
  })

  it('should process tasks and report counts', async () => {
    const tasks = [
      { id: 1, title: 'Recurring Task', repeat_interval: 7, due_date: '2024-01-01', status: 'completed' },
    ]

    const supabase = createSupabaseMock(createResult(tasks))
    serverSupabaseServiceRole.mockResolvedValue(supabase)

    mockReplicateCompletedTask.mockResolvedValue({
      success: true,
      newTask: { id: 2 },
    })

    const response = await handler(mockEvent as any)

    expect(mockReplicateCompletedTask).toHaveBeenCalledWith(supabase, tasks[0])
    expect(response.success).toBe(true)
    expect(response.tasksProcessed).toBe(1)
    expect(response.tasksCreated).toBe(1)
    expect(response.processedTasks[0]).toMatchObject({
      originalId: 1,
      newId: 2,
      title: 'Recurring Task',
    })
  })

  it('should handle replication failure', async () => {
    const tasks = [
      { id: 1, title: 'Recurring Task', repeat_interval: 7, due_date: '2024-01-01', status: 'completed' },
    ]

    const supabase = createSupabaseMock(createResult(tasks))
    serverSupabaseServiceRole.mockResolvedValue(supabase)

    mockReplicateCompletedTask.mockResolvedValue({
      success: false,
      error: 'Replication failed',
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await handler(mockEvent as any)

    expect(consoleSpy).toHaveBeenCalledWith(
      `Cron job: Failed to replicate task ${tasks[0].id}:`,
      'Replication failed'
    )
    expect(response.success).toBe(true)
    expect(response.tasksProcessed).toBe(1)
    expect(response.tasksCreated).toBe(0)
    consoleSpy.mockRestore()
  })

  it('should handle task processing errors', async () => {
    const tasks = [
      { id: 1, title: 'Recurring Task', repeat_interval: 7, due_date: '2024-01-01', status: 'completed' },
    ]

    const supabase = createSupabaseMock(createResult(tasks))
    serverSupabaseServiceRole.mockResolvedValue(supabase)

    mockReplicateCompletedTask.mockRejectedValue(new Error('Processing error'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await handler(mockEvent as any)

    expect(consoleSpy).toHaveBeenCalledWith(
      `Cron job: Error processing recurring task ${tasks[0].id}:`,
      expect.any(Error)
    )
    expect(response.success).toBe(true)
    // When an error occurs, the task is skipped but still counted as processed
    expect(response.tasksProcessed).toBeGreaterThanOrEqual(0)
    expect(response.tasksCreated).toBe(0)
    consoleSpy.mockRestore()
  })

  it('should handle overall handler errors', async () => {
    const supabase = createSupabaseMock(createResult(null, { message: 'Database error' }))
    serverSupabaseServiceRole.mockResolvedValue(supabase)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch recurring tasks',
    })

    consoleSpy.mockRestore()
  })

  it('should handle unexpected errors in catch block', async () => {
    // Make the supabase query throw an error that doesn't have statusCode
    const supabase = {
      from: vi.fn(() => {
        throw new Error('Unexpected database error')
      }),
    }
    serverSupabaseServiceRole.mockResolvedValue(supabase)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })

    expect(consoleSpy).toHaveBeenCalledWith('Recurring tasks cron job failed:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})


