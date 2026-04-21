import { TooltipProvider } from "@/components/shadcn/tooltip.tsx"
import { ClerkProvider } from '@clerk/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app'
import '@/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        localization={{ signIn: { start: { subtitle: '' } } }}
      >
        <App />
      </ClerkProvider>
    </TooltipProvider>
  </StrictMode>
)