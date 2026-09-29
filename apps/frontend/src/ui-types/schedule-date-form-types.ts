import { z } from 'zod'

export const ScheduleDateFormSchema = z.object({
  scheduled_date: z.date({ message: 'Date is required' }),
})
export type ScheduleDateForm = z.infer<typeof ScheduleDateFormSchema>
