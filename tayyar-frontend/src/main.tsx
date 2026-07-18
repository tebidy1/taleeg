import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Note: StrictMode removed intentionally — it causes double WebSocket
// connections (double useEffect invocations) in development mode.
createRoot(document.getElementById('root')!).render(
  <App />
)
