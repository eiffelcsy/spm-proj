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
      .from('tasks')
      .select(`*,
        creator:creator_id (id, fullname),
        assignee:assignee_id (id, fullname)
      `)
      .eq('id', taskId)
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

    // Fetch activity timeline for this task
    const { data: history, error: timelineError } = await supabase
      .from('activity_timeline')
      .select('*, staff:user_id (fullname)')
      .eq('task_id', taskId)
      .order('timestamp', { ascending: true })

    if (timelineError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch activity timeline',
        data: timelineError
      })
    }

    // Fetch subtasks if this is a parent task
    let subtasks: any[] = [];
    const parentTask = task as any;
    if (parentTask && !parentTask.parent_task_id) {
      const { data: subtaskData, error: subtaskError } = await supabase
        .from('tasks')
        .select(`*,
          creator:creator_id (id, fullname),
          assignee:assignee_id (id, fullname)
        `)
        .eq('parent_task_id', parentTask.id)
        .order('start_date', { ascending: true });
      if (subtaskError) {
        // Log error but do not throw, just return empty subtasks
        console.error('Failed to fetch subtasks:', subtaskError);
        subtasks = [];
      } else {
        subtasks = subtaskData || [];
      }
    }

    // Attach history to the task object
    if (task) {
  parentTask.history = history || [];
  parentTask.subtasks = subtasks;
    }

    return { task }
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