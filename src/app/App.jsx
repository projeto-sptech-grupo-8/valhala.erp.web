import '@/app/styles/App.module.css'
import { ToastProvider } from '@/shared/ui/notifications/ToastProvider.jsx'
import AppRouter from '@/app/AppRouter.jsx'

export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  )
}
