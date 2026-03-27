import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar"
import { Badge } from "@/components/shadcn/badge"
import { Card, CardContent, CardHeader } from "@/components/shadcn/card"
import { cn } from "@/lib/utils"

type CommentProps = {
  avatarFallback: string,
  user: string,
  date: string,
  tags: { display: string, id: string }[],
  comment: string,
  className?: string
}

export function Comment({
  avatarFallback,
  user,
  date,
  tags = [],
  comment,
  className
}: CommentProps) {
  return (
    <Card className={cn("flex flex-col p-2 gap-1 rounded-sm ring-0", className)}>
      <CardHeader className={cn("flex flex-row gap-4 p-0", className)}>
        <Avatar className="h-8 w-8">
          <AvatarImage src="" />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex flex-row gap-4">
            <span className="text-sm font-semibold">{user}</span>
            <span className="text-sm text-muted-foreground">{date}</span>
          </div>
          <div className="flex flex-row gap-2">
            {
              tags.map((tag) => (
                <Badge variant="outline" key={tag.id}>{tag.display}</Badge>
              ))
            }
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-12">
        <p>{comment}</p>
      </CardContent>
    </Card>
  )
}