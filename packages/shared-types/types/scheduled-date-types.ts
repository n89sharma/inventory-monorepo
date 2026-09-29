import { z } from 'zod'

const SCHEDULED_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const todayYmd = (): string => new Date().toISOString().slice(0, 10)

export const ScheduledDateSchema = z
  .string()
  .regex(SCHEDULED_DATE_PATTERN, 'Date must be YYYY-MM-DD')
  .refine((value) => value >= todayYmd(), 'Date cannot be in the past')
