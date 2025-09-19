import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - User not authenticated'
    })
  }
  
  try {
    const { data: tasks, error } = await supabase
      .from('tasks_test_kylene')
      .select('*')
      // .or(`assignee_id.eq.${user.id},creator_id.eq.${user.id}`)
      // .order('created_at', { ascending: false })

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
