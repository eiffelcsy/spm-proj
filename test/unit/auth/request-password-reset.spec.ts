import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/forgot-password/forgot-password.post'
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

describe('Request password reset', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any
  let mockReadBody: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const { readBody, createError } = await import('h3')
    mockReadBody = vi.mocked(readBody)
    ;(global as any).createError = createError

    mockEvent = {
      node: { req: {}, res: {} }
    } as any

    mockSupabase = {
      auth: {
        resetPasswordForEmail: vi.fn(),
      }
    }
  })

  it('requests a reset email successfully', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'user@example.com' })
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })

    const response = await handler(mockEvent as any)

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'http://localhost:3000/update-password',
    })
    expect(response).toEqual({
      success: true,
      message: 'Password reset link sent to your email.',
    })
  })

  it('throws TypeError when Supabase client is unavailable', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(null)

    mockReadBody.mockResolvedValue({ email: 'user@example.com' })

    await expect(handler(mockEvent as any)).rejects.toThrow(/Cannot read properties of null/)
  })

  it('surfaces Supabase errors as 400 responses', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    mockReadBody.mockResolvedValue({ email: 'missing@example.com' })
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    })

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'User not found',
    })
  })
})



