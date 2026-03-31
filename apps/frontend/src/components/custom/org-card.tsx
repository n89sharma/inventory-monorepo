import type { OrgDetail } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/card'

export function OrgCard({ title, org }: { title: string, org: OrgDetail }) {
  const addressLines = [
    org.address,
    [org.city, org.province].filter(Boolean).join(', '),
    org.country
  ].filter(Boolean)

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{org.name}</span>
        {addressLines.map((line, i) => (
          <span key={i} className="text-muted-foreground">{line}</span>
        ))}
        {org.primary_email && <span>{org.primary_email}</span>}
        {org.phone && <span>{org.phone}</span>}
      </CardContent>
    </Card>
  )
}
