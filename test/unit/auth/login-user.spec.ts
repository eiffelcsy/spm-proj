import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/login/login.post'
import type { H3Event } from 'h3'

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
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

describe('Login user', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const { readBody } = await import('h3')
    mockReadBody = vi.mocked(readBody)

    const { createError } = await import('h3')
    ;(global as any).createError = createError

    mockEvent = {
      node: { req: {}, res: {} }
    } as any

    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn()
      }
    }
  })

  it('returns user and session on successful login', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({
      email: 'user@example.com',
      password: 'StrongPassword123',
    })

    const authResponse = {
      data: {
        user: { id: 'user-1', email: 'user@example.com' },
        session: { access_token: 'token', refresh_token: 'refresh' },
      },
      error: null,
    }
    mockSupabase.auth.signInWithPassword.mockResolvedValue(authResponse)

    const result = await handler(mockEvent as any)

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'StrongPassword123',
    })
    expect(result).toEqual({
      success: true,
      user: authResponse.data.user,
      session: authResponse.data.session,
    })
  })

  it('throws 400 when email or password missing', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: '', password: '' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Email and password are required.',
    })
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('rejects invalid email formats', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'not-an-email', password: 'secret' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Please enter a valid email address.',
    })
  })

  it('throws 500 when Supabase client fails to initialize', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(null)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'secret' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    })
  })

  it('translates Supabase auth errors to 401', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com', password: 'wrong' })
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login' },
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Invalid credentials. Please check your email and password.',
    })
  })
})



