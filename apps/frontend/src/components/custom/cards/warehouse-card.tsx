import type { Warehouse } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card'
import { DataRowContainer } from '../asset-details/detail-layout'
import { DataValueRow } from '../asset-details/detail-row'

export function WarehouseCard({ title, warehouse }: { title: string, warehouse: Warehouse | null }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataRowContainer>
          <DataValueRow label="Code" value={warehouse?.city_code} />
          <DataValueRow label="Street" value={warehouse?.street} />
        </DataRowContainer>
      </CardContent>
    </Card>
  )
}
