import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

interface StaffRow {
  id: number
  fullname: string
  user_id: string
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, fullname, user_id')
    .order('fullname', { ascending: true })

  if (staffError) {
    throw createError({
      statusCode: 500,
      statusMessage: staffError.message,
    })
  }

  if (!staffData) return []

  const typedStaff = staffData as StaffRow[]

  const userIds = typedStaff.map((s) => s.user_id)

  const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) {
    throw createError({
      statusCode: 500,
      statusMessage: userError.message,
    })
  }

  const users = userData?.users ?? []
  const emailMap = new Map(
    users
      .filter((u) => userIds.includes(u.id))
      .map((u) => [u.id, u.email])
  )

  return typedStaff.map((staff) => ({
    id: staff.id,
    fullname: staff.fullname,
    email: emailMap.get(staff.user_id) ?? null
  }))
})
