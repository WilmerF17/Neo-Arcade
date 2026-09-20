import { useState } from 'react'
function handValue(c:number[]){ let s=c.reduce((a,b)=>a+b,0); let aces=c.filter(v=>v===11).length; while(s>21 && aces>0){ s-=10; aces-- } return s }
export default function BlackjackGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [bet,setBet]=useState(20)
  const [player,setPlayer]=useState<number[]>([])
  const [dealer,setDealer]=useState<number[]>([])
  const [done,setDone]=useState(false)
  const [msg,setMsg]=useState('')
  const draw=()=> Math.random()<0.3?11: Math.floor(Math.random()*9)+2
  const start=()=>{
    if(!isStarted) return
    if(onBet && !onBet(bet)) return
    const p=[draw(),draw()], d=[draw(),draw()]
    setPlayer(p); setDealer(d); setDone(false); setMsg('')
  }
  const hit=()=>{
    if(done || player.length===0) return
    const np=[...player, draw()]
    setPlayer(np)
    if(handValue(np)>21){ setDone(true); setMsg('Te pasaste'); onScore(0) }
  }
  const stand=()=>{
    if(done || player.length===0) return
    let d=[...dealer]
    while(handValue(d)<17) d.push(draw())
    setDealer(d)
    const pv=handValue(player), dv=handValue(d)
    let win=0
    if(dv>21 || pv>dv) { win=bet*2; setMsg(`¡Ganas ${win}!`) }
    else if(pv===dv) { win=bet; setMsg('Empate') }
    else { setMsg('Pierdes'); win=0 }
    setDone(true)
    if(onWin) onWin(win)
      else if(win>0) onScore(win)
    else onScore(0)
  }
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-emerald-400/20 max-w-[380px] w-full">
      <div className="flex gap-4 w-full justify-center">
        <div className="glass rounded-xl p-3 flex-1 text-center"><p className="text-[11px] font-mono text-white/50">TU</p><p className="font-black text-white">{player.length? handValue(player):'-'} </p><p className="text-xs font-mono text-white/60">{player.join(' ')||'—'}</p></div>
        <div className="glass rounded-xl p-3 flex-1 text-center"><p className="text-[11px] font-mono text-white/50">DEALER</p><p className="font-black text-white">{dealer.length? (done?handValue(dealer): dealer[0]+' + ?'):'-'}</p><p className="text-xs font-mono text-white/60">{dealer.length? (done?dealer.join(' '): dealer[0]+' ?'):'—'}</p></div>
      </div>
      <div className="flex gap-2">{[20,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-emerald-400 text-black':'glass text-white/60'}`}>{v}</button>)}</div>
      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={start} disabled={!isStarted} className="px-4 py-2 rounded-full bg-white text-black font-black text-xs">REPARTIR</button>
        <button onClick={hit} disabled={done || !isStarted} className="px-4 py-2 rounded-full glass text-white font-bold text-xs">PEDIR</button>
        <button onClick={stand} disabled={done || !isStarted} className="px-4 py-2 rounded-full bg-emerald-500 text-black font-black text-xs">PLANTAR</button>
      </div>
      {msg && <p className="font-black text-emerald-300" style={{fontFamily:'Orbitron'}}>{msg}</p>}
      <p className="text-[10px] font-mono text-white/30">Blackjack paga 2x • 18+ Simulado</p>
    </div>
  )
}
