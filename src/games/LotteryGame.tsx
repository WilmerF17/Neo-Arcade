import { useState } from 'react'
export default function LotteryGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [pick,setPick]=useState<number[]>([])
  const [draw,setDraw]=useState<number[]>([])
  const [bet,setBet]=useState(10)
  const toggle=(n:number)=>{
    if(pick.includes(n)) setPick(pick.filter(x=>x!==n))
    else if(pick.length<6) setPick([...pick,n])
  }
  const play=()=>{
    if(!isStarted || pick.length!==6) return
    if(onBet && !onBet(bet)) return
    const d=Array.from({length:6},()=> Math.ceil(Math.random()*20))
    setDraw(d)
    const hits=pick.filter(p=>d.includes(p)).length
    let win=0
    if(hits===6) win=bet*10
    else if(hits>=4) win=bet*3
    else if(hits>=3) win=bet*1
    if(onWin) onWin(win)
      else if(win>0) onScore(win)
    else onScore(0)
  }
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-purple-400/20 max-w-[380px] w-full">
      <div className="grid grid-cols-10 gap-1">
        {Array.from({length:20},(_,i)=>i+1).map(n=>(
          <button key={n} onClick={()=>toggle(n)} className={`w-7 h-7 rounded-full text-xs font-bold ${pick.includes(n)?'bg-purple-500 text-white':'glass text-white/60'}`}>{n}</button>
        ))}
      </div>
      <p className="text-xs font-mono text-white/60">Elegidos: {pick.join(', ')||'—'} ({pick.length}/6)</p>
      {draw.length>0 && <p className="text-sm font-mono text-white">Sorteo: {draw.join(' - ')} • Aciertos {pick.filter(p=>draw.includes(p)).length}</p>}
      <div className="flex gap-2">{[10,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-purple-500 text-white':'glass text-white/60'}`}>{v}</button>)}</div>
      <button onClick={play} disabled={pick.length!==6 || !isStarted} className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-xs disabled:opacity-40">SORTEAR 🎟️</button>
      <p className="text-[11px] font-mono text-white/40">6/6 x10 • 4-5 x3 • 3 x1</p>
    </div>
  )
}
