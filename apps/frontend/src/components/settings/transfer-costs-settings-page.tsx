import { EditTransferCostModal } from '@/components/settings/edit-transfer-cost-modal'
import { SettingsListPage } from '@/components/settings/settings-list-page'
import {
  createTransferCostTableColumns,
  type WarehouseTransferCostRow,
} from '@/components/settings/transfer-cost-table-columns'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useCan } from '@/hooks/use-can'
import { useWarehouseTransferCosts, warehouseCostsOf } from '@/hooks/use-transfer-costs'
import { useCallback, useMemo, useState } from 'react'

const TABLE_LABEL = 'Transfer Costs'

const TRANSFER_COST_DEFAULT_SORT = { id: 'warehouse_label', desc: false }

export function TransferCostsSettingsPage(): React.JSX.Element {
  const [editTarget, setEditTarget] = useState<WarehouseTransferCostRow | null>(null)

  const canEdit = useCan('update_settings')
  const handleEdit = useCallback((row: WarehouseTransferCostRow) => setEditTarget(row), [])
  const columns = useMemo(
    () => createTransferCostTableColumns(canEdit ? handleEdit : undefined),
    [canEdit, handleEdit],
  )

  const warehouses = useActiveWarehouses()
  const transferCosts = useWarehouseTransferCosts()
  const rows = useMemo(
    () =>
      warehouses
        .map((warehouse) => ({
          warehouse,
          warehouse_label: `${warehouse.city_code} — ${warehouse.street}`,
          ...warehouseCostsOf(transferCosts, warehouse.id),
        }))
        .sort((a, b) => a.warehouse_label.localeCompare(b.warehouse_label)),
    [warehouses, transferCosts],
  )

  return (
    <>
      <SettingsListPage
        title="Transfer Costs"
        label={TABLE_LABEL}
        columns={columns}
        data={rows}
        defaultSort={TRANSFER_COST_DEFAULT_SORT}
        getRowId={(row) => row.warehouse.id.toString()}
      />

      {editTarget && (
        <EditTransferCostModal
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          row={editTarget}
        />
      )}
    </>
  )
}
