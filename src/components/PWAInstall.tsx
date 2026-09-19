import { useEffect, useState } from 'react'

export default function PWAInstall(){
  const [deferred, setDeferred] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isOperaGX, setIsOperaGX] = useState(false)

  useEffect(()=>{
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1))
    setIsOperaGX(/OPR|Opera/.test(navigator.userAgent))
    if(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) setInstalled(true)
    const onBefore = (e:any)=>{ e.preventDefault(); setDeferred(e); setShowBanner(true) }
    const onInstalled = ()=>{ setInstalled(true); setShowBanner(false); setDeferred(null); setShowModal(false) }
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    return()=>{ window.removeEventListener('beforeinstallprompt', onBefore); window.removeEventListener('appinstalled', onInstalled) }
  },[])

  if(installed) return null

  const handleDownload = async ()=>{
    if(deferred){
      deferred.prompt()
      const {outcome}=await deferred.userChoice
      if(outcome==='accepted') { setShowBanner(false); setDeferred(null) }
    } else {
      setShowModal(true)
    }
  }

  return (
    <>
      {/* Banner automático cuando Chrome/Edge detecta PWA */}
      {showBanner && deferred && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] glass rounded-2xl border border-cyan-400/30 px-4 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(0,255,255,0.3)] max-w-[92vw] animate-float">
          <span className="text-xl">📲</span>
          <div className="text-left">
            <p className="font-black text-white text-xs tracking-widest" style={{fontFamily:'Orbitron'}}>INSTALAR NEO ARCADE</p>
            <p className="text-[11px] font-mono text-white/60">Juega offline • PC y móvil • 1 click</p>
          </div>
          <button onClick={handleDownload} className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-xs tracking-widest hover:scale-105 transition">INSTALAR</button>
          <button onClick={()=>setShowBanner(false)} aria-label="Cerrar" className="w-7 h-7 rounded-full glass flex items-center justify-center text-white/60 hover:bg-white/10">✕</button>
        </div>
      )}

      {/* Botón DESCARGAR universal siempre visible (PC y móvil, todos los navegadores) */}
      <button
        onClick={handleDownload}
        aria-label="Descargar aplicación NEO ARCADE"
        className="fixed bottom-4 right-4 z-[69] md:bottom-6 md:right-6 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-xs tracking-widest shadow-[0_0_24px_rgba(0,255,255,0.5)] hover:scale-105 transition flex items-center gap-2 border border-white/20"
        title="Descargar app en PC y móvil"
      >
        <span className="text-base">⬇️</span> DESCARGAR APP
      </button>

      {/* Modal instrucciones por navegador */}
      {showModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={()=>setShowModal(false)}/>
          <div className="relative glass rounded-[22px] border border-cyan-400/30 max-w-[480px] w-full p-6 shadow-[0_0_40px_rgba(0,255,255,0.2)]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-white text-lg" style={{fontFamily:'Orbitron'}}>📲 INSTALAR NEO ARCADE</h3>
                <p className="text-xs font-mono tracking-widest text-cyan-300 mt-1">Funciona en todos los navegadores • Sin tienda • Offline</p>
              </div>
              <button onClick={()=>setShowModal(false)} aria-label="Cerrar" className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:bg-white/10">✕</button>
            </div>

            {isIOS ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm font-bold text-white" style={{fontFamily:'Orbitron'}}>iPhone / iPad (Safari):</p>
                <ol className="space-y-2 text-sm font-mono text-white/75 list-decimal list-inside">
                  <li>Pulsa el botón <span className="text-cyan-300 font-bold">Compartir ⎙</span> abajo en Safari</li>
                  <li>Desliza y pulsa <span className="text-cyan-300 font-bold">Añadir a pantalla de inicio</span></li>
                  <li>Pulsa <span className="text-cyan-300 font-bold">Añadir</span> → ¡App en tu inicio!</li>
                </ol>
                <div className="glass rounded-xl p-3 border border-white/10 mt-2">
                  <p className="text-xs font-mono text-white/60">💡 También funciona en Chrome iOS: menú ⋮ → Añadir a pantalla de inicio</p>
                </div>
              </div>
            ) : isOperaGX ? (
              <div className="mt-5 space-y-4">
                <div className="glass rounded-xl p-3 border border-red-400/20 bg-red-400/10">
                  <p className="text-sm font-bold text-white" style={{fontFamily:'Orbitron'}}>🎮 Opera GX detectado — ¡100% compatible!</p>
                  <p className="text-xs font-mono text-white/70 mt-1">Opera GX es Chromium, usa el mismo motor que Chrome/Edge.</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{fontFamily:'Orbitron'}}>Opera GX (PC):</p>
                  <ol className="space-y-2 text-sm font-mono text-white/75 list-decimal list-inside">
                    <li>Si ves el banner pulsa <span className="text-cyan-300 font-bold">INSTALAR</span> (recomendado)</li>
                    <li>Si no: mira la barra de direcciones → icono <span className="text-cyan-300">⬇️/⊕ Instalar</span> a la derecha → Click</li>
                    <li>Alternativa: menú <span className="text-cyan-300 font-bold">O Menu ≡ (arriba izquierda)</span> → <span className="text-cyan-300 font-bold">Instalar NEO ARCADE</span> o <span className="text-cyan-300 font-bold">Añadir a pantalla de inicio</span></li>
                  </ol>
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{fontFamily:'Orbitron'}}>Opera GX Mobile (Android/iOS):</p>
                  <ol className="space-y-2 text-sm font-mono text-white/75 list-decimal list-inside">
                    <li>Menú <span className="text-cyan-300 font-bold">⋮</span> → <span className="text-cyan-300 font-bold">Añadir a pantalla de inicio</span></li>
                    <li>Confirma → aparece como app nativa con icono NEO ARCADE</li>
                  </ol>
                </div>
                <div className="glass rounded-xl p-3 border border-emerald-400/20 bg-emerald-400/10">
                  <p className="text-xs font-mono text-emerald-300">✅ En Opera GX funciona offline, con GX Control y limitador. ¡Igual que en Chrome!</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-white" style={{fontFamily:'Orbitron'}}>Android / Chrome / Edge / Brave (PC):</p>
                  <ol className="space-y-2 text-sm font-mono text-white/75 list-decimal list-inside">
                    <li>Si ves el banner arriba pulsa <span className="text-cyan-300 font-bold">INSTALAR</span></li>
                    <li>Si no: menú <span className="text-cyan-300 font-bold">⋮</span> arriba derecha → <span className="text-cyan-300 font-bold">Instalar NEO ARCADE</span> o <span className="text-cyan-300 font-bold">Añadir a pantalla de inicio</span></li>
                    <li>En PC verás icono <span className="text-cyan-300">⬇️</span> en la barra de direcciones → Click Instalar</li>
                  </ol>
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{fontFamily:'Orbitron'}}>Firefox / Otros:</p>
                  <ol className="space-y-2 text-sm font-mono text-white/75 list-decimal list-inside">
                    <li>Menú <span className="text-cyan-300 font-bold">☰</span> → <span className="text-cyan-300 font-bold">Añadir a pantalla de inicio</span> o marca como favorito</li>
                    <li>En PC puedes usar Chrome/Edge/Opera GX para instalar como PWA completa</li>
                  </ol>
                </div>
                <div className="glass rounded-xl p-3 border border-emerald-400/20 bg-emerald-400/10">
                  <p className="text-xs font-mono text-emerald-300">✅ Una vez instalada, juega offline, a pantalla completa y sin barra del navegador — como app nativa.</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button onClick={()=>setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-full bg-white text-black font-black text-xs tracking-widest">ENTENDIDO</button>
              {deferred && <button onClick={handleDownload} className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-xs tracking-widest">INSTALAR AHORA</button>}
            </div>
            <p className="text-[11px] font-mono text-white/30 text-center mt-3">PWA 100% segura • Sin permisos raros • 39 archivos precacheados • Funciona offline</p>
          </div>
        </div>
      )}
    </>
  )
}
