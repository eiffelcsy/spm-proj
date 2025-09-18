import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('staff')
    .select('id, fullname')
    .order('fullname', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return data.map((staff: any) => ({
    id: staff.id,
    fullname: staff.fullname,
  }))
})
