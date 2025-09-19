import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  const taskId = getRouterParam(event, 'id')

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - User not authenticated'
    })
  }

  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required'
    })
  }

  try {
    const { data: task, error } = await supabase
      .from('test_tasks')
      .select('*')
      .eq('id', taskId)
      .or(`assignee_id.eq.${user.id},creator_id.eq.${user.id}`)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Task not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch task',
        data: error
      })
    }

    return {
      task
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error
    })
  }
})
