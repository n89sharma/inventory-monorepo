import { SidebarProvider } from "@/components/shadcn/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { Toaster } from "sonner"

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <Toaster />
      <div className="flex flex-col w-full">
        <Header className="sticky top-0 bg-background" />
        <main className="p-4 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}