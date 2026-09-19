import { useEffect, useState } from 'react'

export default function PWAInstall(){
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(()=>{
    const onBefore = (e:any)=>{ e.preventDefault(); setDeferred(e); setShow(true) }
    const onInstalled = ()=>{ setInstalled(true); setShow(false); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    // Si ya está en modo standalone, no mostrar
    if(window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    return()=>{ window.removeEventListener('beforeinstallprompt', onBefore); window.removeEventListener('appinstalled', onInstalled) }
  },[])

  if(installed || !show || !deferred) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] glass rounded-2xl border border-cyan-400/30 px-4 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(0,255,255,0.3)] max-w-[92vw]">
      <span className="text-xl">📲</span>
      <div className="text-left">
        <p className="font-black text-white text-xs tracking-widest" style={{fontFamily:'Orbitron'}}>INSTALAR NEO ARCADE</p>
        <p className="text-[11px] font-mono text-white/60">Juega offline • PC y móvil • 1 click</p>
      </div>
      <button onClick={async()=>{ deferred.prompt(); const {outcome}=await deferred.userChoice; if(outcome==='accepted') setShow(false); setDeferred(null)}} className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-xs tracking-widest hover:scale-105 transition">INSTALAR</button>
      <button onClick={()=>setShow(false)} className="w-7 h-7 rounded-full glass flex items-center justify-center text-white/60 hover:bg-white/10">✕</button>
    </div>
  )
}
