import { AddAssetsByBarcodeOrSerial } from '@/components/collections/add-assets-by-barcode-or-serial'
import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { DataTable } from '@/components/shared/data-table'
import { scanTableColumns } from '@/components/shared/scan-columns'
import { TableTextFilter } from '@/components/shared/filters/table-text-filter'
import { CAUTION_TONE, InlineCallout, SUCCESS_TONE } from '@/components/shared/inline-warning'
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  SpinnerGapIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { ASSET_STATUS, type AssetSearchRow, type AssetSummary } from 'shared-types'
import type { ColumnDef } from '@tanstack/react-table'

const ROW_HEIGHT_CLASS = 'h-7'
const COMPACT_CELL_CLASS = 'py-0'
const RESOLVED_ROW_CLASS = 'data-row-success'
const MISSING_ROW_CLASS = 'data-row-warning'
const NOT_ON_TRANSFER_ERROR = 'not in the scheduled transfer list'
const SEARCH_PLACEHOLDER = 'Search barcode, serial, model'
const SEARCH_CLEAR_LABEL = 'Clear search'
const SEARCHABLE_TEXT = { getColumnCanGlobalFilter: () => true } as const

interface PendingActionCellProps {
  asset: AssetSearchRow
  actionLabel: string
  onScan: (assetId: number) => Promise<void>
  onMarkMissing: (assetId: number) => Promise<void>
}

function PendingActionCell({
  asset,
  actionLabel,
  onScan,
  onMarkMissing,
}: PendingActionCellProps): React.ReactNode {
  const [missingOpen, setMissingOpen] = useState(false)
  if (asset.status === ASSET_STATUS.MISSING) return null

  return (
    <div className="flex items-center justify-center gap-1">
      <Button variant="outline" size="xs" onClick={() => onScan(asset.id)}>
        {actionLabel}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="More options">
            <DotsThreeVerticalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-max">
          <DropdownMenuItem onSelect={() => setMissingOpen(true)}>
            <WarningIcon />
            Mark as missing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmActionDialog
        open={missingOpen}
        onOpenChange={setMissingOpen}
        title={`Mark ${asset.barcode} Missing?`}
        confirmLabel="Mark Missing"
        confirmVariant="destructive"
        size="default"
        icon={<WarningIcon />}
        onConfirm={() => {
          onMarkMissing(asset.id)
          setMissingOpen(false)
        }}
      >
        <AlertDialogDescription>
          Asset {asset.barcode} will be marked as Missing. Transfer can continue without the asset.
        </AlertDialogDescription>
      </ConfirmActionDialog>
    </div>
  )
}

interface UndoCellProps {
  asset: AssetSearchRow
  undoLabel: string
  pendingLabel: string
  onUndo: (assetId: number) => Promise<void>
}

function UndoCell({ asset, undoLabel, pendingLabel, onUndo }: UndoCellProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
        {undoLabel}
      </Button>
      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        title={`${undoLabel} asset ${asset.barcode}?`}
        confirmLabel={undoLabel}
        confirmVariant="destructive"
        size="default"
        icon={<ArrowCounterClockwiseIcon />}
        onConfirm={() => {
          onUndo(asset.id)
          setOpen(false)
        }}
      >
        <AlertDialogDescription>
          Asset {asset.barcode} will move back to {pendingLabel}.
        </AlertDialogDescription>
      </ConfirmActionDialog>
    </>
  )
}

interface ScanStatusBarProps {
  pendingCount: number
  pendingStatusMessage: (remaining: number) => string
  readyStatusMessage: string
}

function ScanStatusBar({
  pendingCount,
  pendingStatusMessage,
  readyStatusMessage,
}: ScanStatusBarProps): React.JSX.Element {
  if (pendingCount > 0) {
    return (
      <InlineCallout
        icon={<SpinnerGapIcon className="size-5 shrink-0 animate-spin" />}
        toneClassName={CAUTION_TONE}
        align="center"
        className="w-fit mx-auto"
      >
        {pendingStatusMessage(pendingCount)}
      </InlineCallout>
    )
  }
  return (
    <InlineCallout
      icon={<CheckCircleIcon weight="fill" className="size-5 shrink-0" />}
      toneClassName={SUCCESS_TONE}
      align="center"
      className="w-fit mx-auto"
    >
      {readyStatusMessage}
    </InlineCallout>
  )
}

function pendingRowClassName(asset: AssetSearchRow): string {
  const tint = asset.status === ASSET_STATUS.MISSING ? MISSING_ROW_CLASS : ''
  return `${ROW_HEIGHT_CLASS} ${tint}`.trim()
}

function resolvedRowClassName(): string {
  return `${ROW_HEIGHT_CLASS} ${RESOLVED_ROW_CLASS}`
}

function getRowId(asset: AssetSearchRow): string {
  return asset.barcode
}

interface ScanSplitViewProps {
  pendingAssets: AssetSearchRow[]
  resolvedAssets: AssetSearchRow[]
  pendingLabel: string
  resolvedLabel: string
  actionLabel: string
  undoLabel: string
  remainingCount: number
  pendingStatusMessage: (remaining: number) => string
  readyStatusMessage: string
  // Changes each time this tab is (re)selected, forcing the scan input to remount so it
  // reliably grabs focus again — the panel itself doesn't always unmount between tab switches.
  focusKey: number
  onScan: (assetId: number) => Promise<void>
  onMarkMissing: (assetId: number) => Promise<void>
  onUndo: (assetId: number) => Promise<void>
}

export function ScanSplitView({
  pendingAssets,
  resolvedAssets,
  pendingLabel,
  resolvedLabel,
  actionLabel,
  undoLabel,
  remainingCount,
  pendingStatusMessage,
  readyStatusMessage,
  focusKey,
  onScan,
  onMarkMissing,
  onUndo,
}: ScanSplitViewProps): React.JSX.Element {
  const pendingByBarcode = new Map(pendingAssets.map((asset) => [asset.barcode, asset]))

  function validateAsset(asset: AssetSummary): string | null {
    const pending = pendingByBarcode.get(asset.barcode)
    if (!pending) return `Asset ${asset.barcode} is ${NOT_ON_TRANSFER_ERROR}.`
    return null
  }

  async function handleScan(asset: AssetSummary): Promise<void> {
    const pending = pendingByBarcode.get(asset.barcode)
    if (!pending) return
    await onScan(pending.id)
  }

  const pendingColumns: ColumnDef<AssetSearchRow>[] = [
    ...scanTableColumns(),
    {
      id: 'action',
      header: actionLabel,
      enableSorting: false,
      meta: { cellClassName: COMPACT_CELL_CLASS },
      cell: ({ row }) => (
        <PendingActionCell
          asset={row.original}
          actionLabel={actionLabel}
          onScan={onScan}
          onMarkMissing={onMarkMissing}
        />
      ),
    },
  ]

  const resolvedColumns: ColumnDef<AssetSearchRow>[] = [
    ...scanTableColumns(),
    {
      id: 'undo',
      header: undoLabel,
      enableSorting: false,
      meta: { cellClassName: COMPACT_CELL_CLASS },
      cell: ({ row }) => (
        <UndoCell
          asset={row.original}
          undoLabel={undoLabel}
          pendingLabel={pendingLabel}
          onUndo={onUndo}
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-2 p-2">
      <ScanStatusBar
        pendingCount={remainingCount}
        pendingStatusMessage={pendingStatusMessage}
        readyStatusMessage={readyStatusMessage}
      />
      <div className="flex justify-center py-3">
        <AddAssetsByBarcodeOrSerial
          getAssets={() => resolvedAssets}
          onAddAsset={() => {}}
          entityName="transfer"
          validateAsset={validateAsset}
          onCommit={handleScan}
          showLeadingIcon
          autoFocus
          key={focusKey}
          className="w-full max-w-sm"
          inputClassName="h-10 text-base"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{pendingLabel}</h3>
          <DataTable
            label="Pending assets"
            columns={pendingColumns}
            data={pendingAssets}
            getRowId={getRowId}
            getRowClassName={pendingRowClassName}
            textSearch={SEARCHABLE_TEXT}
            renderToolbar={(table) => (
              <TableTextFilter
                table={table}
                placeholder={SEARCH_PLACEHOLDER}
                clearLabel={SEARCH_CLEAR_LABEL}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{resolvedLabel}</h3>
          <DataTable
            label="Resolved assets"
            columns={resolvedColumns}
            data={resolvedAssets}
            getRowId={getRowId}
            getRowClassName={resolvedRowClassName}
            textSearch={SEARCHABLE_TEXT}
            renderToolbar={(table) => (
              <TableTextFilter
                table={table}
                placeholder={SEARCH_PLACEHOLDER}
                clearLabel={SEARCH_CLEAR_LABEL}
              />
            )}
          />
        </div>
      </div>
    </div>
  )
}
