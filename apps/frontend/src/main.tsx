import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from "@/components/shadcn/tooltip.tsx"

import '@/global.css'
import App from '@/app.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>
)