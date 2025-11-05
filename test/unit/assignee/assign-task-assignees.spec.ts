import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/assignee/index.post'
import type { H3Event } from 'h3'

// Mock the Supabase server functions
vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
  serverSupabaseUser: vi.fn(),
}))

// Mock h3 functions similar to other tests
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    defineEventHandler: (fn: any) => fn,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('POST /api/assignee - Assign assignees to a task', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { readBody } = await import('h3')
    mockReadBody = vi.mocked(readBody)

    // Ensure createError exists on global for handlers that rely on Nitro global
    const { createError } = await import('h3')
    ;(global as any).createError = createError

    // Setup mock event
    mockEvent = {
      node: { req: {}, res: {} }
    } as any

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn()
    }
  })

  it('should insert assignee mappings successfully', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')

    // Authenticated user lookup -> staff id 10
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)

    const mockStaffQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 10 }, error: null })
    }

    const insertedRows = [{ task_id: 1, assigned_to_staff_id: 2, assigned_by_staff_id: 10 }]
    const mockAssigneesInsert = {
      insert: vi.fn().mockResolvedValue({ data: insertedRows, error: null })
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'staff') return mockStaffQuery
      if (table === 'task_assignees') return mockAssigneesInsert
      return {}
    })

    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: [2]
    })

    const response = await handler(mockEvent as any)

    expect(response.success).toBe(true)
    expect(response.inserted).toEqual(insertedRows)
    expect(mockSupabase.from).toHaveBeenCalledWith('task_assignees')
  })

  it('should return 400 when task_id is missing', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      assignee_ids: [1, 2]
    })

    try {
      await handler(mockEvent as any)
      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.statusCode).toBe(400)
      expect(error.statusMessage).toBe('task_id is required')
    }
  })

  it('should return 400 when no assignees provided', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: []
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'At least one assignee is required'
    })
  })

  it('should enforce maximum 5 assignees', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: [1, 2, 3, 4, 5, 6]
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Maximum 5 assignees allowed per task'
    })
  })

  it('should require authentication when assigned_by is not provided', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue(null as any)
    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: [2]
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Not authenticated'
    })
  })

  it('should return 403 when no staff record found for user', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)

    const mockStaffQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'staff') return mockStaffQuery
      return {}
    })

    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: [2]
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'No staff record found for authenticated user.'
    })
  })

  it('should bubble up DB insert errors', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)

    const mockStaffQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 9 }, error: null })
    }

    const mockAssigneesInsert = {
      insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed to insert' } })
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'staff') return mockStaffQuery
      if (table === 'task_assignees') return mockAssigneesInsert
      return {}
    })

    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: [2]
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to insert'
    })
  })

  it('should treat non-array assignee_ids as empty and throw 400', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 9 }, error: null })
    }))

    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: '2'
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'At least one assignee is required'
    })
  })

  it('should return 500 when staff lookup fails', async () => {
    const { serverSupabaseServiceRole, serverSupabaseUser } = await import('#supabase/server')
    vi.mocked(serverSupabaseUser).mockResolvedValue({ id: 'user-123' } as any)

    const mockStaffQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'staff') return mockStaffQuery
      return {
        insert: vi.fn()
      }
    })

    vi.mocked(serverSupabaseServiceRole).mockResolvedValue(mockSupabase as any)

    mockReadBody.mockResolvedValue({
      task_id: 1,
      assignee_ids: [2]
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'boom'
    })
  })
})


