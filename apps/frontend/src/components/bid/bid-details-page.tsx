import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import {
  buildBidGridColumns,
  isPastedColumnId,
  type BidPriceField,
  type BidRowEditing,
} from '@/components/bid/bid-row-table-columns'
import { BidLifecycleActions } from '@/components/bid/bid-lifecycle-actions'
import { BidOutcomeBadge, BidStatusBadge } from '@/components/bid/bid-status-badge'
import { BidTotalsStrip } from '@/components/bid/bid-totals-strip'
import { EditBidMetadataModal } from '@/components/bid/edit-bid-metadata-modal'
import {
  SetBidRowsFreightDialog,
  SetBidRowsMarginDialog,
} from '@/components/bid/set-bid-rows-value-dialog'
import { UploadBidRowsDialog } from '@/components/bid/upload-bid-rows-dialog'
import { BulkActionBar } from '@/components/collections/bulk-action-bar'
import { GridDetailsPageHeader } from '@/components/collections/sticky-details-page-header'
import { AlertDialogDescription } from '@/components/shadcn/alert-dialog'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { DataGridWithoutResultCount } from '@/components/shared/data-table'
import { DeleteEntityDialog } from '@/components/shared/delete-entity-dialog'
import { TableTextFilter } from '@/components/shared/filters/table-text-filter'
import { useBidDetail } from '@/hooks/use-bid'
import { useBidMutations } from '@/hooks/use-bid-mutations'
import { useEntityDelete } from '@/hooks/use-entity-delete'
import { formatDateOnly } from '@/lib/formatters'
import { createPriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import { queryStringFrom } from '@/ui-types/navigation-context'
import { DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import type { RowSelectionState, TableOptions } from '@tanstack/react-table'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BID_STATUS, type BidDetail, type BidRow } from 'shared-types'

const TABLE_LABEL = 'Bid rows'
const ROW_NOUN = 'row'
const ENTITY_LABEL = 'Bid'

const BID_ROW_TEXT_SEARCH = {
  getColumnCanGlobalFilter: (column) => isPastedColumnId(column.id),
} as const satisfies Pick<TableOptions<BidRow>, 'getColumnCanGlobalFilter'>

const getBidRowId = (row: BidRow) => String(row.id)

type BulkDialog = 'margin' | 'freight'

export function BidDetailsPage(): React.JSX.Element {
  const { collectionId = '' } = useParams()
  const { data, error, isLoading } = useBidDetail(collectionId)

  if (isLoading)
    return (
      <div role="status" aria-live="polite">
        Loading…
      </div>
    )
  if (error) return <div>{error.message}</div>
  if (!data) return <div>Bid not found</div>
  return <BidDetailsContent bid={data} />
}

function BidSubtitle({ bid }: { bid: BidDetail }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <SummaryField label="Vendor" value={bid.vendor.name} />
      <SummaryField label="Received" value={formatDateOnly(bid.received_date)} />
      <SummaryField label="Due" value={formatDateOnly(bid.due_date)} />
      <SummaryField label="Submitted" value={formatDateOnly(bid.submitted_date)} />
      <SummaryField label="Created By" value={bid.created_by} />
      <SummaryField label="Notes" value={bid.notes} />
    </div>
  )
}

function DraftMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="More options">
          <DotsThreeVerticalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilSimpleIcon />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <TrashIcon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BidDetailsContent({ bid }: { bid: BidDetail }): React.JSX.Element {
  const bidNumber = bid.bid_number
  const mutations = useBidMutations()
  const searchParams = useOptimisticSearchParams()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [metadataOpen, setMetadataOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [bulkDialog, setBulkDialog] = useState<BulkDialog | null>(null)
  const editorRegistry = useMemo(() => createPriceCellEditorRegistry<BidPriceField>(), [])
  const isDraft = bid.status === BID_STATUS.DRAFT
  const handleDelete = useEntityDelete(ENTITY_LABEL, bidNumber, bidNumber, mutations.remove)

  const saveField = useCallback(
    (rowId: number, field: BidPriceField, value: number | null) =>
      mutations.updateRows(bidNumber, { row_ids: [rowId], [field]: value }),
    [mutations, bidNumber],
  )
  const toggleZeroPrice = useCallback(
    (row: BidRow) =>
      mutations.updateRows(bidNumber, { row_ids: [row.id], zero_priced: !row.zero_priced }),
    [mutations, bidNumber],
  )
  const editing = useMemo<BidRowEditing | undefined>(
    () => (isDraft ? { editorRegistry, saveField, toggleZeroPrice } : undefined),
    [isDraft, editorRegistry, saveField, toggleZeroPrice],
  )
  const columns = useMemo(() => buildBidGridColumns(bid.headers, editing), [bid.headers, editing])

  const selectedRowIds = bid.rows.filter((row) => rowSelection[getBidRowId(row)]).map((r) => r.id)
  const [firstSelectedId, ...otherSelectedIds] = selectedRowIds
  const clearSelection = () => setRowSelection({})

  async function applyToSelection(update: {
    transport_cost?: number
    margin_percent?: number
    zero_priced?: boolean
  }) {
    if (firstSelectedId === undefined) return
    await mutations.updateRows(bidNumber, {
      row_ids: [firstSelectedId, ...otherSelectedIds],
      ...update,
    })
  }

  return (
    <GridPageContent className={selectedRowIds.length > 0 ? 'pb-24' : ''}>
      <GridDetailsPageHeader
        breadcrumbSegments={[{ label: 'Purchases', href: `/bids${queryStringFrom(searchParams)}` }]}
        title={`Bid ${bidNumber}`}
        copyValue={bidNumber}
        titleBadge={
          <>
            <BidStatusBadge status={bid.status} />
            {bid.outcome ? <BidOutcomeBadge outcome={bid.outcome} /> : null}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <UploadBidRowsDialog
                hasRows={bid.rows.length > 0}
                onUpload={(upload) => mutations.upload(bidNumber, upload)}
              />
            )}
            <BidLifecycleActions
              status={bid.status}
              rowCount={bid.rows.length}
              unpricedCount={bid.totals.unpriced_count}
              onReview={() => mutations.review(bidNumber)}
              onReturnToDraft={() => mutations.returnToDraft(bidNumber)}
              onSubmit={() => mutations.submit(bidNumber)}
              onConclude={(outcome) => mutations.conclude(bidNumber, outcome)}
            />
            {isDraft && (
              <DraftMenu
                onEdit={() => setMetadataOpen(true)}
                onDelete={() => setDeleteOpen(true)}
              />
            )}
          </div>
        }
        subtitle={<BidSubtitle bid={bid} />}
      />
      <EditBidMetadataModal
        open={metadataOpen}
        onOpenChange={setMetadataOpen}
        bid={bid}
        onSave={(metadata) => mutations.updateMetadata(bidNumber, metadata)}
      />
      <DeleteEntityDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entity="bid"
        entityId={bidNumber}
        onConfirm={handleDelete}
      >
        <AlertDialogDescription>
          This permanently removes the bid and its rows. It cannot be undone.
        </AlertDialogDescription>
      </DeleteEntityDialog>
      {bulkDialog === 'margin' && (
        <SetBidRowsMarginDialog
          onOpenChange={() => setBulkDialog(null)}
          rowCount={selectedRowIds.length}
          onApply={(margin) => applyToSelection({ margin_percent: margin })}
        />
      )}
      {bulkDialog === 'freight' && (
        <SetBidRowsFreightDialog
          onOpenChange={() => setBulkDialog(null)}
          rowCount={selectedRowIds.length}
          onApply={(freight) => applyToSelection({ transport_cost: freight })}
        />
      )}
      <PageSection>
        <BidTotalsStrip totals={bid.totals} />
      </PageSection>
      <DataGridWithoutResultCount
        label={TABLE_LABEL}
        columns={columns}
        data={bid.rows}
        getRowId={getBidRowId}
        textSearch={BID_ROW_TEXT_SEARCH}
        rowSelection={isDraft ? rowSelection : undefined}
        onRowSelectionChange={isDraft ? setRowSelection : undefined}
        renderToolbar={(table) => (
          <TableTextFilter
            table={table}
            placeholder="Search rows"
            clearLabel="Clear row search"
            className="w-64"
          />
        )}
        renderAboveTable={(table) => {
          if (!isDraft) return null
          const filteredRowIds = table.getFilteredRowModel().rows.map((row) => row.id)
          return (
            <BulkActionBar
              selectedCount={selectedRowIds.length}
              totalCount={filteredRowIds.length}
              hiddenCount={bid.rows.length - filteredRowIds.length}
              onSelectAll={() =>
                setRowSelection(Object.fromEntries(filteredRowIds.map((id) => [id, true])))
              }
              onClear={clearSelection}
              itemNoun={ROW_NOUN}
            >
              <Button variant="ghost" onClick={() => setBulkDialog('margin')}>
                Set margin
              </Button>
              <Button variant="ghost" onClick={() => setBulkDialog('freight')}>
                Set freight
              </Button>
              <Button variant="ghost" onClick={() => applyToSelection({ zero_priced: true })}>
                Set $0
              </Button>
            </BulkActionBar>
          )
        }}
      />
    </GridPageContent>
  )
}
