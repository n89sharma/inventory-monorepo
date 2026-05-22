import { cn } from "@/lib/utils"

type PageContentProps = {
  children: React.ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps): React.JSX.Element {
  return (
    <div className={cn("max-w-7xl mx-auto w-full px-4 py-4", className)}>
      {children}
    </div>
  )
}
