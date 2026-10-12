import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { I18nProvider } from '@/shared/lib/i18n'
import { ConfirmProvider } from '@/shared/ui/confirm'
import { ToastProvider } from '@/shared/ui/toast'
import { CurrentCourseProvider } from '@/entities/course'
import { AuthProvider } from '@/entities/user'
import { AppRoutes } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } },
})

// A data router (rather than <BrowserRouter>) is needed for useBlocker; the app's own routes live in AppRoutes.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    ),
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ToastProvider>
          <ConfirmProvider>
            <CurrentCourseProvider>
              <RouterProvider router={router} />
            </CurrentCourseProvider>
          </ConfirmProvider>
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)

// Makes the app installable and lets the shell load offline. Skipped in dev, where it would cache stale modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
