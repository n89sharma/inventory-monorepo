import type { User } from 'shared-types'
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/card'

export function UserCard({ title, user }: { title: string, user: User }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{user.name}</span>
        <span className="text-muted-foreground">{user.email}</span>
      </CardContent>
    </Card>
  )
}
