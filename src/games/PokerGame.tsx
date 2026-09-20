import { useState } from 'react'
export default function PokerGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [bet,setBet]=useState(20)
  const [hand,setHand]=useState<number[]>([])
  const [held,setHeld]=useState<boolean[]>([false,false,false,false,false])
  const [phase,setPhase]=useState<'deal'|'draw'|'done'>('deal')
  const suits=['♠','♥','♦','♣'], ranks=['A','K','Q','J','10','9','8']
  const deal=()=>{
    if(!isStarted) return
    if(onBet && !onBet(bet)) return
    const h=Array.from({length:5},()=>Math.floor(Math.random()*8))
    setHand(h); setHeld([false,false,false,false,false]); setPhase('draw')
  }
  const draw=()=>{
    const nh=hand.map((v,i)=> held[i]? v : Math.floor(Math.random()*8))
    setHand(nh)
    const counts:Record<number,number>={}; nh.forEach(v=>counts[v]=(counts[v]||0)+1)
    const vals=Object.values(counts).sort((a,b)=>b-a)
    let win=0
    if(vals[0]===4) win=bet*8
    else if(vals[0]===3 && vals[1]===2) win=bet*6
    else if(vals[0]===3) win=bet*3
    else if(vals[0]===2 && vals[1]===2) win=bet*2
    else if(vals[0]===2) win=bet*1
    setPhase('done')
    if(onWin) onWin(win)
      else if(win>0) onScore(win)
    else onScore(0)
  }
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-cyan-400/20 max-w-[380px] w-full">
      <div className="flex gap-1.5">
        {hand.length? hand.map((v,i)=>(
          <button key={i} onClick={()=> phase==='draw' && setHeld(h=> h.map((x,j)=> j===i? !x : x))} className={`w-14 h-20 rounded-lg flex flex-col items-center justify-center border ${held[i]?'border-cyan-400 bg-cyan-400/20':'border-white/10 glass'}`}>
            <span className="text-lg">{ranks[v]}</span><span className="text-sm">{suits[v%4]}</span><span className="text-[10px] font-mono text-white/40">{held[i]?'HOLD':''}</span>
          </button>
        )): <div className="text-xs font-mono text-white/40 py-6">Pulsa REPARTIR</div>}
      </div>
      <div className="flex gap-2">{[20,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-cyan-400 text-black':'glass text-white/60'}`}>{v}</button>)}</div>
      <div className="flex gap-2">
        {phase==='deal' && <button onClick={deal} disabled={!isStarted} className="px-6 py-2 rounded-full bg-white text-black font-black text-xs">REPARTIR</button>}
        {phase==='draw' && <button onClick={draw} className="px-6 py-2 rounded-full bg-cyan-400 text-black font-black text-xs">CAMBIAR</button>}
        {phase==='done' && <button onClick={deal} className="px-6 py-2 rounded-full glass text-white text-xs">OTRA</button>}
      </div>
      <p className="text-[11px] font-mono text-white/40">Par x1 • Doble par x2 • Trio x3 • Full x6 • Poker x8</p>
      <p className="text-[10px] font-mono text-white/30">18+ Simulado</p>
    </div>
  )
}
