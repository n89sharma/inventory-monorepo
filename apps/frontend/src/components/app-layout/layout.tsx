import { AppSidebar } from '@/components/app-layout/app-sidebar'
import { Header } from '@/components/app-layout/header'
import { SidebarProvider } from '@/components/shadcn/sidebar'
import { Toaster } from 'sonner'

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <Toaster />
      <div className="flex h-svh flex-col w-full min-w-0">
        <Header className="shrink-0 bg-background" />
        {/* The app's only scrollport. Grid pages fill it exactly and scroll inside their own
            grid instead; every other page scrolls here. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-h-0 w-full min-w-0 overflow-auto text-sm focus:outline-none"
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
