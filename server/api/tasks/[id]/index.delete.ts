import { defineEventHandler, getRouterParam, createError } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { TaskDB } from '~/types'
import { logTaskDeletion } from '../../../utils/activityLogger'
import { createTaskDeletionNotification, getTaskDetails } from '../../../utils/notificationService'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
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
    // Convert taskId to number if it's a string
    const numericTaskId = typeof taskId === 'string' ? parseInt(taskId) : taskId
    
    if (isNaN(numericTaskId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid task ID format'
      })
    }

    // Get current user's staff ID, department, and role
    const { data: staffIdData, error: staffIdError } = await supabase
      .from('staff')
      .select('id, department, is_manager, is_admin')
      .eq('user_id', user.id)
      .single()

    if (staffIdError || !staffIdData) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff ID',
        data: staffIdError
      })
    }
    const currentStaffId = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).id
    const currentDepartment = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).department
    const isManager = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).is_manager
    const isAdmin = (staffIdData as { id: number; department: string | null; is_manager: boolean; is_admin: boolean }).is_admin

    // First, check if the task exists (only non-deleted tasks)
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, deleted_at')
      .eq('id', numericTaskId)
      .is('deleted_at', null)
      .single() as { data: Pick<TaskDB, 'id' | 'deleted_at'> | null, error: any }

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Task not found'
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch task for deletion',
        data: fetchError
      })
    }

    // Get task assignees
    const { data: assigneeRows } = await supabase
      .from('task_assignees')
      .select('assigned_to_staff_id')
      .eq('task_id', numericTaskId)
      .eq('is_active', true)

    // Check visibility: user can only delete task if someone from their department is assigned
    if (currentDepartment) {
      // Get all staff IDs in the same department
      const { data: departmentStaff, error: deptError } = await supabase
        .from('staff')
        .select('id')
        .eq('department', currentDepartment)
      
      if (deptError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch department staff',
          data: deptError
        })
      }
      
      const departmentStaffIds = departmentStaff?.map((s: any) => s.id) || []
      
      // Check if any assignee is from the user's department
      const hasAssigneeFromDepartment = assigneeRows?.some((row: any) => 
        departmentStaffIds.includes(row.assigned_to_staff_id)
      )
      
      if (!hasAssigneeFromDepartment) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You do not have permission to view or delete this task'
        })
      }
    } else {
      // If user has no department, they can't delete any tasks
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to view or delete this task'
      })
    }

    // Only managers can delete tasks
    if (!isManager) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only managers can delete tasks'
      })
    }

    // Soft-delete all descendant substasks
    const nowIso = new Date().toISOString()
    const queue: number[] = [numericTaskId]
    const toDelete: number[] = []

    while (queue.length) {
      const parentId = queue.shift()!
      const { data: children, error: childrenError } = await supabase
        .from('tasks')
        .select('id')
        .eq('parent_task_id', parentId)
        .is('deleted_at', null) as { data: Array<{ id: number }> | null, error: any }

      if (childrenError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch subtasks for cascade delete',
          data: childrenError
        })
      }

      if (children && children.length) {
        const ids = children.map(c => c.id)
        toDelete.push(...ids)
        queue.push(...ids)
      }
    }

    if (toDelete.length > 0) {
      const { error: cascadeError } = await supabase
        .from('tasks')
        .update({ deleted_at: nowIso })
        .in('id', toDelete)
      if (cascadeError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to soft delete descendant subtasks',
          data: cascadeError
        })
      }
    }

    // Soft delete the task by setting deleted_at timestamp
    const { data: deletedData, error: deleteError } = await (supabase as any)
      .from('tasks')
      .update({ deleted_at: nowIso })
      .eq('id', numericTaskId)
      .select() as { data: TaskDB[] | null, error: any }

    if (deleteError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to soft delete task',
        data: deleteError
      })
    }

    if (!deletedData || deletedData.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Task not found or already deleted'
      })
    }

    // Log task deletion activity
    await logTaskDeletion(supabase, numericTaskId, currentStaffId)

    // Create notifications for task deletion
    const taskDetails = await getTaskDetails(supabase, numericTaskId)
    if (taskDetails) {
        // Get all assignees for this task
        const { data: assignees } = await supabase
          .from('task_assignees')
          .select('assigned_to_staff_id')
          .eq('task_id', numericTaskId)
          .eq('is_active', true) as { data: Array<{ assigned_to_staff_id: number }> | null }

      if (assignees && assignees.length > 0) {
        // Notify all assignees
        for (const assignee of assignees) {
          await createTaskDeletionNotification(
            supabase,
            numericTaskId,
            assignee.assigned_to_staff_id,
            currentStaffId,
            taskDetails.title,
            taskDetails.projectName
          )
        }
      }
    }

    return {
      success: true,
      message: 'Task soft deleted successfully',
      deletedTask: deletedData?.[0] || null
    }
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
