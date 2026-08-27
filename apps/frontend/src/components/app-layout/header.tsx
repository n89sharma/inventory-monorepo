import { GlobalSearch } from '@/components/global-search/global-search'
import { getEnvHeaderBg } from '@/lib/environment'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps): React.JSX.Element {
  return (
    <header
      className={cn(
        'flex flex-row items-center justify-center px-4 py-2 gap-4 border-b',
        className,
        getEnvHeaderBg(),
      )}
    >
      <GlobalSearch />
    </header>
  )
}
