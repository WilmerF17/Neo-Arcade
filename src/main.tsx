import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// PWA auto-update: cuando hay nueva versión, avisa y recarga
const updateSW = registerSW({
  onNeedRefresh() {
    if(confirm('¡Nueva versión de Neo Elite 250 disponible! ¿Actualizar ahora?')) updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] Listo para offline')
  },
})
