export default function PlaceholderGame({ onScore, isStarted, title }: { onScore:(s:number)=>void, isStarted:boolean, title?:string }){
  return (
    <div className="flex flex-col items-center gap-4 p-8 glass rounded-2xl border border-white/10 max-w-[360px] w-full text-center">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-2xl border border-white/10">🧩</div>
      <h3 className="font-black text-white" style={{fontFamily:'Orbitron'}}>{title || 'PRÓXIMAMENTE'}</h3>
      <p className="text-xs font-mono text-white/60 leading-relaxed">Cabina ELITE en desarrollo. ¡250 juegos totales! Vota en Discord cuál quieres primero.</p>
      <button disabled={!isStarted} onClick={()=>onScore(10)} className="px-6 py-2 rounded-full glass text-white/40 text-xs font-mono">Reservar (demo +10)</button>
      <p className="text-[10px] font-mono text-white/30">Espacio optimizado • Grid virtualizado • Próximamente</p>
    </div>
  )
}
