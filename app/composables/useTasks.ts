import type { TaskFromAPI, TaskCreateInput, TaskUpdateInput } from '@/types'

export const useTasks = () => {
  const createTask = async (input: TaskCreateInput) => {
    return await $fetch('/api/tasks', {
      method: 'POST',
      body: input
    })
  }

  const updateTask = async (id: number, input: TaskUpdateInput) => {
    return await $fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      body: input
    })
  }

  const deleteTask = async (id: number) => {
    return await $fetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    })
  }

//   const fetchTask = async (id: number): Promise<TaskFromAPI> => {
//     return await $fetch(`/api/tasks/${id}`)
//   }

  return {
    createTask,
    updateTask,
    deleteTask,
    // fetchTask
  }
}