import type { OrgDetail } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card'
import { DataRowContainer } from '../asset-details/detail-layout'
import { DataValueRow } from '../asset-details/detail-row'

export function Organization({ title, org }: { title: string, org: OrgDetail }) {

  return (
    <Card className="flex-1 gap-2">
      <CardHeader>
        <CardTitle>{`${title}: ${org.name}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataRowContainer className="gap-0">
          <DataValueRow label="Phone" value={org.phone} labelClassName="min-w-20" />
          <DataValueRow label="Email" value={org.primary_email} labelClassName="min-w-20" />
          <DataValueRow label="Account" value={org.account_number} labelClassName="min-w-20" />
        </DataRowContainer>
      </CardContent>
    </Card>
  )
}
