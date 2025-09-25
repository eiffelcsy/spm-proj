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
      .from('tasks')
      .select('*')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .neq('status', 'completed') // Exclude completed tasks
      // .or(`assignee_id.eq.${user.id},creator_id.eq.${user.id}`)
      .order('due_date', { ascending: true })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch overdue tasks',
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
