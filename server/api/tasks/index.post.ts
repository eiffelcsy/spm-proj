import { serverSupabaseClient } from '#supabase/server'

// Define the task insert type to match your database schema
interface TaskInsert {
  task_name: string
  start_date: string
  due_date: string | null
  status: string
  description: string | null
  project_id: number | null
  creator_id: number
  assignee_id: number | null
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const body = await readBody(event)

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body is required'
    })
  }

  try {
    // Validate required fields
    if (!body.task_name?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Task name is required'
      })
    }

    // TODO: STAFF MODULE INTEGRATION REQUIRED
    // Replace this with actual staff_id lookup once staff module is implemented
    // This should query user_staff_mapping table to get staff_id for current user
    /*
    const { data: staffMapping, error: staffError } = await supabase
      .from('user_staff_mapping')
      .select('staff_id')
      .eq('user_id', user.id)
      .single()
    
    if (staffError || !staffMapping) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unable to find your staff record. Please contact administrator.'
      })
    }
    
    const staffId = staffMapping.staff_id
    */
    
    // TEMPORARY: Using placeholder staff_id until staff module is ready
    const staffId = 1 // Replace with actual staff_id lookup above

    const taskData: TaskInsert = {
      task_name: body.task_name,
      start_date: body.start_date ? new Date(body.start_date).toISOString() : new Date().toISOString(),
      end_date: body.end_date ? new Date(body.end_date).toISOString() : null,
      status: body.status || 'not-started',
      description: body.description || null,
      project_id: body.project_id || null, // No project assignment initially - can be assigned later
      creator_id: staffId, // TODO: STAFF MODULE - This will come from user_staff_mapping lookup
      assignee_id: body.assignee_id ? parseInt(body.assignee_id) : null,
    }

    // Insert task into Supabase
    const { data: task, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()

    if (error) {
      console.error('Database error creating task:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create task',
        data: error
      })
    }

    if (!task) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No data returned from task creation'
      })
    }

    // Note: Subtasks are not supported in the current database schema
    // If you want to support subtasks, you'll need to add a parent_task_id column
    // or store subtasks in a separate table

    return {
      success: true,
      task
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error creating task:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: error
    })
  }
})
