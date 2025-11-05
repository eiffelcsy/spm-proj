import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from '~/server/api/logout/logout.post'
import type { H3Event } from 'h3'

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(),
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    defineEventHandler: (fn: any) => fn,
    createError: (error: any) => {
      const err = new Error(error.statusMessage) as any
      err.statusCode = error.statusCode
      err.statusMessage = error.statusMessage
      return err
    },
  }
})

describe('Logout user', () => {
  let mockEvent: Partial<H3Event>
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { createError } = await import('h3')
    ;(global as any).createError = createError

    mockEvent = {
      node: { req: {}, res: {} }
    } as any

    mockSupabase = {
      auth: {
        signOut: vi.fn()
      }
    }
  })

  it('signs out and returns success', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    const response = await handler(mockEvent as any)

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    expect(response).toEqual({ success: true })
  })

  it('still returns success when supabase signOut reports an error', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(mockSupabase)

    const error = { message: 'session already expired' }
    mockSupabase.auth.signOut.mockResolvedValue({ error })

    const response = await handler(mockEvent as any)

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    expect(response).toEqual({ success: true })
  })

  it('throws 500 when Supabase client is unavailable', async () => {
    const { serverSupabaseClient } = await import('#supabase/server')
    serverSupabaseClient.mockResolvedValue(null)

    await expect(handler(mockEvent as any)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    })
  })
})



