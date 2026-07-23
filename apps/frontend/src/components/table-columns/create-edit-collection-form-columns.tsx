import { Button } from '@/components/shadcn/button'
import { ReadinessIcon } from '@/components/shared/readiness/readiness-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatLocation, formatThousandsK, formatTitleCase } from '@/lib/formatters'
import type { DepartureFormAsset } from '@/ui-types/departure-form-types'
import { TrashIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { AssetSummary } from 'shared-types'
import { createSelectColumn } from './column-primitives'

function getCommonLeadingColumns<T extends AssetSummary>(): ColumnDef<T>[] {
  return [
    {
      accessorKey: 'barcode',
      header: 'Barcode',
    },
    {
      accessorKey: 'brand',
      header: 'Brand',
      cell: ({ row }) => formatTitleCase(row.original.brand),
    },
    {
      accessorKey: 'model',
      header: 'Model',
    },
    {
      accessorKey: 'serial_number',
      header: 'Serial Number',
    },
    {
      accessorKey: 'meter_total',
      header: 'Total Meter',
      cell: ({ row }) => formatThousandsK(row.getValue('meter_total')),
    },
  ]
}

function getReadinessColumn<T extends AssetSummary>(): ColumnDef<T> {
  return {
    accessorKey: 'readiness',
    header: 'Readiness',
    cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
  }
}

function getLocationColumn<T extends AssetSummary>(): ColumnDef<T> {
  return {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => formatLocation(row.original.location),
  }
}

function getDeleteColumn<T>(onDelete: (index: number) => void): ColumnDef<T> {
  return {
    id: 'delete',
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="icon"
        type="button"
        aria-label="Remove asset"
        onClick={() => onDelete(row.index)}
      >
        <TrashIcon />
      </Button>
    ),
  }
}

export function getFormAssetColumns(onDelete: (index: number) => void): ColumnDef<AssetSummary>[] {
  return [
    ...getCommonLeadingColumns<AssetSummary>(),
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    getReadinessColumn<AssetSummary>(),
    getLocationColumn<AssetSummary>(),
    getDeleteColumn<AssetSummary>(onDelete),
  ]
}

export function getDepartureFormAssetColumns(
  onDelete: (index: number) => void,
): ColumnDef<DepartureFormAsset>[] {
  return [
    createSelectColumn<DepartureFormAsset>(),
    ...getCommonLeadingColumns<DepartureFormAsset>(),
    {
      accessorKey: 'outgoing_status',
      header: 'Outgoing Status',
      cell: ({ row }) => <StatusBadge status={row.original.outgoing_status} />,
    },
    getReadinessColumn<DepartureFormAsset>(),
    getLocationColumn<DepartureFormAsset>(),
    getDeleteColumn<DepartureFormAsset>(onDelete),
  ]
}
