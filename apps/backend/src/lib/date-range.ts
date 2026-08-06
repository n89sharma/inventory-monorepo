import { endOfDay, parseISO, startOfDay } from 'date-fns'

export function normalizeFromDate(value: string): Date {
  return startOfDay(parseISO(value))
}

export function normalizeToDate(value?: string): Date {
  return endOfDay(value ? parseISO(value) : new Date())
}
