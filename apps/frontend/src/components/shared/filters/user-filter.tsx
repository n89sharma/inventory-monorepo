import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useUsers } from '@/hooks/use-user'
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
  const allUsers = useUsers()
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
