import { useState } from 'react'
export default function DiceGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [bet,setBet]=useState(10)
  const [choice,setChoice]=useState<'par'|'impar'|'7'>('par')
  const [dice,setDice]=useState([1,1])
  const [rolling,setRolling]=useState(false)
  const roll=()=>{
    if(rolling || !isStarted) return
    if(onBet && !onBet(bet)) return
    setRolling(true)
    let c=0
    const iv=setInterval(()=>{
      setDice([Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)])
      c++
      if(c>8){
        clearInterval(iv)
        const d=[Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)]
        setDice(d)
        setRolling(false)
        const sum=d[0]+d[1]
        let win=0
        if(choice==='par' && sum%2===0) win=bet*2
        else if(choice==='impar' && sum%2===1) win=bet*2
        else if(choice==='7' && sum===7) win=bet*5
        if(onWin) onWin(win)
      else if(win>0) onScore(win)
        else onScore(0)
      }
    },80)
  }
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-yellow-400/20 max-w-[360px] w-full">
      <div className="flex gap-4">
        {dice.map((d,i)=><div key={i} className="w-16 h-16 glass rounded-xl flex items-center justify-center text-2xl font-black border border-white/10">{d}</div>)}
      </div>
      <p className="font-black text-white" style={{fontFamily:'Orbitron'}}>SUMA {dice[0]+dice[1]}</p>
      <div className="flex gap-2">
        {(['par','impar','7'] as const).map(c=>(
          <button key={c} onClick={()=>setChoice(c)} className={`px-3 py-1.5 rounded-full text-xs font-black capitalize ${choice===c?'bg-yellow-400 text-black':'glass text-white/70'}`}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2">{[10,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-yellow-400 text-black':'glass text-white/60'}`}>{v}</button>)}</div>
      <button onClick={roll} disabled={rolling || !isStarted} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-xs tracking-widest disabled:opacity-40">LANZAR 🎲</button>
      <p className="text-[11px] font-mono text-white/40">Par/Impar x2 • 7 exacto x5</p>
      <p className="text-[10px] font-mono text-white/30">18+ Simulado</p>
    </div>
  )
}
