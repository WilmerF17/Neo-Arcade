import { useState, useEffect, useCallback } from 'react'
export default function SlotsGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [reels,setReels]=useState([0,0,0])
  const [spinning,setSpinning]=useState(false)
  const [bet,setBet]=useState(10)
  const [coinsWon,setCoinsWon]=useState(0)
  const symbols=['🍒','🍋','🔔','⭐','7️⃣','💎']
  const spin=useCallback(()=>{
    if(spinning) return
    if(onBet && !onBet(bet)) return
    setSpinning(true)
    setCoinsWon(0)
    let c=0
    const iv=setInterval(()=>{
      setReels([Math.floor(Math.random()*6),Math.floor(Math.random()*6),Math.floor(Math.random()*6)])
      c++
      if(c>12){
        clearInterval(iv)
        const f=[Math.floor(Math.random()*6),Math.floor(Math.random()*6),Math.floor(Math.random()*6)]
        setReels(f)
        setSpinning(false)
        let win=0
        if(f[0]===f[1] && f[1]===f[2]){
          if(f[0]===5) win=bet*10
          else if(f[0]===4) win=bet*7
          else win=bet*5
        } else if(f[0]===f[1] || f[1]===f[2] || f[0]===f[2]) win=bet*1
        setCoinsWon(win)
        if(onWin) onWin(win)
        else if(win>0) onScore(win)
        else onScore(0)
      }
    },80)
  },[bet, onScore, onBet, onWin, spinning])
  useEffect(()=>{ if(!isStarted) { setSpinning(false) } },[isStarted])
  return (
    <div className="flex flex-col items-center gap-4 p-4 glass rounded-2xl border border-amber-400/20 max-w-[360px] w-full">
      <div className="flex gap-2">
        {reels.map((r,i)=>(
          <div key={i} className="w-20 h-20 glass rounded-xl flex items-center justify-center text-3xl border border-white/10" style={{background: spinning?'rgba(255,170,0,0.12)':'rgba(255,255,255,0.04)'}}>{symbols[r]}</div>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-xs font-mono text-white/60">Apuesta:</span>
        {[10,50,100].map(v=>(
          <button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-amber-400 text-black':'glass text-white/70'}`}>{v}</button>
        ))}
      </div>
      <button onClick={spin} disabled={spinning || !isStarted} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black tracking-widest disabled:opacity-40 hover:scale-105 transition" style={{fontFamily:'Orbitron'}}>{spinning?'GIRANDO...':'GIRAR 🎰'}</button>
      {coinsWon>0 && <p className="text-emerald-300 font-black" style={{fontFamily:'Orbitron'}}>¡GANASTE {coinsWon}!</p>}
      {coinsWon===0 && !spinning && <p className="text-xs font-mono text-white/40">3 iguales = x5-x10 • 2 iguales = x1</p>}
      <p className="text-[10px] font-mono text-white/30">18+ Simulado con monedas virtuales — sin dinero real</p>
    </div>
  )
}
