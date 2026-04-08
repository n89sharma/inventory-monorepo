interface OptionalSectionProps {
  condition: boolean
  fallback: string
  children: React.ReactNode
}

export function OptionalSection({ condition, fallback, children }: OptionalSectionProps) {
  return condition
    ? <>{children}</>
    : <p className="text-sm text-muted-foreground py-1">{fallback}</p>
}
