import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { Button } from '@/components/shadcn/button'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { DataGrid } from '@/components/shared/data-table'
import { PendingIcon } from '@/components/shared/pending-icon'
import { useCan } from '@/hooks/use-can'
import { useMonthEndReports, useMonthEndSchedule } from '@/hooks/use-month-end-report'
import { useMonthEndReportMutations } from '@/hooks/use-month-end-report-mutations'
import { formatDateWithTime } from '@/lib/formatters'
import { CameraIcon, TrashIcon } from '@phosphor-icons/react'
import type { RowSelectionState } from '@tanstack/react-table'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { MonthEndReportListItem } from 'shared-types'
import { MONTH_END_REPORT_COLUMNS, monthEndReportHref } from './month-end-reports-table-columns'

const TABLE_LABEL = 'Month-end reports'
const DEFAULT_SORT = { id: 'captured_at', desc: true } as const
const EMPTY_REPORTS: MonthEndReportListItem[] = []

const getReportRowId = (row: MonthEndReportListItem): string => String(row.id)
const getReportHref = (row: MonthEndReportListItem): string => monthEndReportHref(row.id)

function NextScheduledRun(): React.JSX.Element | null {
  const { data: schedule } = useMonthEndSchedule()
  if (!schedule?.next_run_at) return null
  return (
    <p className="text-sm text-muted-foreground">
      Next scheduled snapshot: {formatDateWithTime(schedule.next_run_at)}
    </p>
  )
}

function GenerateReportButton(): React.JSX.Element | null {
  const canGenerate = useCan('generate_month_end_report')
  const mutations = useMonthEndReportMutations()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  if (!canGenerate) return null

  async function handleGenerate() {
    setPending(true)
    try {
      const id = await mutations.create()
      toast.success('Month-end snapshot captured', { position: 'top-center' })
      navigate(monthEndReportHref(id))
    } finally {
      setPending(false)
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={pending}>
      <PendingIcon pending={pending}>
        <CameraIcon aria-hidden="true" />
      </PendingIcon>
      Generate Now
    </Button>
  )
}

function DeleteSelectedButton({
  selectedIds,
  onDeleted,
}: {
  selectedIds: number[]
  onDeleted: () => void
}): React.JSX.Element | null {
  const canDelete = useCan('delete_month_end_report')
  const mutations = useMonthEndReportMutations()
  const [open, setOpen] = useState(false)

  if (!canDelete) return null

  async function handleConfirm() {
    await mutations.bulkRemove(selectedIds)
    toast.success(`Deleted ${selectedIds.length} report(s)`, { position: 'top-center' })
    onDeleted()
  }

  return (
    <>
      <Button variant="outline" disabled={selectedIds.length === 0} onClick={() => setOpen(true)}>
        <TrashIcon aria-hidden="true" />
        Delete Selected
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${selectedIds.length} month-end report(s)?`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        icon={<TrashIcon />}
        onConfirm={handleConfirm}
      >
        <p className="text-sm text-muted-foreground">
          The captured asset rows are deleted with each report. This cannot be undone.
        </p>
      </ConfirmActionDialog>
    </>
  )
}

export function MonthEndReportsPage(): React.JSX.Element {
  const { data: reports = EMPTY_REPORTS } = useMonthEndReports()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const selectedIds = Object.keys(rowSelection)
    .filter((id) => rowSelection[id])
    .map(Number)

  return (
    <GridPageContent>
      <GridPageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Month End Reports</h1>
          <div className="flex items-center gap-2">
            <DeleteSelectedButton selectedIds={selectedIds} onDeleted={() => setRowSelection({})} />
            <GenerateReportButton />
          </div>
        </div>
      </GridPageHeader>
      <PageSection>
        <NextScheduledRun />
      </PageSection>
      <DataGrid
        label={TABLE_LABEL}
        columns={MONTH_END_REPORT_COLUMNS}
        data={reports}
        defaultSort={DEFAULT_SORT}
        getRowId={getReportRowId}
        getRowHref={getReportHref}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />
    </GridPageContent>
  )
}
