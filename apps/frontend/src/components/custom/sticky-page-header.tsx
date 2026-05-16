type StickyPageHeaderProps = {
  children: React.ReactNode
}

export function StickyPageHeader({ children }: StickyPageHeaderProps): React.JSX.Element {
  return (
    <div className="sticky top-[var(--app-header-height)] z-10 bg-background border-b">
      <div className="max-w-5xl mx-auto w-full px-4 pt-4 pb-3 flex flex-col gap-2">
        {children}
      </div>
    </div>
  )
}
