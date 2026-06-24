import { SearchSelectInput } from '@/components/custom/search-select-input'
import { useUserStore } from '@/data/store/user-store'
import { useState } from 'react'
import type { User } from 'shared-types'

export function UserFilter({
  selection,
  onSelectionChange,
  onClear,
  placeholder,
  clearLabel,
}: {
  selection: User | null
  onSelectionChange: (user: User) => void
  onClear: () => void
  placeholder: string
  clearLabel: string
}): React.JSX.Element {
  const allUsers = useUserStore((state) => state.users)
  const [query, setQuery] = useState('')

  return (
    <SearchSelectInput
      selection={selection}
      query={query}
      onSelectionChange={(u) => {
        setQuery('')
        onSelectionChange(u)
      }}
      onQueryChange={setQuery}
      onClear={() => {
        setQuery('')
        onClear()
      }}
      options={allUsers}
      getLabel={(u) => u.name}
      placeholder={placeholder}
      clearLabel={clearLabel}
      className="w-35"
    />
  )
}
