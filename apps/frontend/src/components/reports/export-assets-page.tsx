import { PageContent } from '@/components/app-layout/page-content'
import { ASSETS_BY_SERIAL_NUMBER_DEFAULT_COLUMN_IDS } from '@/components/table-columns/asset-table-columns'
import { Button } from '@/components/shadcn/button'
import { Label } from '@/components/shadcn/label'
import { Textarea } from '@/components/shadcn/textarea'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { AssetResultsTable } from '@/components/shared/asset-results-table'
import { ColumnPickerButton } from '@/components/shared/column-picker-button'
import { ExportAssetsButton } from '@/components/shared/export-assets-button'
import { useAssetSelection } from '@/hooks/use-asset-selection'
import { useAssetsBySerialNumber } from '@/hooks/use-assets-by-serial-number'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { assetDetailHref } from '@/ui-types/navigation-context'
import { CopyIcon, SpinnerGapIcon, WarningIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AssetSearchRow } from 'shared-types'
import { toast } from 'sonner'

const PAGE_TITLE = 'Export Assets'
const SERIAL_NUMBERS_LABEL = 'Serial numbers'
const TEXTAREA_ID = 'serial-numbers'
const TEXTAREA_PLACEHOLDER = 'Paste serial numbers, one per line'
const DEBOUNCE_MS = 300
const NOT_FOUND_COPIED_MESSAGE = 'Copied serial numbers'
const EMPTY_ASSETS: AssetSearchRow[] = []
const EMPTY_NOT_FOUND: string[] = []
const TOKEN_SEPARATOR = /[\s,]+/

type ParsedSerialNumbers = {
  serialNumbers: string[]
  enteredCount: number
  duplicateCount: number
}

function parseSerialNumbers(text: string): ParsedSerialNumbers {
  const tokens = text.split(TOKEN_SEPARATOR).filter((token) => token.length > 0)
  const serialNumbers = [...new Set(tokens)]
  return {
    serialNumbers,
    enteredCount: tokens.length,
    duplicateCount: tokens.length - serialNumbers.length,
  }
}

function SerialNumberCounts({
  enteredCount,
  duplicateCount,
}: {
  enteredCount: number
  duplicateCount: number
}): React.JSX.Element | null {
  if (enteredCount === 0) return null
  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {enteredCount} entered, {duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'} removed
    </p>
  )
}

function NotFoundSerialNumbersBanner({
  serialNumbers,
}: {
  serialNumbers: string[]
}): React.JSX.Element | null {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(serialNumbers.join('\n'))
    toast.success(NOT_FOUND_COPIED_MESSAGE, { position: 'top-center' })
  }, [serialNumbers])

  if (serialNumbers.length === 0) return null
  return (
    <div
      className="flex items-start justify-between gap-2 rounded-lg border
        border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <div className="flex items-start gap-2">
        <WarningIcon className="mt-0.5 shrink-0" />
        <span>
          <span className="font-medium tabular-nums">{serialNumbers.length} not found: </span>
          <span className="break-all">{serialNumbers.join(', ')}</span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-7 shrink-0 gap-1.5 text-destructive hover:text-destructive"
      >
        <CopyIcon />
        Copy
      </Button>
    </div>
  )
}

export function ExportAssetsPage(): React.JSX.Element {
  const [text, setText] = useState('')
  const [debouncedText, setDebouncedText] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setDebouncedText(text), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [text])

  const { serialNumbers, enteredCount, duplicateCount } = useMemo(
    () => parseSerialNumbers(debouncedText),
    [debouncedText],
  )

  const { data, isLoading, mutate } = useAssetsBySerialNumber(serialNumbers)
  const assets = data?.assets ?? EMPTY_ASSETS
  const notFound = data?.notFound ?? EMPTY_NOT_FOUND

  const { visibleColumns, setVisibleColumns, columnVisibility, reset } = useColumnVisibility(
    ASSETS_BY_SERIAL_NUMBER_DEFAULT_COLUMN_IDS,
  )
  const selection = useAssetSelection(assets, visibleColumns, 'export-assets.csv')

  const searchParams = useOptimisticSearchParams()
  const getRowHref = useCallback(
    (asset: AssetSearchRow) => assetDetailHref('all', asset.barcode, searchParams),
    [searchParams],
  )
  const handleBulkPriceSave = useCallback(() => {
    mutate()
  }, [mutate])

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{PAGE_TITLE}</h1>
            {isLoading && (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <ColumnPickerButton
              visible={visibleColumns}
              onVisibleChange={setVisibleColumns}
              onReset={reset}
            />
            <ExportAssetsButton
              loading={selection.exportLoading}
              disabled={selection.exportDisabled}
              onClick={selection.handleExport}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={TEXTAREA_ID}>{SERIAL_NUMBERS_LABEL}</Label>
          <Textarea
            id={TEXTAREA_ID}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={TEXTAREA_PLACEHOLDER}
            className="min-h-20 font-mono text-sm"
          />
          <SerialNumberCounts enteredCount={enteredCount} duplicateCount={duplicateCount} />
        </div>
      </StickyPageHeader>
      <PageContent className={`flex flex-col gap-2 ${selection.hasSelection ? 'pb-24' : ''}`}>
        <NotFoundSerialNumbersBanner serialNumbers={notFound} />
        <div className={isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <AssetResultsTable
            assets={assets}
            rowSelection={selection.rowSelection}
            onRowSelectionChange={selection.setRowSelection}
            onBulkPriceSave={handleBulkPriceSave}
            columnVisibility={columnVisibility}
            getRowHref={getRowHref}
          />
        </div>
      </PageContent>
    </>
  )
}
