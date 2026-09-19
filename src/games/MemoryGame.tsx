import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

const SYMBOLS = ['◆','●','▲','■','⬢','⬣','✦','✧']
const COLORS  = ['#00ffff','#ff00ff','#ffdd00','#00ff88','#ff6600','#8a2be2','#00aaff','#ff3366']
const SIZE = 4 // 4x4 = 8 pares
const PAIR_COUNT = SIZE*SIZE/2
const FLIP_DELAY = 720
const MATCH_BONUS = 50
const WIN_BONUS = 200

type Card = { id:number, symbol:string, color:string, matched:boolean }
type Particle = { id:number, x:number, y:number, vx:number, vy:number, life:number, c:string }

function fisherYates<T>(a:T[]):T[]{
  const arr=[...a]
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] }
  return arr
}

export default function MemoryGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [cards,setCards]=useState<Card[]>(()=>{
    const base=SYMBOLS.slice(0,PAIR_COUNT).flatMap((s,i)=>[
      {id:0,symbol:s,color:COLORS[i%COLORS.length],matched:false},
      {id:0,symbol:s,color:COLORS[i%COLORS.length],matched:false},
    ])
    return fisherYates(base).map((c,i)=>({...c,id:i}))
  })
  const [flipped,setFlipped]=useState<number[]>([])
  const [moves,setMoves]=useState(0)
  const [score,setScore]=useState(0)
  const [combo,setCombo]=useState(0)
  const [won,setWon]=useState(false)
  const [secs,setSecs]=useState(0)
  const [particles,setParticles]=useState<Particle[]>([])
  const isStartedRef=useRef(isStarted)
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{
    try{ const v=Number(localStorage.getItem('neo_memory_best')||0); bestRef.current=v; return v }catch{ return 0}
  })
  useEffect(()=>{bestRef.current=best},[best])
  const busyRef=useRef(false)
  const pidRef=useRef(0)
  const timersRef=useRef<number[]>([])

  const pushParticles=(x:number,y:number,color:string,count=10)=>{
    const arr:Particle[]=[]
    for(let i=0;i<count;i++){
      arr.push({id:pidRef.current++,x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7-1.5,life:1,c:color})
    }
    setParticles(p=>[...p,...arr].slice(-40))
  }

  const init=useCallback(()=>{
    timersRef.current.forEach(id=>clearTimeout(id)); timersRef.current=[]
    busyRef.current=false; setWon(false); setCombo(0); setFlipped([]); setMoves(0); setSecs(0)
    const base=SYMBOLS.slice(0,PAIR_COUNT).flatMap((s,i)=>[
      {id:0,symbol:s,color:COLORS[i%COLORS.length],matched:false},
      {id:0,symbol:s,color:COLORS[i%COLORS.length],matched:false},
    ])
    setCards(fisherYates(base).map((c,i)=>({...c,id:i})))
    setParticles([])
  },[])

  // timer
  useEffect(()=>{
    const id=window.setInterval(()=>{
      if(isStartedRef.current===false) return
      if(won) return
      if(cards.every(c=>c.matched) && cards.length) return
      setSecs(s=>s+1)
    },1000)
    return()=>clearInterval(id)
  },[won,cards])

  // particles anim
  useEffect(()=>{
    let raf=0
    const loop=()=>{
      raf=requestAnimationFrame(loop)
      setParticles(prev=> prev.map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,vy:p.vy+0.18,life:p.life-0.032})).filter(p=>p.life>0))
    }
    raf=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(raf)
  },[])

  // win check
  useEffect(()=>{
    if(cards.length && cards.every(c=>c.matched) && !won){
      setWon(true)
      const timeBonus=Math.max(0, 120 - secs*2)
      const comboBonus=combo*10
      const ns=scoreRef.current + WIN_BONUS + timeBonus + comboBonus
      setScore(ns)
      if(ns>bestRef.current){
        bestRef.current=ns; setBest(ns)
        try{localStorage.setItem('neo_memory_best',String(ns))}catch{}
        onScore(ns)
      } else onScore(ns)
      playTone(880,0.18,'sine',0.2); setTimeout(()=>playTone(1100,0.22,'sine',0.2),120)
    }
  },[cards,won,secs,combo,onScore])

  const onFlip=(idx:number)=>{
    if(isStartedRef.current===false) return
    if(busyRef.current) return
    if(flipped.includes(idx)) return
    if(cards[idx].matched) return
    if(flipped.length>=2) return
    const next=[...flipped,idx]
    setFlipped(next)
    playTone(520,0.08,'square',0.08)
    if(next.length===2){
      busyRef.current=true
      const [a,b]=next
      setMoves(m=>m+1)
      const isMatch=cards[a].symbol===cards[b].symbol
      if(isMatch){
        const col=cards[a].color
        // delay for flip anim to show
        const t=window.setTimeout(()=>{
          setCards(prev=>prev.map((c,i)=> i===a||i===b?{...c,matched:true}:c))
          const add=MATCH_BONUS + combo*10
          const ns=scoreRef.current+add; setScore(ns); setCombo(c=>c+1)
          // particles at center approximated
          pushParticles(50+ (idx%4)*18, 20, col, 12)
          playTone(660,0.12,'triangle',0.16); setTimeout(()=>playTone(880,0.14,'triangle',0.14),90)
          setFlipped([]); busyRef.current=false
        },420)
        timersRef.current.push(t)
      } else {
        setCombo(0)
        playTone(180,0.18,'sawtooth',0.07)
        const t=window.setTimeout(()=>{ setFlipped([]); busyRef.current=false }, FLIP_DELAY)
        timersRef.current.push(t)
      }
    }
  }

  useEffect(()=>()=>{ timersRef.current.forEach(id=>clearTimeout(id)) },[])

  const timeStr=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[420px] relative">
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-1.5 flex justify-between items-center"><span className="text-[11px] tracking-widest font-mono text-emerald-300">MOV {moves}</span><span className="text-[11px] font-mono text-white/60">{timeStr}</span>{combo>1 && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black animate-pulse">x{combo} COMBO</span>}</div>
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="relative w-full">
        <div className="grid grid-cols-4 gap-2 w-full perspective-[900px]">
          {cards.map((c,idx)=>{
            const isFlipped=flipped.includes(idx)||c.matched
            return (
              <div key={idx} className="aspect-square" style={{perspective:900}}>
                <button onClick={()=>onFlip(idx)}
                  className="w-full h-full relative transition-transform duration-500"
                  style={{transformStyle:'preserve-3d', transform: isFlipped?'rotateY(180deg)':'rotateY(0deg)'}}
                >
                  {/* back */}
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center border border-white/10" style={{backfaceVisibility:'hidden', background:'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08)'}}>
                    <span className="w-7 h-7 rounded-full border border-white/10 opacity-40" style={{background:`radial-gradient(circle at 30% 30%, ${c.color}22, transparent 70%)`}}/>
                    <span className="absolute text-[10px] font-mono text-white/15">NEO</span>
                  </div>
                  {/* front */}
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center font-black text-2xl border" style={{backfaceVisibility:'hidden', transform:'rotateY(180deg)', background: c.matched? `linear-gradient(135deg, ${c.color}, #0a0a1a)` : `linear-gradient(135deg, ${c.color}ee, #0d0d1f)`, borderColor:c.color, boxShadow:`0 0 16px ${c.color}66, inset 0 1px 0 rgba(255,255,255,0.25)`, color:'#fff', opacity: c.matched?0.55:1, textShadow:`0 0 10px ${c.color}`}}>
                    <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{c.symbol}</span>
                    {c.matched && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-[10px] text-black">✓</span>}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
        {/* particles overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          {particles.map(p=>(
            <span key={p.id} className="absolute w-1.5 h-1.5 rounded-full" style={{left:`${p.x}%`, top:`${p.y}%`, background:p.c, opacity:p.life, boxShadow:`0 0 6px ${p.c}`, transform:`scale(${0.7+p.life*0.6})`}}/>
          ))}
        </div>
      </div>
      {won && <div className="w-full glass rounded-xl p-3 text-center border border-emerald-400/30 animate-[pulse_1.2s_ease_infinite]">
        <p className="font-black text-emerald-300 tracking-widest" style={{fontFamily:'Orbitron'}}>¡MATRIZ 4×4 COMPLETADA!</p>
        <p className="text-xs font-mono text-white/60 mt-1">{moves} movimientos • {timeStr} • combo x{combo} • +{WIN_BONUS}+time bonus</p>
        <button onClick={init} className="mt-2 px-5 py-1.5 rounded-full bg-emerald-400 text-black font-black text-xs hover:scale-105 transition">NUEVA PARTIDA</button>
      </div>}
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between items-center"><span className="text-xs text-emerald-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <button onClick={init} className="px-4 py-2 rounded-lg bg-white text-black font-black text-sm hover:bg-white/90 transition">REINICIAR</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Fisher-Yates • Flip 3D • Combo +{10} por racha • Tiempo bonus • Sonido</p>
    </div>
  )
}
