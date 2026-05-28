import { StickyPageHeader } from "@/components/custom/sticky-page-header"
import { PageContent } from "@/components/layout/page-content"

export function ReportsPage(): React.JSX.Element {
  return (
    <>
      <StickyPageHeader>
        <h1 className="text-2xl font-semibold">Reports</h1>
      </StickyPageHeader>
      <PageContent>
        <p className="text-muted-foreground">Coming soon</p>
      </PageContent>
    </>
  )
}
