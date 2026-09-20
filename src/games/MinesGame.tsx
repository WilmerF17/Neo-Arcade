import { useState } from 'react'
export default function MinesGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [bet,setBet]=useState(10)
  const [grid,setGrid]=useState<number[]>([])
  const [revealed,setRevealed]=useState<boolean[]>(Array(16).fill(false))
  const [over,setOver]=useState(false)
  const [mult,setMult]=useState(1)
  const gen=()=>{
    if(!isStarted) return
    if(onBet && !onBet(bet)) return
    const mines=new Set<number>()
    while(mines.size<4) mines.add(Math.floor(Math.random()*16))
    setGrid(Array.from({length:16},(_,i)=> mines.has(i)? 1:0))
    setRevealed(Array(16).fill(false)); setOver(false); setMult(1)
  }
  const click=(i:number)=>{
    if(over || revealed[i] || !isStarted) return
    const nr=[...revealed]; nr[i]=true; setRevealed(nr)
    if(grid[i]===1){
      setOver(true); onScore(0)
    } else {
      const safe=nr.filter((v,idx)=>v && grid[idx]===0).length
      const nm=+(1+safe*0.3).toFixed(2); setMult(nm)
      if(safe===12){ onScore(Math.floor(bet*nm)) }
    }
  }
  const cash=()=>{
    if(over) return
    const safe=revealed.filter((v,idx)=>v && grid[idx]===0).length
    if(safe>0){ onScore(Math.floor(bet*mult)) }
    setOver(true)
  }
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-cyan-400/20 max-w-[360px] w-full">
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({length:16},(_,i)=>(
          <button key={i} onClick={()=>click(i)} disabled={over} className={`w-14 h-14 rounded-lg flex items-center justify-center text-lg border ${revealed[i]? (grid[i]===1?'bg-red-500 border-red-500':'bg-emerald-500/20 border-emerald-400/30'):'glass border-white/10 hover:bg-white/10'}`}>{revealed[i]? (grid[i]===1?'💣':'💎'):'?'}</button>
        ))}
      </div>
      <p className="font-black text-white" style={{fontFamily:'Orbitron'}}>x{mult.toFixed(2)}</p>
      <div className="flex gap-2">{[10,50,100].map(v=><button key={v} onClick={()=>!revealed.some(Boolean) && setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-cyan-400 text-black':'glass text-white/60'}`}>{v}</button>)}</div>
      <div className="flex gap-2">
        <button onClick={gen} disabled={!isStarted} className="px-4 py-2 rounded-full bg-white text-black font-black text-xs">NUEVO</button>
        <button onClick={cash} disabled={over} className="px-6 py-2 rounded-full bg-emerald-400 text-black font-black text-xs">COBRAR</button>
      </div>
      <p className="text-[11px] font-mono text-white/40">Abre 💎 sin 💣 • +0.3x por acierto</p>
    </div>
  )
}
