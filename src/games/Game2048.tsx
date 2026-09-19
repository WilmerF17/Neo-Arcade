import { useState, useRef, useEffect, useCallback } from 'react'

const STORAGE_KEY='neo_2048_best'
const SAVE_KEY='neo_2048_save_v4'

type Dir='left'|'right'|'up'|'down'
type Hist={board:number[],score:number}

function newBoard():number[]{
  const b=Array(16).fill(0)
  addRandom(b); addRandom(b)
  return b
}
function addRandom(b:number[]){
  const empty=b.map((v,i)=> v===0?i:-1).filter(i=>i!==-1)
  if(!empty.length) return
  b[empty[Math.floor(Math.random()*empty.length)]] = Math.random()>0.90?4:2
}
function slide(arr:number[]):{res:number[],score:number,merged:boolean[]}{
  const filtered=arr.filter(v=>v!==0)
  const res:number[]=[]
  const merged:boolean[]=[]
  let i=0, score=0
  while(i<filtered.length){
    if(filtered[i]===filtered[i+1]){ res.push(filtered[i]*2); score+=filtered[i]*2; merged.push(true); i+=2 }
    else { res.push(filtered[i]); merged.push(false); i++ }
  }
  while(res.length<4){ res.push(0); merged.push(false) }
  return {res,score,merged}
}

export default function Game2048({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [board,setBoard]=useState<number[]>(()=>{
    try{
      const raw=localStorage.getItem(SAVE_KEY)
      if(raw){ const p=JSON.parse(raw); if(Array.isArray(p.board)&&p.board.length===16) return p.board as number[] }
    }catch{}
    return newBoard()
  })
  const [score,setScore]=useState(()=>{
    try{ const raw=localStorage.getItem(SAVE_KEY); if(raw) return JSON.parse(raw).score||0 }catch{}
    return 0
  })
  const [best,setBest]=useState(()=>{ try{ return Number(localStorage.getItem(STORAGE_KEY)||0)}catch{return 0} })
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const boardRef=useRef(board); useEffect(()=>{boardRef.current=board},[board])
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const [over,setOver]=useState(false)
  const [won,setWon]=useState(false)
  const [combo,setCombo]=useState(0)
  const [anim,setAnim]=useState<boolean[]>(Array(16).fill(false))
  const [mergedAt,setMergedAt]=useState<Set<number>>(new Set())
  const historyRef=useRef<Hist[]>([])
  const animTimerRef=useRef<number|null>(null)

  const canMove=(b:number[])=>{
    if(b.includes(0)) return true
    for(let i=0;i<16;i++){
      if(i%4!==3 && b[i]===b[i+1]) return true
      if(i<12 && b[i]===b[i+4]) return true
    }
    return false
  }
  const checkWon=(b:number[])=> b.some(v=>v>=2048)

  const persist=useCallback((nb:number[],ns:number)=>{
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify({board:nb,score:ns})) }catch{}
  },[])

  const doMove=useCallback((dir:Dir)=>{
    if(isStartedRef.current===false) return
    if(over) return
    const nb=[...boardRef.current]
    let moved=false
    let add=0
    const mergedIdx=new Set<number>()
    const apply=(indices:number[])=>{
      const line=indices.map(i=>nb[i])
      const {res,score:sc,merged}=slide(line)
      add+=sc
      indices.forEach((idx,k)=>{
        if(nb[idx]!==res[k]) moved=true
        if(merged[k] && res[k]!==0) mergedIdx.add(idx)
        nb[idx]=res[k]
      })
    }
    if(dir==='left') for(let r=0;r<4;r++) apply([r*4,r*4+1,r*4+2,r*4+3])
    if(dir==='right') for(let r=0;r<4;r++) apply([r*4+3,r*4+2,r*4+1,r*4])
    if(dir==='up') for(let c=0;c<4;c++) apply([c,c+4,c+8,c+12])
    if(dir==='down') for(let c=0;c<4;c++) apply([c+12,c+8,c+4,c])

    if(!moved) { setCombo(0); return }
    // push undo
    historyRef.current.push({board:[...boardRef.current],score:scoreRef.current})
    if(historyRef.current.length>16) historyRef.current.shift()
    addRandom(nb)
    setBoard(nb); boardRef.current=nb
    const ns=scoreRef.current+add
    // combo bonus: successive merges without break
    const hasMerge=mergedIdx.size>0
    const newCombo=hasMerge? combo+1 : 0
    setCombo(newCombo)
    const comboBonus= hasMerge? (newCombo-1)*8 : 0
    const finalScore= ns + comboBonus
    setScore(finalScore); scoreRef.current=finalScore
    persist(nb,finalScore)
    if(finalScore>bestRef.current){
      bestRef.current=finalScore; setBest(finalScore)
      try{ localStorage.setItem(STORAGE_KEY,String(finalScore)) }catch{}
      onScore(finalScore)
    }
    if(checkWon(nb)) setWon(true)
    if(!canMove(nb)) setOver(true)
    // anim flash
    setMergedAt(mergedIdx)
    setAnim(Array(16).fill(false).map((_,i)=> nb[i]!==0))
    if(animTimerRef.current) window.clearTimeout(animTimerRef.current)
    animTimerRef.current=window.setTimeout(()=>{ setMergedAt(new Set()); setAnim(Array(16).fill(false)) },220) as unknown as number
  },[over,combo,persist,onScore])

  const undo=()=>{
    if(isStartedRef.current===false) return
    const prev=historyRef.current.pop()
    if(!prev) return
    setBoard(prev.board); boardRef.current=prev.board
    setScore(prev.score); scoreRef.current=prev.score
    setOver(false); setCombo(0)
    persist(prev.board,prev.score)
  }

  const reset=()=>{
    const nb=newBoard()
    setBoard(nb); boardRef.current=nb
    setScore(0); scoreRef.current=0
    setOver(false); setWon(false); setCombo(0); historyRef.current=[]
    setMergedAt(new Set()); setAnim(Array(16).fill(false))
    try{ localStorage.removeItem(SAVE_KEY) }catch{}
  }

  // keyboard + swipe
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') { e.preventDefault(); doMove('left') }
      if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') { e.preventDefault(); doMove('right') }
      if(e.key==='ArrowUp'||e.key==='w'||e.key==='W') { e.preventDefault(); doMove('up') }
      if(e.key==='ArrowDown'||e.key==='s'||e.key==='S') { e.preventDefault(); doMove('down') }
      if(e.key==='z' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown',h)
    return()=> window.removeEventListener('keydown',h)
  },[doMove])

  // touch swipe global for board
  const touchRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const el=touchRef.current
    if(!el) return
    let sx=0,sy=0
    const onStart=(e:TouchEvent)=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY }
    const onEnd=(e:TouchEvent)=>{
      const dx=e.changedTouches[0].clientX - sx
      const dy=e.changedTouches[0].clientY - sy
      if(Math.abs(dx)<22 && Math.abs(dy)<22) return
      if(Math.abs(dx)>Math.abs(dy)) dx>0?doMove('right'):doMove('left')
      else dy>0?doMove('down'):doMove('up')
    }
    el.addEventListener('touchstart',onStart as any,{passive:true})
    el.addEventListener('touchend',onEnd as any,{passive:true})
    return()=>{ el.removeEventListener('touchstart',onStart as any); el.removeEventListener('touchend',onEnd as any) }
  },[doMove])

  const colorFor=(v:number)=>{
    const map:Record<number,string>={0:'rgba(255,255,255,0.06)',2:'#1a1a2e',4:'#16213e',8:'#0f3460',16:'#533483',32:'#e94560',64:'#ff6700',128:'#00ffff',256:'#ff00ff',512:'#ffdd00',1024:'#00ff88',2048:'#ffffff',4096:'#ffd700',8192:'#ff00aa'}
    return map[v]||'#ffffff'
  }
  const textColor=(v:number)=> v===0?'transparent' : (v<=4?'#cbd5e1' : v===2048?'#0a0a1a' : '#fff')

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex flex-col"><span className="text-[10px] font-mono tracking-widest text-white/50">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span>{combo>1 && <span className="text-[10px] font-black text-amber-300">COMBO x{combo}</span>}</div>
        <div className="glass rounded-lg px-3 py-2 flex flex-col items-end justify-center"><span className="text-[10px] font-mono text-white/50">BEST</span><span className="font-black text-white text-sm">{best}</span></div>
        <button onClick={undo} disabled={!historyRef.current.length} className="px-3 py-2 rounded-lg glass text-xs font-mono disabled:opacity-30 hover:bg-white/10 text-white">↩ UNDO</button>
      </div>
      {won && !over && <div className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 p-2 text-center text-black font-black text-xs">¡2048 ALCANZADO! Sigue jugando →</div>}
      <div ref={touchRef} className="glass rounded-xl p-3 w-full touch-manipulation select-none">
        <div className="grid grid-cols-4 gap-2">
          {board.map((v,i)=>(
            <div key={i} className={`aspect-square rounded-lg flex items-center justify-center font-black text-lg transition-all duration-150 ${mergedAt.has(i)?'scale-[1.08]':'scale-100'} ${anim[i]?'animate-[pop_0.22s_ease]':''}`} style={{background: colorFor(v), color: textColor(v), boxShadow: v?`0 0 14px ${colorFor(v)}66, inset 0 1px 0 rgba(255,255,255,0.18)`:'none', border: v?'1px solid rgba(255,255,255,0.14)':'1px solid rgba(255,255,255,0.06)', fontFamily:'Orbitron', transform: mergedAt.has(i)?'scale(1.08)':undefined}}>
              {v||''}
            </div>
          ))}
        </div>
        {over && <div className="mt-3 glass rounded-lg p-3 text-center border border-red-400/30"><p className="font-black text-red-300" style={{fontFamily:'Orbitron'}}>GAME OVER</p><p className="text-xs font-mono text-white/60">Sin movimientos</p><button onClick={reset} className="mt-2 px-4 py-1.5 rounded-full bg-white text-black text-xs font-black">REINICIAR</button></div>}
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <button onClick={reset} className="px-4 py-2 rounded-lg bg-cyan-400 text-black font-black text-xs hover:brightness-110">NUEVO</button>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-[220px]">
        <button onClick={()=>doMove('left')} aria-label="left" className="glass rounded-lg py-2 text-white hover:bg-white/10">←</button>
        <div className="flex flex-col gap-1"><button onClick={()=>doMove('up')} className="glass rounded-lg py-1 text-white hover:bg-white/10">↑</button><button onClick={()=>doMove('down')} className="glass rounded-lg py-1 text-white hover:bg-white/10">↓</button></div>
        <button onClick={()=>doMove('right')} aria-label="right" className="glass rounded-lg py-2 text-white hover:bg-white/10">→</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Flechas/WASD + Swipe + Undo (Ctrl+Z) • Combo por fusiones consecutivas • Guardado</p>
      <style>{`@keyframes pop{0%{transform:scale(0.92)}50%{transform:scale(1.08)}100%{transform:scale(1)}}`}</style>
    </div>
  )
}
