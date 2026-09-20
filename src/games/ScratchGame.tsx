import { useState } from 'react'
export default function ScratchGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [cards,setCards]=useState<number[]>([])
  const [revealed,setRevealed]=useState<boolean[]>([false,false,false])
  const [bet,setBet]=useState(10)
  const gen=()=>{
    if(!isStarted) return
    if(onBet && !onBet(bet)) return
    const c=[Math.floor(Math.random()*3),Math.floor(Math.random()*3),Math.floor(Math.random()*3)]
    setCards(c); setRevealed([false,false,false])
  }
  const reveal=(i:number)=>{
    if(revealed[i]) return
    const nr=[...revealed]; nr[i]=true; setRevealed(nr)
    if(nr.every(Boolean)){
      const win = cards[0]===cards[1] && cards[1]===cards[2] ? bet*5 : 0
      if(onWin) onWin(win)
      else if(win>0) onScore(win)
      else onScore(0)
    }
  }
  const icons=['🍒','⭐','💎']
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-orange-400/20 max-w-[360px] w-full">
      <div className="flex gap-2">
        {[0,1,2].map(i=>(
          <button key={i} onClick={()=>reveal(i)} className={`w-20 h-28 rounded-xl flex items-center justify-center text-2xl border ${revealed[i]?'bg-white text-black border-white':'glass border-white/10 hover:bg-white/10'}`}>{revealed[i]? icons[cards[i]]:'?'}</button>
        ))}
      </div>
      <div className="flex gap-2">{[10,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-orange-400 text-black':'glass text-white/60'}`}>{v}</button>)}</div>
      <button onClick={gen} disabled={!isStarted} className="px-6 py-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-white font-black text-xs">NUEVO RASCA</button>
      <p className="text-[11px] font-mono text-white/40">3 iguales = x5</p>
    </div>
  )
}
