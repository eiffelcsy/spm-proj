import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/update-password/update-password.post'
import type { H3Event } from 'h3'

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    defineEventHandler: (fn: any) => fn,
    readBody: vi.fn(),
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('POST /api/update-password', () => {
  let mockEvent: Partial<H3Event>
  let mockReadBody: any
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    mockEvent = { node: { req: {}, res: {} } } as any

    const { readBody } = await import('h3')
    mockReadBody = vi.mocked(readBody)

    mockSupabase = {
      auth: {
        updateUser: vi.fn(),
      },
    }

    const { serverSupabaseClient } = await import('#supabase/server')
    vi.mocked(serverSupabaseClient).mockResolvedValue(mockSupabase)
  })

  it('should require access token', async () => {
    mockReadBody.mockResolvedValue({ password: 'newpass123', confirm_password: 'newpass123' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Access token is required.',
    })
  })

  it('should require password', async () => {
    mockReadBody.mockResolvedValue({ access_token: 'token', password: '', confirm_password: '' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'New password is required.',
    })
  })

  it('should require passwords to match', async () => {
    mockReadBody.mockResolvedValue({ access_token: 'token', password: 'abc12345', confirm_password: '12345abc' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Passwords do not match.',
    })
  })

  it('should enforce minimum password length', async () => {
    mockReadBody.mockResolvedValue({ access_token: 'token', password: 'short', confirm_password: 'short' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Password must be at least 8 characters long.',
    })
  })

  it('should return 500 if supabase client fails to initialize', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    vi.mocked(serverSupabaseClient).mockResolvedValue(null)

    mockReadBody.mockResolvedValue({ access_token: 'token', password: 'password123', confirm_password: 'password123' })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    })
  })

  it('should propagate supabase errors', async () => {
    mockReadBody.mockResolvedValue({ access_token: 'token', password: 'password123', confirm_password: 'password123' })
    mockSupabase.auth.updateUser.mockResolvedValue({ error: { status: 400, message: 'invalid token' } })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'invalid token',
    })
  })

  it('should update password successfully', async () => {
    mockReadBody.mockResolvedValue({ access_token: 'token', password: 'password123', confirm_password: 'password123' })
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null })

    const response = await handler(mockEvent as any)

    expect(response).toEqual({ success: true, message: 'Password updated successfully.' })
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'password123',
      access_token: 'token',
    })
  })
})


