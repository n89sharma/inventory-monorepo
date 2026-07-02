import { Button } from '@/components/shadcn/button'
import { ReadinessIcon } from '@/components/shared/readiness/readiness-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatLocation, formatThousandsK, formatTitleCase } from '@/lib/formatters'
import type { DepartureFormAsset } from '@/ui-types/departure-form-types'
import { TrashIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { AssetSummary } from 'shared-types'
import { createSelectColumn } from './shared-columns'

function getCommonLeadingColumns<T extends AssetSummary>(): ColumnDef<T>[] {
  return [
    {
      accessorKey: 'barcode',
      header: 'Barcode',
      size: 160,
    },
    {
      accessorKey: 'brand',
      header: 'Brand',
      cell: ({ row }) => formatTitleCase(row.original.brand),
      size: 80,
    },
    {
      accessorKey: 'model',
      header: 'Model',
      size: 110,
    },
    {
      accessorKey: 'serial_number',
      header: 'Serial Number',
      size: 100,
    },
    {
      accessorKey: 'meter_total',
      header: 'Total Meter',
      cell: ({ row }) => formatThousandsK(row.getValue('meter_total')),
      size: 60,
    },
  ]
}

function getReadinessColumn<T extends AssetSummary>(): ColumnDef<T> {
  return {
    accessorKey: 'readiness',
    header: 'Readiness',
    cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
    size: 80,
  }
}

function getLocationColumn<T extends AssetSummary>(): ColumnDef<T> {
  return {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => formatLocation(row.original.location),
    size: 140,
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
    size: 50,
  }
}

export function getFormAssetColumns(onDelete: (index: number) => void): ColumnDef<AssetSummary>[] {
  return [
    ...getCommonLeadingColumns<AssetSummary>(),
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 80,
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
      size: 120,
    },
    getReadinessColumn<DepartureFormAsset>(),
    getLocationColumn<DepartureFormAsset>(),
    getDeleteColumn<DepartureFormAsset>(onDelete),
  ]
}
