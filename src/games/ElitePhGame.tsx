import { useState, useEffect, useRef } from 'react'
export default function ElitePhGame({ onScore, isStarted, title, color }: { onScore:(s:number)=>void, isStarted:boolean, title?:string, color?:string }){
  const [score,setScore]=useState(0)
  const [targets,setTargets]=useState<{x:number,y:number,id:number}[]>([])
  const [time,setTime]=useState(20)
  const idRef=useRef(0)
  const col = color || '#00ffff'
  useEffect(()=>{
    if(!isStarted){ setScore(0); setTime(20); setTargets([]); return }
    const iv=setInterval(()=> setTime(t=>{ if(t<=1){ clearInterval(iv); onScore(score); return 0 } return t-1 }),1000)
    return()=>clearInterval(iv)
  },[isStarted, score, onScore])
  useEffect(()=>{
    if(!isStarted || time<=0) return
    const iv=setInterval(()=>{
      setTargets(t=>{
        if(t.length>4) return t
        return [...t, {x: 10+Math.random()*80, y:15+Math.random()*65, id: idRef.current++}]
      })
    },450)
    return()=>clearInterval(iv)
  },[isStarted, time])
  const hit=(id:number)=>{
    setTargets(t=>t.filter(x=>x.id!==id))
    const ns=score+10 + Math.floor(Math.random()*5)
    setScore(ns)
  }
  return (
    <div className="relative flex flex-col items-center gap-2 p-3 glass rounded-2xl border max-w-[380px] w-full overflow-hidden" style={{borderColor: col+'40', boxShadow:`0 0 20px ${col}22`}}>
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{background:`radial-gradient(400px 200px at 50% 0%, ${col}22, transparent 70%)`}}/>
      <div className="flex justify-between w-full text-xs font-mono">
        <span className="px-2 py-1 rounded-full glass text-white/70">⏱ {time}s</span>
        <span className="px-2 py-1 rounded-full font-black" style={{background:col, color:'#000'}}>{score} pts</span>
      </div>
      <div className="relative w-full h-[280px] glass rounded-xl overflow-hidden border border-white/10" style={{background:`linear-gradient(180deg, ${col}08, transparent)`}}>
        <div className="absolute inset-0 grid-bg opacity-20"/>
        {targets.map(t=>(
          <button key={t.id} onClick={()=>hit(t.id)} className="absolute w-12 h-12 rounded-full flex items-center justify-center text-lg font-black animate-pulse border-2" style={{left:`${t.x}%`, top:`${t.y}%`, background:`radial-gradient(circle, ${col}, #fff)`, borderColor:col, boxShadow:`0 0 16px ${col}`, transform:'translate(-50%,-50%)', animationDuration:'0.9s'}}>✦</button>
        ))}
        {time===0 && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"><p className="font-black text-white text-lg" style={{fontFamily:'Orbitron'}}>¡{score} PTS!</p></div>}
        {!isStarted && <div className="absolute inset-0 bg-[#07091a]/70 backdrop-blur-[4px] flex items-center justify-center p-4 text-center"><p className="text-xs font-mono text-white/70">Toca las estrellas neón<br/>¡BRILLA y gana!</p></div>}
      </div>
      <p className="text-[10px] font-mono text-white/30 text-center">{title || 'ELITE'} • 60fps • {col} • Shine ✨</p>
    </div>
  )
}
