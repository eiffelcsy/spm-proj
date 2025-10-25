import { defineEventHandler, readBody } from 'h3'
import {
    serverSupabaseServiceRole,
    serverSupabaseUser,
} from "#supabase/server";
import type { ProjectDB } from '~/types'

// Using ProjectDB from types instead of local interface

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
        .select("id, is_manager")
        .eq("user_id", user.id)
        .maybeSingle()) as { data: { id: number } | null; error: any };

    if (staffError)
        throw createError({ statusCode: 500, statusMessage: staffError.message });
    if (!staffRow)
        throw createError({
            statusCode: 403,
            statusMessage: "No staff record found for authenticated user.",
        });

    // Check if user is a manager
    if (!staffRow.is_manager) {
        throw createError({
            statusCode: 403,
            statusMessage: "Only managers can create projects.",
        });
    }

    // Validate required fields
    if (!body.name || !body.name.trim()) {
        throw createError({
            statusCode: 400,
            statusMessage: "Project title is required.",
        });
    }

    // Validate priority if provided
    if (body.priority && !['low', 'medium', 'high'].includes(body.priority)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid priority value.",
        });
    }

    // Validate status if provided
    if (body.status && !['todo', 'in-progress', 'completed', 'blocked'].includes(body.status)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid status value.",
        });
    }
    
    // Check for duplicate project names for this owner (excluding soft-deleted projects)
    const { data: existingProject, error: checkError } = (await supabase
        .from("projects")
        .select("id")
        .eq("name", body.name.trim())
        .eq("owner_id", staffRow.id)
        .is("deleted_at", null)
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
        priority: body.priority || 'medium',
        due_date: body.due_date || null,
        tags: body.tags || [],
        owner_id: staffRow.id,
        status: body.status || "todo",
    };

    const { data: project, error: projectError } = (await supabase
        .from("projects")
        .insert(projectPayload as any)
        .select("*")
        .single()) as { data: ProjectDB | null; error: any };

    if (projectError) {
        throw createError({ statusCode: 500, statusMessage: projectError.message });
    }

    // Add the creator as a project member with 'manager' role
    if (project) {
        const projectMemberPayload = {
            project_id: project.id,
            staff_id: staffRow.id,
            role: 'manager',
            invited_at: new Date().toISOString(),
            joined_at: new Date().toISOString()
        };

        const { error: memberError } = await (supabase as any)
            .from("project_members")
            .insert(projectMemberPayload as any);

        if (memberError) {
            throw createError({ statusCode: 500, statusMessage: memberError.message });
        }

        // Add assigned users if provided
        if (body.assigned_user_ids && Array.isArray(body.assigned_user_ids) && body.assigned_user_ids.length > 0) {
            const assigneePayloads = body.assigned_user_ids
                .filter((id: number) => id !== staffRow.id)  // Don't duplicate creator
                .map((staffId: number) => ({
                    project_id: project.id,
                    staff_id: staffId,
                    role: 'member',
                    invited_at: new Date().toISOString(),
                    joined_at: new Date().toISOString()
                }));

            if (assigneePayloads.length > 0) {
                const { error: assignError } = await supabase
                    .from("project_members")
                    .insert(assigneePayloads);

                if (assignError) {
                    console.error('Error adding assigned users:', assignError);
                }
            }
        }
    }

    return { success: true, project } as { success: boolean; project: ProjectDB };
});
