import { z } from 'zod'

export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  startDate: z.date(),
  dueDate: z.date(),
  project: z.string(),
  status: z.enum(['not-started', 'in-progress', 'completed', 'blocked']),
  notes: z.string().optional(),
  priority: z.number().optional(),
  assignees: z.array(z.object({
    assigned_to: z.object({
      id: z.number().nullable(),
      fullname: z.string()
    }),
    assigned_by: z.object({
      id: z.number(),
      fullname: z.string()
    }).nullable()
  })).optional()
})

export type Task = z.infer<typeof taskSchema>