import { PageContent } from '@/components/app-layout/page-content'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { useMonthEndSchedule } from '@/hooks/use-month-end-report'
import { useMonthEndReportMutations } from '@/hooks/use-month-end-report-mutations'
import { formatDateWithTime } from '@/lib/formatters'
import { useState } from 'react'
import { toast } from 'sonner'
import { MAX_MONTH_END_SCHEDULE_DAY } from 'shared-types'

const LAST_DAY_VALUE = 'last'
const LAST_DAY_LABEL = 'Last day of the month'
const DAY_VALUES = Array.from({ length: MAX_MONTH_END_SCHEDULE_DAY }, (_, i) => String(i + 1))

function toSelectValue(dayOfMonth: number | null): string {
  return dayOfMonth === null ? LAST_DAY_VALUE : String(dayOfMonth)
}

function toDayOfMonth(value: string): number | null {
  return value === LAST_DAY_VALUE ? null : Number.parseInt(value, 10)
}

export function MonthEndSchedulePage(): React.JSX.Element {
  const { data: schedule } = useMonthEndSchedule()
  const mutations = useMonthEndReportMutations()
  const [saving, setSaving] = useState(false)

  async function handleChange(value: string) {
    setSaving(true)
    try {
      await mutations.updateSchedule(toDayOfMonth(value))
      toast.success('Month-end schedule saved', { position: 'top-center' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContent className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Month End Schedule</h1>
      <p className="text-sm text-muted-foreground">
        A month-end snapshot is captured automatically at 11:59 PM Eastern on the chosen day. A
        missed run is not retried; generate one manually from the Month End report.
      </p>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Capture on</span>
        <Select
          value={schedule ? toSelectValue(schedule.day_of_month) : undefined}
          onValueChange={handleChange}
          disabled={!schedule || saving}
        >
          <SelectTrigger className="w-56" aria-label="Capture day">
            <SelectValue placeholder="Loading…" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              <SelectItem value={LAST_DAY_VALUE}>{LAST_DAY_LABEL}</SelectItem>
              {DAY_VALUES.map((day) => (
                <SelectItem key={day} value={day}>
                  Day {day}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {schedule?.next_run_at ? (
        <p className="text-sm text-muted-foreground">
          Next snapshot: {formatDateWithTime(schedule.next_run_at)}
        </p>
      ) : null}
    </PageContent>
  )
}
