import { TooltipProvider } from "@/components/shadcn/tooltip.tsx"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app'
import '@/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>
)