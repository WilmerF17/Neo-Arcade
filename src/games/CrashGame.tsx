import { useState, useEffect } from 'react'
export default function CrashGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [mult,setMult]=useState(1.0)
  const [bet,setBet]=useState(10)
  const [running,setRunning]=useState(false)
  const [crashed,setCrashed]=useState(false)
  const [cashed,setCashed]=useState(false)
  useEffect(()=>{
    if(!running) return
    const crashAt=1.2 + Math.random()*4
    const iv=setInterval(()=>{
      setMult(m=>{
        const nm=+(m*1.08).toFixed(2)
        if(nm>=crashAt){
          clearInterval(iv)
          setRunning(false); setCrashed(true)
          if(!cashed) onScore(0)
        }
        return nm>=crashAt? crashAt : nm
      })
    },180)
    return()=>clearInterval(iv)
  },[running, cashed, onScore])
  const start=()=>{
    if(!isStarted) return
    if(onBet && !onBet(bet)) return
    if(onBet && !onBet(bet)) return
    setMult(1.0); setRunning(true); setCrashed(false); setCashed(false)
  }
  const cash=()=>{
    if(!running || cashed) return
    setCashed(true); setRunning(false)
    const win=Math.floor(bet*mult)
    onScore(win)
  }
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-red-400/20 max-w-[360px] w-full">
      <div className="text-4xl font-black" style={{fontFamily:'Orbitron', color: crashed? '#ff3355' : '#00ff88'}}>{mult.toFixed(2)}x</div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-red-500 transition-all" style={{width: `${Math.min(100, (mult/5)*100)}%`}}/></div>
      <p className="text-xs font-mono text-white/60">{running?'🚀 Subiendo...': crashed?'💥 CRASH!':'Listo'}</p>
      <div className="flex gap-2">{[10,50,100].map(v=><button key={v} onClick={()=>!running && setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-red-500 text-white':'glass text-white/60'}`}>{v}</button>)}</div>
      <div className="flex gap-2">
        {!running ? <button onClick={start} disabled={!isStarted} className="px-6 py-2 rounded-full bg-white text-black font-black text-xs">LANZAR 🚀</button> : <button onClick={cash} className="px-8 py-2 rounded-full bg-emerald-400 text-black font-black text-xs">RETIRAR</button>}
      </div>
      <p className="text-[11px] font-mono text-white/40">Retira antes del crash • x1.08 cada tick</p>
    </div>
  )
}
