import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  try {
    const { data: tasks, error } = await supabase
      .from('test_tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks',
        data: error
      })
    }

    return {
      tasks: tasks || [],
      count: tasks?.length || 0
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error
    })
  }
})
