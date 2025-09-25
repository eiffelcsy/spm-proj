import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      title: body.title,
      start_date: body.start_date,
      due_date: body.due_date,
      status: body.status,
      description: body.description,
      project_id: body.project_id,
      assignee_id: body.assignee_id, // single assignee
      creator_id: body.creator_id,
    }])
    .select('*')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return { success: true, task: data }
})
