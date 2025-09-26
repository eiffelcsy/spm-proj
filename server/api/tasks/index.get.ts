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
    const { data: staffIdData, error: staffIdError } = await supabase
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (staffIdError || !staffIdData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID',
        data: staffIdError
      })
    }
    const staffId = (staffIdData as { id: number }).id
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      // .or(`assignee_id.eq.${staffId},creator_id.eq.${staffId}`)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          tasks: [],
          count: 0
        }
      } else {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tasks',
        data: error
      })
      }
    }

    return {
      tasks: tasks || [],
      count: tasks?.length || 0
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
      data: error
    })
  }
})
