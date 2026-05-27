import { endOfDay, startOfDay } from 'date-fns'

export function normalizeFromDate(value: string): Date {
  return startOfDay(new Date(value))
}

export function normalizeToDate(value?: string): Date {
  return endOfDay(value ? new Date(value) : new Date())
}
