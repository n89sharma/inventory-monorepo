import type { Warehouse } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/card'

export function WarehouseCard({ title, warehouse }: { title: string, warehouse: Warehouse | null }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{warehouse?.city_code}</span>
        <span className="text-muted-foreground">{warehouse?.street}</span>
      </CardContent>
    </Card>
  )
}
