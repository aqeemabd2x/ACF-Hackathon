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
            background: '#1c1114',
            color: '#f0dfe0',
            border: '1px solid #3d2226',
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1c1114' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1c1114' },
          },
        }}
      />
    </>
  )
}
