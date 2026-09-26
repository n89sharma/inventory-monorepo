import type { MonthEndSchedule, UpdateMonthEndSchedule } from 'shared-types'
import { getNextMonthEndRun, scheduleMonthEndReportJob } from '../jobs/monthEndReportJob.js'
import { prisma } from '../prisma.js'

async function readScheduleRow() {
  return prisma.monthEndSchedule.findFirstOrThrow({
    orderBy: { id: 'asc' },
    select: { id: true, day_of_month: true },
  })
}

export async function startMonthEndSchedule(): Promise<void> {
  const schedule = await readScheduleRow()
  await scheduleMonthEndReportJob(schedule.day_of_month)
}

export async function getMonthEndSchedule(): Promise<MonthEndSchedule> {
  const schedule = await readScheduleRow()
  return { day_of_month: schedule.day_of_month, next_run_at: getNextMonthEndRun() }
}

export async function updateMonthEndSchedule(
  { day_of_month }: UpdateMonthEndSchedule,
  userId: number,
): Promise<MonthEndSchedule> {
  const schedule = await readScheduleRow()
  await prisma.monthEndSchedule.update({
    where: { id: schedule.id },
    data: { day_of_month, updated_at: new Date(), updated_by_id: userId },
  })
  await scheduleMonthEndReportJob(day_of_month)
  return { day_of_month, next_run_at: getNextMonthEndRun() }
}
