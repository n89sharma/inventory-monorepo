interface OptionalSectionProps {
  condition: boolean
  fallback: string
  children: React.ReactNode
}

export function OptionalSection({ condition, fallback, children }: OptionalSectionProps) {
  if (condition) return <>{children}</>
  return <p className="text-muted-foreground py-1">{fallback}</p>
}
