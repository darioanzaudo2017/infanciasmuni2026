import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
  // Captura el 10% de transacciones en producción para performance
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Session replay solo en producción, 1% normal + 100% en errores
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  enabled: import.meta.env.PROD,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="text-center space-y-4 max-w-md px-6">
        <span className="material-symbols-outlined text-5xl text-red-400">error</span>
        <h1 className="text-xl font-bold text-slate-700">Ocurrió un error inesperado</h1>
        <p className="text-sm text-slate-500">El equipo fue notificado automáticamente. Podés recargar la página para continuar.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold"
        >
          Recargar página
        </button>
      </div>
    </div>
  )
}
