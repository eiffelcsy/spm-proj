import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    const supabase = await serverSupabaseServiceRole(event)

    // require authenticated user and find staff.id
    const user = await serverSupabaseUser(event)
    if (!user || !user.id) {
        throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    }

    const { data: staffRow, error: staffError } = await supabase
        .from('staff')
        .select('id, fullname, staff_type')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: number, fullname: string } | null, error: any }

    if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })
    if (!staffRow) throw createError({ statusCode: 403, statusMessage: 'No staff record found for authenticated user.' })

    return { 
        id: staffRow.id,
        fullname: staffRow.fullname,
        email: user.email || null,
        staff_type: staffRow.staff_type
    }
})
