import type { Warehouse } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card'
import { DataRowContainer } from '../asset-details/detail-layout'
import { DataValueRow } from '../asset-details/detail-row'

export function WarehouseCard({ title, warehouse }: { title: string, warehouse: Warehouse | null }) {
  return (
    <Card className="flex-1 gap-2">
      <CardHeader>
        <CardTitle>{`${title}:${warehouse?.city_code}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataRowContainer className="gap-0">
          <DataValueRow label="Street" value={warehouse?.street} labelClassName="min-w-20" />
        </DataRowContainer>
      </CardContent>
    </Card>
  )
}
