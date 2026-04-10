import type { OrgDetail } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card'
import { DataRowContainer } from '../asset-details/detail-layout'
import { DataValueRow } from '../asset-details/detail-row'

export function Organization({ title, org }: { title: string, org: OrgDetail }) {

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataRowContainer>
          <DataValueRow label="Name" value={org.name} />
          <DataValueRow label="Phone" value={org.phone} />
          <DataValueRow label="Email" value={org.primary_email} />
          <DataValueRow label="Account" value={org.account_number} />
          <DataValueRow label="Address" value={org.address} />
        </DataRowContainer>
      </CardContent>
    </Card>
  )
}
