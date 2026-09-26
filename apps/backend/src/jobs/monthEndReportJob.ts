import cron, { type ScheduledTask, type TaskContext } from 'node-cron'
import { logger } from '../lib/logger.js'
import { buildMonthEndCron, MONTH_END_TIMEZONE, periodOf } from '../lib/month-end-schedule.js'
import { createScheduledMonthEndReport } from '../services/monthEndReportService.js'

const TASK_NAME = 'month-end-report'
const MISSED_EXECUTION_TOLERANCE_MS = 5 * 60 * 1000

let task: ScheduledTask | null = null

async function captureScheduledReport({ date }: TaskContext): Promise<void> {
  const period = periodOf(date)
  try {
    const reportId = await createScheduledMonthEndReport(period)
    if (reportId !== null) logger.info(`[month-end] captured ${period} as report ${reportId}`)
  } catch (error) {
    logger.error(`[month-end] capture for ${period} failed`, { error })
  }
}

export async function scheduleMonthEndReportJob(dayOfMonth: number | null): Promise<void> {
  const prevTask = task
  if (prevTask) await prevTask.destroy()

  const currTask = cron.schedule(buildMonthEndCron(dayOfMonth), captureScheduledReport, {
    name: TASK_NAME,
    timezone: MONTH_END_TIMEZONE,
    noOverlap: true,
    missedExecutionTolerance: MISSED_EXECUTION_TOLERANCE_MS,
    unref: true,
  })
  currTask.on('execution:missed', ({ date }) => {
    logger.warn(`[month-end] missed the ${periodOf(date)} capture; run it manually`)
  })
  task = currTask
}

export function getNextMonthEndRun(): Date | null {
  return task?.getNextRun() ?? null
}
