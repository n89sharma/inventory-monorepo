import { Button } from "@/components/shadcn/button"

interface QuickSearchButtonsProps {
  days: [number, number, number]
  onSearch: (days: number) => void
}

export function QuickSearchButtons({ days, onSearch }: QuickSearchButtonsProps) {
  return (
    <div>
      <Button variant="secondary" className="rounded-r-none" onClick={() => onSearch(days[0])}>{days[0]}d</Button>
      <Button variant="secondary" className="rounded-none" onClick={() => onSearch(days[1])}>{days[1]}d</Button>
      <Button variant="secondary" className="rounded-l-none" onClick={() => onSearch(days[2])}>{days[2]}d</Button>
    </div>
  )
}
