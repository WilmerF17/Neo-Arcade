import { useState } from 'react'
export default function RouletteGame({ onScore, isStarted, onBet, onWin }: { onScore:(s:number)=>void, isStarted:boolean, onBet?:(a:number)=>boolean, onWin?:(a:number)=>void }){
  const [bet,setBet]=useState(10)
  const [choice,setChoice]=useState<'red'|'black'|'green'>('red')
  const [result,setResult]=useState<number|null>(null)
  const [spinning,setSpinning]=useState(false)
  const spin=()=>{
    if(spinning || !isStarted) return
    if(onBet && !onBet(bet)) return
    setSpinning(true)
    setResult(null)
    setTimeout(()=>{
      const r=Math.floor(Math.random()*37)
      setResult(r)
      setSpinning(false)
      const isRed=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(r)
      const isBlack=r!==0 && !isRed
      let win=0
      if((choice==='red' && isRed) || (choice==='black' && isBlack)) win=bet*2
      else if(choice==='green' && r===0) win=bet*14
      if(onWin) onWin(win)
      else if(win>0) onScore(win)
      else onScore(0)
    },1200)
  }
  const color = result===0?'#00ff88': result!==null && [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(result) ? '#ff3355' : '#222'
  return (
    <div className="flex flex-col items-center gap-3 p-4 glass rounded-2xl border border-pink-400/20 max-w-[360px] w-full">
      <div className="w-28 h-28 rounded-full border-4 flex items-center justify-center text-2xl font-black" style={{borderColor:color, background: spinning?'rgba(255,0,85,0.15)':'rgba(255,255,255,0.04)', color: result===null?'#fff':color}}>{spinning?'●': result===null?'?': result}</div>
      <div className="flex gap-2">
        {(['red','black','green'] as const).map(c=>(
          <button key={c} onClick={()=>setChoice(c)} className={`px-3 py-1.5 rounded-full text-xs font-black capitalize ${choice===c?'bg-white text-black':'glass text-white/70'}`} style={{background: choice===c? (c==='red'?'#ff3355':c==='black'?'#222':'#00ff88'):undefined, color: choice===c && c==='green'?'#000':undefined}}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2">{[10,50,100].map(v=><button key={v} onClick={()=>setBet(v)} className={`px-3 py-1 rounded-full text-xs font-black ${bet===v?'bg-pink-500 text-white':'glass text-white/60'}`}>{v}</button>)}</div>
      <button onClick={spin} disabled={spinning || !isStarted} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-black text-xs tracking-widest disabled:opacity-40">GIRAR 🎡</button>
      <p className="text-[11px] font-mono text-white/40">Rojo/Negro x2 • Verde 0 x14</p>
      <p className="text-[10px] font-mono text-white/30">18+ Simulado — sin dinero real</p>
    </div>
  )
}
