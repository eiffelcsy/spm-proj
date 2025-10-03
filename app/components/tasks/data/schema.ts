import { z } from 'zod'

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  startDate: z.date(),
  dueDate: z.date(),
  project: z.string(),
  status: z.string(),
  notes: z.string().optional(),
})

export type Task = z.infer<typeof taskSchema>