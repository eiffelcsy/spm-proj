import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/signup/signup.post'
import type { H3Event } from 'h3'

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: vi.fn(),
}))

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

describe('Signup user', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: ReturnType<typeof vi.fn>
  let mockInsert: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const { readBody, createError } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    ;(global as any).createError = createError

    mockEvent = {
      node: { req: {}, res: {} }
    } as any

    mockInsert = vi.fn()
    mockSupabase = {
      auth: {
        signUp: vi.fn(),
      },
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    }
  })

  it('creates auth user and staff record successfully', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({
      email: 'new.user@example.com',
      password: 'SecurePass123',
      fullname: 'New User',
    })

    const user = { id: 'auth-user-1', email: 'new.user@example.com' }
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user }, error: null })
    mockInsert.mockResolvedValue({ error: null })

    const response = await handler(mockEvent as any)

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new.user@example.com',
      password: 'SecurePass123',
    })
    expect(mockSupabase.from).toHaveBeenCalledWith('staff')
    expect(mockInsert).toHaveBeenCalledWith([
      {
        user_id: 'auth-user-1',
        fullname: 'New User',
        is_manager: false,
        is_admin: false,
      },
    ])
    expect(response).toEqual({
      success: true,
      message: 'Please check your email to confirm your account!',
    })
  })

  it('throws TypeError when Supabase client is unavailable', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(null)

    mockReadBody.mockResolvedValue({ email: 'a@b.com', password: 'pass', fullname: 'User' })

    await expect(handler(mockEvent as any)).rejects.toThrow(/Cannot read properties of null/)
  })

  it('propagates Supabase auth errors', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'taken@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', status: 400 },
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'An account with this email already exists. Try signing in or resetting your password.',
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('handles auth error without duplicate email message', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid password format', status: 400 },
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid password format',
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('handles auth error without message property', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { status: 500 } as any, // Error without message property
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: '',
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('handles auth error without status property', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Some error' } as any, // Error without status property
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Some error',
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('throws when signUp succeeds but no user returned', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({ data: { user: null }, error: null })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'User could not be created.',
    })
  })

  it('throws when inserting staff record fails', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'auth-id' } },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: { message: 'Insert failed' } })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Insert failed',
    })
  })

  it('handles staff insert error with foreign key violation', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'auth-id' } },
      error: null,
    })
    mockInsert.mockResolvedValue({ 
      error: { 
        code: '23503',
        message: 'violates foreign key constraint staff_user_id_fkey'
      } 
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'An account with this email already exists. Try signing in or resetting your password.',
    })
  })

  it('handles staff insert error with fk violation in message', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'auth-id' } },
      error: null,
    })
    mockInsert.mockResolvedValue({ 
      error: { 
        message: 'violates foreign key constraint STAFF_USER_ID_FKEY'
      } 
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'An account with this email already exists. Try signing in or resetting your password.',
    })
  })

  it('handles staff insert error without message property', async () => {
    const { serverSupabaseServiceRole } = await import('#supabase/server')
    serverSupabaseServiceRole.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'pass', fullname: 'User' })
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'auth-id' } },
      error: null,
    })
    mockInsert.mockResolvedValue({ 
      error: { code: '23505' } as any // Error without message property
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: '',
    })
  })
})



