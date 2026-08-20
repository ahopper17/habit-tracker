import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registered only in production builds. In dev, Vite serves unbundled modules
// and drives HMR over its own connection — a caching worker sitting in front of
// that would serve stale modules and make edits appear not to apply.
//
// BASE_URL keeps the path correct on GitHub Pages ("/habit-tracker/sw.js"),
// and registering after `load` keeps the request from competing with first paint.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.warn('[habit-tracker] service worker failed to register', err))
  })
}
