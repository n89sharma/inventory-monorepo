import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { SidebarProvider } from "@/components/shadcn/sidebar"
import { Toaster } from "sonner"

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
      <div className="flex flex-col w-full">
        <Header className="sticky top-0 z-10 bg-background" />
        <main id="main-content" className="p-4 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}