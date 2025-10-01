import {
    serverSupabaseServiceRole,
    serverSupabaseUser,
} from "#supabase/server";

interface Project {
    id: number;
    name: string;
    description: string | null;
    due_date: string | null;
    owner_id: number;
    status: string;
    created_at: string;
    updated_at: string;
}

export default defineEventHandler(async (event) => {
    const supabase = await serverSupabaseServiceRole(event);
    const body = await readBody(event);

    // require authenticated user and find staff.id
    const user = await serverSupabaseUser(event);
    if (!user || !user.id) {
        throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
    }

    const { data: staffRow, error: staffError } = (await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()) as { data: { id: number } | null; error: any };

    if (staffError)
        throw createError({ statusCode: 500, statusMessage: staffError.message });
    if (!staffRow)
        throw createError({
            statusCode: 403,
            statusMessage: "No staff record found for authenticated user.",
        });

    // Validate required fields
    if (!body.name || !body.name.trim()) {
        throw createError({
            statusCode: 400,
            statusMessage: "Project title is required.",
        });
    }

    // Check for duplicate project names for this owner
    const { data: existingProject, error: checkError } = (await supabase
        .from("projects")
        .select("id")
        .eq("name", body.name.trim())
        .eq("owner_id", staffRow.id)
        .maybeSingle()) as { data: { id: number } | null; error: any };

    if (checkError) {
        throw createError({ statusCode: 500, statusMessage: checkError.message });
    }

    if (existingProject) {
        throw createError({
            statusCode: 400,
            statusMessage: "A project with this name already exists.",
        });
    }

    const projectPayload = {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        due_date: body.due_date || null,
        owner_id: staffRow.id,
        status: "active",
    };

    const { data: project, error: projectError } = (await supabase
        .from("projects")
        .insert(projectPayload as any)
        .select("*")
        .single()) as { data: Project | null; error: any };

    if (projectError) {
        throw createError({ statusCode: 500, statusMessage: projectError.message });
    }

    return { success: true, project };
});
