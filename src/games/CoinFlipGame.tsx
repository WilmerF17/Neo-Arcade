import { useState } from 'react'
export default function CoinFlipGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [bet,setBet]=useState(10)
  const [choice,setChoice]=useState<'cara'|'cruz'>('cara')
  const [flipping,setFlipping]=useState(false)
  const [result,setResult]=useState<'cara'|'cruz'|null>(null)
  const flip=()=>{
    if(flipping || !isStarted) return
    if(onBet && !onBet(bet)) return
    setFlipping(true)
    setResult(null)
    setTimeout(()=>{
      const r=Math.random()<0.5?'cara':'cruz'
      setResult(r)
      setFlipping(false)
      if(r===choice) onScore(bet*2)
      else onScore(0)
    },900)
  }
  return (
    <div className="flex flex-col items-center gap-4 p-4 glass rounded-2xl border border-fuchsia-400/20 max-w-[320px] w-full">
      <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-black transition-all ${flipping?'animate-spin border-fuchsia-400':'border-white/10 glass'}`} style={{transform: flipping?'rotateY(720deg)':''}}>{result ? (result==='cara'?'👑':'🌙') : '🪙'}</div>
      <p className="font-black text-white tracking-widest" style={{fontFamily:'Orbitron'}}>{result? result.toUpperCase() : 'ELIGE'}</p>
      <div className="flex gap-2">
        {(['cara','cruz'] as const).map(c=>(
          <button key={c} onClick={()=>setChoice(c)} className={`px-6 py-1.5 rounded-full text-xs font-black capitalize ${choice===c?'bg-fuchsia-500 text-white':'glass text-white/70'}`}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2">{[10,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-fuchsia-500 text-white':'glass text-white/60'}`}>{v}</button>)}</div>
      <button onClick={flip} disabled={flipping || !isStarted} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white font-black text-xs tracking-widest disabled:opacity-40">{flipping?'GIRANDO...':'LANZAR 🪙'}</button>
      <p className="text-[11px] font-mono text-white/40">Acierta x2 • 50/50</p>
    </div>
  )
}
