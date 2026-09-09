import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { CommandResultList } from './command-result-list'
import {
  getActiveTabItems,
  getSearchResultColumns,
  getSearchResultKey,
  type FlatResult,
  type SearchResultTab,
} from './search-results'

type ResultListProps = {
  items: FlatResult[]
  listboxId: string
  highlightedIndex: number
  onSelect: (item: FlatResult) => void
  onHover?: (item: FlatResult) => void
}

function ResultList({ items, listboxId, highlightedIndex, onSelect, onHover }: ResultListProps) {
  return (
    <CommandResultList
      items={items}
      listboxId={listboxId}
      highlightedIndex={highlightedIndex}
      getKey={getSearchResultKey}
      getColumns={getSearchResultColumns}
      onSelect={onSelect}
      onHover={onHover}
    />
  )
}

type SearchPopoverContentProps = Omit<ResultListProps, 'items'> & {
  isLoading: boolean
  tabs: SearchResultTab[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export function SearchPopoverContent({
  isLoading,
  tabs,
  activeTab,
  onTabChange,
  listboxId,
  highlightedIndex,
  onSelect,
  onHover,
}: SearchPopoverContentProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <CircleNotchIcon className="animate-spin" size={16} />
      </div>
    )
  }

  if (!tabs.some((tab) => tab.items.length > 0)) {
    return <p className="py-6 text-center text-muted-foreground">No results</p>
  }

  // A single eligible entity type makes the tab strip decoration.
  if (tabs.length === 1) {
    return (
      <ResultList
        items={getActiveTabItems(tabs, activeTab)}
        listboxId={listboxId}
        highlightedIndex={highlightedIndex}
        onSelect={onSelect}
        onHover={onHover}
      />
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.type}
            value={tab.type}
            disabled={tab.items.length === 0}
            className="cursor-pointer"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.type} value={tab.type}>
          <ResultList
            items={tab.items}
            listboxId={listboxId}
            highlightedIndex={highlightedIndex}
            onSelect={onSelect}
            onHover={onHover}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
