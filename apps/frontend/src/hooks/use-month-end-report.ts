import {
  getMonthEndReport,
  getMonthEndReports,
  getMonthEndSchedule,
  type MonthEndReportFilters,
} from '@/data/api/report-api'
import useSWR, { mutate } from 'swr'

const MONTH_END_REPORTS_KEY = 'month-end-reports'
const MONTH_END_REPORT_KEY = 'month-end-report'
const MONTH_END_SCHEDULE_KEY = 'month-end-schedule'

const REPORT_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const

export function useMonthEndReports() {
  return useSWR(MONTH_END_REPORTS_KEY, getMonthEndReports, REPORT_OPTIONS)
}

export function useMonthEndReport(id: number | null, filters: MonthEndReportFilters) {
  const key = id === null ? null : ([MONTH_END_REPORT_KEY, id, filters] as const)
  return useSWR(key, ([, reportId, keyFilters]) => getMonthEndReport(reportId, keyFilters), {
    ...REPORT_OPTIONS,
    keepPreviousData: true,
  })
}

export function useMonthEndSchedule() {
  return useSWR(MONTH_END_SCHEDULE_KEY, getMonthEndSchedule, REPORT_OPTIONS)
}

export function invalidateMonthEndReports() {
  return mutate(MONTH_END_REPORTS_KEY)
}

export function invalidateMonthEndSchedule() {
  return mutate(MONTH_END_SCHEDULE_KEY)
}
