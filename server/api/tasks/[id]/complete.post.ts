import { defineEventHandler, getRouterParam } from 'h3'

// still debugging:
// import { serverSupabaseServiceRole } from '#supabase/server'

// export default defineEventHandler(async (event) => {
//   const taskId = Number(getRouterParam(event, 'id'))
//   const supabase = await serverSupabaseServiceRole(event)
  
//   try {
//     console.log(`[${new Date().toISOString()}] Completing task ${taskId}`)
    
//     // Get task details
//     const { data: task, error: fetchError } = await supabase
//       .from('tasks')
//       .select('*')
//       .eq('id', taskId)
//       .single() 
    
//     if (fetchError || !task) {
//       console.error(`Task ${taskId} not found:`, fetchError)
//       throw createError({ statusCode: 404, statusMessage: 'Task not found' })
//     }
    
//     console.log(`Task found: "${task.title}", repeat_frequency: ${task.repeat_frequency}`)
    
//     // Mark as completed with timestamp
//     const completedAt = new Date().toISOString()
//     const { error: updateError } = await supabase
//       .from('tasks')
//       .update({ 
//         status: 'completed',
//         completed_at: completedAt
//       })
//       .eq('id', taskId)
    
//     if (updateError) {
//       console.error(`Failed to update task ${taskId}:`, updateError)
//       throw createError({ statusCode: 500, statusMessage: 'Failed to update task status' })
//     }
    
//     console.log(`Task ${taskId} marked as completed at ${completedAt}`)
    
//     // If recurring, create next occurrence
//     if (task.repeat_frequency && task.repeat_frequency !== 'never') {
//       console.log(`Creating next occurrence for recurring task ${taskId}`)
      
//       const nextDates = calculateNextOccurrence(task)
//       console.log(`Next occurrence dates:`, nextDates)
      
//       // Create next task with same properties but new dates
//       const { data: nextTask, error: insertError } = await supabase
//         .from('tasks')
//         .insert({
//           title: task.title,
//           notes: task.notes,
//           start_date: nextDates.startDate,
//           due_date: nextDates.dueDate,
//           status: 'not-started',
//           priority: task.priority,
//           repeat_frequency: task.repeat_frequency,
//           project_id: task.project_id,
//           creator_id: task.creator_id,
//           parent_task_id: task.parent_task_id || taskId,
//           completed_at: null
//         })
//         .select()
//         .single()
      
//       if (insertError) {
//         console.error(`Failed to create next occurrence:`, insertError)
//         // Don't fail the whole request, just log the error
//         return { 
//           success: true,
//           task: { ...task, status: 'completed', completed_at: completedAt },
//           message: 'Task completed but failed to create next occurrence',
//           error: insertError.message
//         }
//       }
      
//       console.log(`Next task created with ID: ${nextTask.id}`)
      
//       // Copy assignees to new task
//       const { data: assignees, error: assigneeError } = await supabase
//         .from('task_assignees')
//         .select('*')
//         .eq('task_id', taskId)
      
//       if (assigneeError) {
//         console.error(`Failed to fetch assignees:`, assigneeError)
//       } else if (assignees?.length && nextTask) {
//         const newAssignees = assignees.map(a => ({
//           task_id: nextTask.id,
//           assignee_id: a.assignee_id,
//           assigned_at: new Date().toISOString()
//         }))
        
//         const { error: assignError } = await supabase
//           .from('task_assignees')
//           .insert(newAssignees)
        
//         if (assignError) {
//           console.error(`Failed to assign users to next occurrence:`, assignError)
//         } else {
//           console.log(`Copied ${assignees.length} assignees to next task`)
//         }
//       }
      
//       return { 
//         success: true, 
//         task: { ...task, status: 'completed', completed_at: completedAt },
//         nextTask,
//         message: `Task completed and next occurrence created (ID: ${nextTask.id})`
//       }
//     }
    
//     return { 
//       success: true,
//       task: { ...task, status: 'completed', completed_at: completedAt },
//       message: 'Task completed successfully'
//     }
    
//   } catch (error: any) {
//     console.error(`Error completing task ${taskId}:`, error)
    
//     if (error.statusCode) {
//       throw error
//     }
    
//     throw createError({
//       statusCode: 500,
//       statusMessage: error.message || 'Failed to complete task'
//     })
//   }
// })

// function calculateNextOccurrence(task: any) {
//   console.log(`Calculating next occurrence for task: ${task.title}`)
//   console.log(`Current dates - start: ${task.start_date}, due: ${task.due_date}`)
//   console.log(`Repeat frequency: ${task.repeat_frequency}`)
  
//   // Handle null/undefined dates
//   if (!task.start_date || !task.due_date) {
//     console.warn('Missing dates, using today as fallback')
//     const today = new Date()
//     const tomorrow = new Date(today)
//     tomorrow.setDate(tomorrow.getDate() + 1)
    
//     return {
//       startDate: today.toISOString().split('T')[0],
//       dueDate: tomorrow.toISOString().split('T')[0]
//     }
//   }
  
//   const currentStart = new Date(task.start_date)
//   const currentDue = new Date(task.due_date)
  
//   // Validate dates
//   if (isNaN(currentStart.getTime()) || isNaN(currentDue.getTime())) {
//     console.error('Invalid dates in task:', task.start_date, task.due_date)
//     const today = new Date()
//     const tomorrow = new Date(today)
//     tomorrow.setDate(tomorrow.getDate() + 1)
    
//     return {
//       startDate: today.toISOString().split('T')[0],
//       dueDate: tomorrow.toISOString().split('T')[0]
//     }
//   }
  
//   const duration = currentDue.getTime() - currentStart.getTime()
//   let nextStart = new Date(currentDue) // Start next occurrence after current due date
  
//   switch (task.repeat_frequency) {
//     case 'daily':
//       nextStart.setDate(nextStart.getDate() + 1)
//       break
//     case 'weekly':
//       nextStart.setDate(nextStart.getDate() + 7)
//       break
//     case 'monthly':
//       nextStart.setMonth(nextStart.getMonth() + 1)
//       break
//     case 'yearly':
//       nextStart.setFullYear(nextStart.getFullYear() + 1)
//       break
//     default:
//       console.warn(`Unknown repeat frequency: ${task.repeat_frequency}, defaulting to daily`)
//       nextStart.setDate(nextStart.getDate() + 1)
//   }
  
//   const nextDue = new Date(nextStart.getTime() + duration)
  
//   const result = {
//     startDate: nextStart.toISOString().split('T')[0],
//     dueDate: nextDue.toISOString().split('T')[0]
//   }
  
//   console.log(`Next occurrence calculated:`, result)
//   return result
// }