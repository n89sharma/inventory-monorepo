import type { User } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card'
import { DataRowContainer } from '../asset-details/detail-layout'
import { DataValueRow } from '../asset-details/detail-row'

export function UserCard({ title, user }: { title: string, user: User }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataRowContainer>
          <DataValueRow label="Name" value={user.name} />
          <DataValueRow label="Email" value={user.email} />
        </DataRowContainer>
      </CardContent>
    </Card>
  )
}
