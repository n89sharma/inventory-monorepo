import {
  createMonthEndReport,
  deleteMonthEndReports,
  updateMonthEndSchedule,
} from '@/data/api/report-api'
import { invalidateMonthEndReports, invalidateMonthEndSchedule } from '@/hooks/use-month-end-report'

async function create(): Promise<number> {
  const id = await createMonthEndReport()
  await invalidateMonthEndReports()
  return id
}

async function bulkRemove(ids: number[]): Promise<void> {
  await deleteMonthEndReports(ids)
  await invalidateMonthEndReports()
}

async function updateSchedule(dayOfMonth: number | null): Promise<void> {
  await updateMonthEndSchedule(dayOfMonth)
  await invalidateMonthEndSchedule()
}

const mutations = { create, bulkRemove, updateSchedule } as const

export function useMonthEndReportMutations() {
  return mutations
}
