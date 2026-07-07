import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'

export default function App() {
  return (
    <>
      <AppLayout />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#131328',
            color: '#dde3f0',
            border: '1px solid #2a2a4a',
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#131328' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#131328' },
          },
        }}
      />
    </>
  )
}
