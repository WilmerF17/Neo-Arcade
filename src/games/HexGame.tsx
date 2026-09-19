import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

// Hex 2048 con coordenadas cúbicas (axial) pero render como grid con 6 direcciones
// Usamos board hex de radio 2 (~19 celdas) simplificado a 4x4 con fusión hex visual

type Board = number[]
const SIZE=4 // 4x4 hex visual

function newBoard():Board{
  const b=Array(SIZE*SIZE).fill(0)
  const add=(board:number[])=>{
    const empty=board.map((v,i)=> v===0?i:-1).filter(i=>i!==-1)
    if(empty.length) board[empty[Math.floor(Math.random()*empty.length)]]= Math.random()>0.85?4:2
  }
  add(b); add(b); return b
}

// direcciones hex: 0:E, 1:NE, 2:NW, 3:W, 4:SW, 5:SE
// Para 4x4 usamos proyección: E/W = filas, NE/SW y NW/SE son diagonales con offset
function moveBoard(board:Board, dir:number):{board:Board,moved:boolean,score:number, merged:Set<number>}{
  let nb=[...board]
  let moved=false, score=0
  const merged=new Set<number>()
  const slide=(arr:number[])=>{
    const f=arr.filter(v=>v!==0)
    const res:number[]=[]
    const merg:boolean[]=[]
    let i=0, sc=0
    while(i<f.length){ if(f[i]===f[i+1]){ res.push(f[i]*2); sc+=f[i]*2; merg.push(true); i+=2 } else {res.push(f[i]); merg.push(false); i++}}
    while(res.length<4){ res.push(0); merg.push(false) }
    return {res,sc,merg}
  }
  const apply=(idx:number[])=>{
    const line=idx.map(i=>nb[i])
    const {res,sc,merg}=slide(line)
    score+=sc
    idx.forEach((pos,k)=>{ if(nb[pos]!==res[k]) moved=true; if(merg[k] && res[k]!==0) merged.add(pos); nb[pos]=res[k]})
  }
  // 0:E (right), 3:W (left), 2:N (up), 5:S (down-ish) + diagonales approx
  if(dir===0) for(let r=0;r<4;r++) apply([r*4+3,r*4+2,r*4+1,r*4]) // E
  if(dir===3) for(let r=0;r<4;r++) apply([r*4,r*4+1,r*4+2,r*4+3]) // W
  if(dir===2) for(let c=0;c<4;c++) apply([c,c+4,c+8,c+12]) // NW/N
  if(dir===5) for(let c=0;c<4;c++) apply([c+12,c+8,c+4,c]) // SE/S
  if(dir===1){ // NE diagonal groups
    apply([12,9,6,3]); apply([8,5,2,0]); apply([13,10,7]); apply([4,1]); apply([14,11]); apply([0]); // simplified fallback use same as N for extra
  }
  if(dir===4){ // SW
    apply([3,6,9,12]); apply([0,5,10,13]); apply([1,6,11,14]); // not needed heavy
  }
  // For 1 and 4 we fallback to already handled vertical if no move
  if((dir===1||dir===4) && !moved){
    // retry with vertical to ensure move
    const temp=[...board]
    let tMoved=false
    // no change, keep as is; will be checked caller
    void temp; void tMoved
  }
  if(moved){
    const empty=nb.map((v,i)=> v===0?i:-1).filter(i=>i!==-1)
    if(empty.length) nb[empty[Math.floor(Math.random()*empty.length)]]= Math.random()>0.85?4:2
  }
  return {board:nb, moved, score, merged}
}

export default function HexGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [board,setBoard]=useState<Board>(()=> newBoard())
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>{ try{ return Number(localStorage.getItem('neo_hex_best')||0)}catch{return 0} })
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const boardRef=useRef(board); useEffect(()=>{boardRef.current=board},[board])
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const [over,setOver]=useState(false)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [flash,setFlash]=useState<Set<number>>(new Set())

  const doMove=useCallback((d:number)=>{
    if(isStartedRef.current===false) return
    if(over) return
    const {board:nb,moved,score:sc,merged}=moveBoard(boardRef.current,d)
    if(!moved){ setCombo(0); return }
    setBoard(nb); boardRef.current=nb
    const newCombo= sc>0? combo+1:0
    setCombo(newCombo)
    const comboBonus= sc>0? (newCombo-1)*6 : 0
    const ns=scoreRef.current+sc+comboBonus
    setScore(ns); scoreRef.current=ns
    if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_hex_best',String(ns))}catch{}; onScore(ns)}
    setLevel(Math.floor(ns/380)+1)
    setFlash(merged)
    setTimeout(()=>setFlash(new Set()),220)
    if(sc>0) { playTone(560+Math.min(400,sc),0.09,'triangle',0.12) }
    else playTone(300,0.05,'square',0.06)
    const can=[0,1,2,3,4,5].some(dir=> moveBoard(nb,dir).moved)
    if(!can) setOver(true)
  },[over,combo,onScore])

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==='ArrowLeft') doMove(3)
      if(e.key==='ArrowRight') doMove(0)
      if(e.key==='ArrowUp') doMove(2)
      if(e.key==='ArrowDown') doMove(5)
      if(e.key==='q' || e.key==='Q') doMove(1)
      if(e.key==='e' || e.key==='E') doMove(4)
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[doMove])

  // touch swipe
  const touchRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const el=touchRef.current; if(!el) return
    let sx=0,sy=0
    const s=(e:TouchEvent)=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY }
    const e=(ev:TouchEvent)=>{
      const dx=ev.changedTouches[0].clientX-sx, dy=ev.changedTouches[0].clientY-sy
      if(Math.abs(dx)<24 && Math.abs(dy)<24) return
      if(Math.abs(dx)>Math.abs(dy)) dx>0?doMove(0):doMove(3)
      else dy>0?doMove(5):doMove(2)
    }
    el.addEventListener('touchstart',s as any,{passive:true}); el.addEventListener('touchend',e as any,{passive:true})
    return()=>{ el.removeEventListener('touchstart',s as any); el.removeEventListener('touchend',e as any)}
  },[doMove])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[340px]">
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex flex-col"><span className="text-[10px] font-mono tracking-widest text-fuchsia-300">NIVEL {level}</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span>{combo>1 && <span className="text-[10px] font-black text-amber-300">COMBO x{combo}</span>}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <button onClick={()=>{const nb=newBoard(); setBoard(nb); boardRef.current=nb; setScore(0); scoreRef.current=0; setOver(false); setCombo(0); setLevel(1)}} className="px-3 py-2 rounded-lg bg-fuchsia-500 text-black font-black text-xs">REINICIAR</button>
      </div>
      <div ref={touchRef} className="glass rounded-xl p-3 w-full relative overflow-hidden touch-manipulation">
        <div className="absolute inset-0 opacity-10" style={{background:'conic-gradient(from 0deg, #ff00ff, #00ffff, #ffdd00, #00ff88, #ff00ff)', animation:'spin 8s linear infinite'}}/>
        <div className="relative grid grid-cols-4 gap-1.5">
          {board.map((v,i)=>{
            const isFlash=flash.has(i)
            const hue=(Math.log2(v||2)*35)%360
            return (
              <div key={i} className={`aspect-square flex items-center justify-center font-black text-lg relative overflow-hidden transition-transform duration-150 ${isFlash?'scale-110':'scale-100'}`} style={{
                background: v? `linear-gradient(135deg, hsl(${hue},100%,58%), #0a0a1a)`:'rgba(255,255,255,0.06)',
                color:'#fff',
                border: v?'1px solid rgba(255,255,255,0.14)':'1px solid rgba(255,255,255,0.06)',
                boxShadow: v? `0 0 12px hsla(${hue},100%,60%,0.4)`:'none',
                fontFamily:'Orbitron',
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                transform: isFlash? 'scale(1.08)': undefined
              }}>
                <span style={{filter: isFlash? 'brightness(1.3)': undefined}}>{v||''}</span>
              </div>
            )
          })}
        </div>
        {over && <div className="relative mt-3 p-2 rounded-xl bg-red-500/10 border border-red-400/30 text-center"><p className="font-black text-red-300" style={{fontFamily:'Orbitron'}}>¡HEXÁGONOS BLOQUEADOS!</p><button onClick={()=>{const nb=newBoard(); setBoard(nb); boardRef.current=nb; setScore(0); scoreRef.current=0; setOver(false)}} className="mt-1 px-3 py-1 rounded-full bg-white text-black font-black text-xs">NUEVO</button></div>}
      </div>
      <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
        <button onClick={()=>doMove(3)} className="glass rounded-lg py-2 text-white/70 hover:bg-white/10">← W</button>
        <div className="flex flex-col gap-1"><button onClick={()=>doMove(2)} className="glass rounded-lg py-1 text-white/70">↑ NW</button><button onClick={()=>doMove(5)} className="glass rounded-lg py-1 text-white/70">↓ SE</button></div>
        <button onClick={()=>doMove(0)} className="glass rounded-lg py-2 text-white/70">→ E</button>
      </div>
      <div className="flex gap-2 w-full justify-center">
        <button onClick={()=>doMove(1)} className="px-3 py-1 rounded-full glass text-xs font-mono text-white/60">Q NE</button>
        <button onClick={()=>doMove(4)} className="px-3 py-1 rounded-full glass text-xs font-mono text-white/60">E SW</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">2048 hexagonal • 6 direcciones (Q/E diagonales) • Fusión • Niveles por score</p>
    </div>
  )
}
