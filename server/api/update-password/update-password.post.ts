import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

interface UpdatePasswordBody {
  access_token?: string
  password?: string
  confirm_password?: string
}

export default defineEventHandler(async (event) => {
  const { access_token, password, confirm_password } = (await readBody(event)) as UpdatePasswordBody

  if (!access_token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Access token is required.',
    })
  }

  if (!password || password.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'New password is required.',
    })
  }

  if (password !== confirm_password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Passwords do not match.',
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password must be at least 8 characters long.',
    })
  }

  const supabase = await serverSupabaseClient(event)

  const { error } = await supabase.auth.updateUser({
    password,
    access_token,
  } as any)

  if (error) {
    throw createError({
      statusCode: error.status || 400,
      statusMessage: error.message || 'Failed to update password.',
    })
  }

  return {
    success: true,
    message: 'Password updated successfully.',
  }
})
