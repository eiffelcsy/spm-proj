import { defineEventHandler, getRouterParam } from 'h3'
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
        // Check if task exists but is soft-deleted
        const { data: deletedTask } = await supabase
          .from('tasks')
          .select('id, deleted_at')
          .eq('id', numericTaskId)
          .not('deleted_at', 'is', null)
          .maybeSingle() as { data: Pick<TaskDB, 'id' | 'deleted_at'> | null, error: any }
        
        if (deletedTask) {
          throw createError({
            statusCode: 404,
            statusMessage: 'Task not found'
          })
        } else {
          throw createError({
            statusCode: 404,
            statusMessage: 'Task not found'
          })
        }
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

    // Managers and admins can delete any task they can view (department visibility already checked above)
    // For non-managers/admins, check assignment permissions
    if (!isManager && !isAdmin) {
      // Check if task is assigned to anyone
      const isTaskAssigned = assigneeRows && assigneeRows.length > 0
      
      if (isTaskAssigned) {
        // If task is assigned, only the assigned person can delete
        const isCurrentUserAssigned = assigneeRows.some((row: any) => row.assigned_to_staff_id === currentStaffId)
        
        if (!isCurrentUserAssigned) {
          throw createError({
            statusCode: 403,
            statusMessage: 'You do not have permission to delete this task. Only assigned staff, managers, or admins can delete assigned tasks.'
          })
        }
      } else {
        // If task is unassigned, only the task creator can delete (unless manager/admin)
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('creator_id')
          .eq('id', numericTaskId)
          .single() as { data: { creator_id: number } | null, error: any }

        if (taskError || !taskData) {
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch task creator information'
          })
        }

        if (taskData.creator_id !== currentStaffId) {
          throw createError({
            statusCode: 403,
            statusMessage: 'You do not have permission to delete this task. Only the task creator, managers, or admins can delete unassigned tasks.'
          })
        }
      }
    }

    // Check if this task has subtasks (only non-deleted subtasks)
    const { data: subtasks, error: subtaskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('parent_task_id', numericTaskId)
      .is('deleted_at', null) as { data: Pick<TaskDB, 'id'>[] | null, error: any }

    if (subtaskError) {
      // Could not check for subtasks, but continue with deletion
    } else if (subtasks && subtasks.length > 0) {
      // Task has active subtasks - soft delete them first
      const subtaskIds = subtasks.map(subtask => subtask.id)
      const { error: subtasksDeleteError } = await (supabase as any)
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', subtaskIds)

      if (subtasksDeleteError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to soft delete subtasks',
          data: subtasksDeleteError
        })
      }
    }

    // Soft delete the task by setting deleted_at timestamp
    const { data: deletedData, error: deleteError } = await (supabase as any)
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
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
