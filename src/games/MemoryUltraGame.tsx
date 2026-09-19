import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

const SYMBOLS=['◈','⬢','⬣','⟁','⟡','⬔','⬓','⬢','✶','✷','✸','✹','⬥','⬧','⬪','⬫']
const COLORS=['#00ffff','#ff00ff','#ffdd00','#00ff88','#ff6600','#8a2be2','#00aaff','#ff3366','#ffd166','#06d6a0','#118ab2','#ef476f']
const COLS=6, ROWS=4 // 6x4 ultra 24 cartas 12 pares
const PAIRS=12

type Card={id:number,sym:string,color:string,matched:boolean}
type Particle={id:number,x:number,y:number,vx:number,vy:number,life:number,c:string}

function fisherYates<T>(a:T[]):T[]{ const arr=[...a]; for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr }

export default function MemoryUltraGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [cards,setCards]=useState<Card[]>(()=>{
    const base=SYMBOLS.slice(0,PAIRS).flatMap((s,i)=>[
      {id:0,sym:s,color:COLORS[i%COLORS.length],matched:false},
      {id:0,sym:s,color:COLORS[i%COLORS.length],matched:false},
    ])
    return fisherYates(base).map((c,i)=>({...c,id:i}))
  })
  const [flipped,setFlipped]=useState<number[]>([])
  const [moves,setMoves]=useState(0)
  const [score,setScore]=useState(0)
  const [combo,setCombo]=useState(0)
  const [bestCombo,setBestCombo]=useState(0)
  const [won,setWon]=useState(false)
  const [secs,setSecs]=useState(0)
  const [particles,setParticles]=useState<Particle[]>([])
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_memoryultra_best')||0); bestRef.current=v; return v }catch{ return 0 } })
  useEffect(()=>{bestRef.current=best},[best])
  const busyRef=useRef(false)
  const pidRef=useRef(0)
  const timersRef=useRef<number[]>([])

  const pushParticles=(color:string,count=14)=>{
    const arr:Particle[]=[]
    for(let i=0;i<count;i++) arr.push({id:pidRef.current++,x:50+(Math.random()-0.5)*42,y:48+(Math.random()-0.5)*28,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8-1,life:1,c:color})
    setParticles(p=>[...p,...arr].slice(-50))
  }

  const init=useCallback(()=>{
    timersRef.current.forEach(id=>clearTimeout(id)); timersRef.current=[]
    busyRef.current=false; setWon(false); setCombo(0); setFlipped([]); setMoves(0); setSecs(0); setParticles([])
    const base=SYMBOLS.slice(0,PAIRS).flatMap((s,i)=>[
      {id:0,sym:s,color:COLORS[i%COLORS.length],matched:false},
      {id:0,sym:s,color:COLORS[i%COLORS.length],matched:false},
    ])
    setCards(fisherYates(base).map((c,i)=>({...c,id:i})))
  },[])

  useEffect(()=>{
    const id=window.setInterval(()=>{ if(isStartedRef.current===false) return; if(won) return; setSecs(s=>s+1)},1000)
    return()=>clearInterval(id)
  },[won])
  useEffect(()=>{
    let raf=0
    const loop=()=>{ raf=requestAnimationFrame(loop); setParticles(prev=>prev.map(p=>({...p,x:p.x+p.vx*0.6,y:p.y+p.vy*0.6,vy:p.vy+0.16,life:p.life-0.028})).filter(p=>p.life>0)) }
    raf=requestAnimationFrame(loop); return()=>cancelAnimationFrame(raf)
  },[])
  useEffect(()=>{
    if(cards.length && cards.every(c=>c.matched) && !won){
      setWon(true)
      const timeBonus=Math.max(0,180 - secs*1.4)
      const bonus=Math.max(10, 140 - moves*2.2) + combo*12 + timeBonus
      const ns=scoreRef.current+Math.floor(bonus)
      setScore(ns)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_memoryultra_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      playTone(720,0.16,'sine',0.18); setTimeout(()=>playTone(960,0.2,'sine',0.18),140); setTimeout(()=>playTone(1200,0.24,'triangle',0.16),280)
    }
  },[cards,won,moves,secs,combo,onScore])

  const onFlip=(idx:number)=>{
    if(isStartedRef.current===false) return
    if(busyRef.current) return
    if(flipped.includes(idx) || cards[idx].matched) return
    if(flipped.length>=2) return
    const next=[...flipped,idx]
    setFlipped(next)
    playTone(540,0.07,'square',0.07)
    if(next.length===2){
      busyRef.current=true
      const [a,b]=next
      setMoves(m=>m+1)
      if(cards[a].sym===cards[b].sym){
        const col=cards[a].color
        const t=window.setTimeout(()=>{
          setCards(prev=>prev.map((c,i)=> i===a||i===b?{...c,matched:true}:c))
          const add=30 + combo*14
          const ns=scoreRef.current+add; setScore(ns)
          const nc=combo+1; setCombo(nc); setBestCombo(b=>Math.max(b,nc))
          pushParticles(col,16)
          playTone(700,0.11,'triangle',0.15); setTimeout(()=>playTone(900,0.13,'triangle',0.13),80)
          setFlipped([]); busyRef.current=false
        },380)
        timersRef.current.push(t)
      } else {
        setCombo(0)
        playTone(160,0.16,'sawtooth',0.07)
        const t=window.setTimeout(()=>{ setFlipped([]); busyRef.current=false }, 720)
        timersRef.current.push(t)
      }
    }
  }

  useEffect(()=>()=>{timersRef.current.forEach(id=>clearTimeout(id))},[])
  const timeStr=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[520px]">
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex items-center gap-3">
          <span className="text-[11px] font-mono text-cyan-300">ULTRA 6×4</span>
          <span className="text-xs font-mono text-white/60">Mov {moves}</span>
          <span className="text-xs font-mono text-white/60">{timeStr}</span>
          {combo>1 && <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black animate-pulse">COMBO x{combo}</span>}
        </div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="relative w-full">
        <div className="grid gap-1.5 w-full" style={{gridTemplateColumns:`repeat(${COLS},1fr)`}}>
          {cards.map((c,i)=>{
            const isFlipped=flipped.includes(i)||c.matched
            return (
              <div key={i} className="aspect-square" style={{perspective:800}}>
                <button onClick={()=>onFlip(i)} className="w-full h-full relative transition-transform duration-500" style={{transformStyle:'preserve-3d', transform:isFlipped?'rotateY(180deg)':'rotateY(0deg)'}}>
                  <div className="absolute inset-0 rounded-lg flex items-center justify-center border border-white/10" style={{backfaceVisibility:'hidden', background:'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))'}}>
                    <span className="text-[9px] font-mono text-white/14 tracking-widest">NEO</span>
                    <span className="absolute inset-0 rounded-lg opacity-20" style={{background:`radial-gradient(300px circle at 30% 20%, ${c.color}22, transparent 60%)`}}/>
                  </div>
                  <div className="absolute inset-0 rounded-lg flex items-center justify-center font-black text-[18px] border" style={{backfaceVisibility:'hidden', transform:'rotateY(180deg)', background: c.matched? `linear-gradient(135deg, ${c.color}, #0a0a1a)`:`linear-gradient(135deg, ${c.color}ee, #11112a)`, borderColor:c.color, boxShadow:`0 0 14px ${c.color}66`, color:'#fff', opacity:c.matched?0.5:1}}>
                    {c.sym}
                    {c.matched && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-black text-[9px] flex items-center justify-center">✓</span>}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map(p=>(
            <span key={p.id} className="absolute w-1.5 h-1.5 rounded-full" style={{left:`${p.x}%`, top:`${p.y}%`, background:p.c, opacity:p.life, boxShadow:`0 0 6px ${p.c}`}}/>
          ))}
        </div>
      </div>
      {won && <div className="w-full glass rounded-xl p-3 text-center border border-cyan-400/30">
        <p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>¡ULTRA COMPLETADO!</p>
        <p className="text-xs font-mono text-white/60">{moves} movs • {timeStr} • mejor combo x{bestCombo}</p>
        <button onClick={init} className="mt-2 px-5 py-1.5 rounded-full bg-cyan-400 text-black font-black text-xs">NUEVO ULTRA</button>
      </div>}
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <button onClick={init} className="px-3 py-2 rounded-lg bg-cyan-400 text-black font-black text-xs">NUEVO</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Ultra 6×4 • 12 pares • Fisher-Yates • Combo • Timer • Partículas</p>
    </div>
  )
}
