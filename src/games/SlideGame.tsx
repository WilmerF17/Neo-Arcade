import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

type Size=4|5

function isSolvable(board:number[], size:Size):boolean{
  const arr=board.filter(v=>v!==0)
  let inv=0
  for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++) if(arr[i]>arr[j]) inv++
  if(size%2===1) return inv%2===0
  const zeroRowFromBottom= size - Math.floor(board.indexOf(0)/size)
  return (zeroRowFromBottom%2===0) ? inv%2===1 : inv%2===0
}

function makeShuffled(size:Size):number[]{
  const N=size*size
  let arr=Array.from({length:N},(_,i)=> i===N-1?0:i+1)
  // shuffle via random valid moves to guarantee solvable
  for(let i=0;i<800;i++){
    const zero=arr.indexOf(0)
    const moves:number[]=[]
    if(zero%size!==0) moves.push(zero-1)
    if(zero%size!==size-1) moves.push(zero+1)
    if(zero>=size) moves.push(zero-size)
    if(zero<N-size) moves.push(zero+size)
    const pick=moves[Math.floor(Math.random()*moves.length)]
    ;[arr[zero],arr[pick]]=[arr[pick],arr[zero]]
  }
  // ensure not already solved and solvable
  if(arr.every((v,i)=> v=== (i===N-1?0:i+1))) return makeShuffled(size)
  if(!isSolvable(arr,size)) {
    // swap two non-zero to flip parity
    const a=arr.indexOf(1), b=arr.indexOf(2)
    ;[arr[a],arr[b]]=[arr[b],arr[a]]
  }
  return arr
}

export default function SlideGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [size,setSize]=useState<Size>(4)
  const [board,setBoard]=useState<number[]>(()=>makeShuffled(4))
  const [moves,setMoves]=useState(0)
  const [score,setScore]=useState(0)
  const [secs,setSecs]=useState(0)
  const [won,setWon]=useState(false)
  const [animIdx,setAnimIdx]=useState<number|null>(null)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_slide_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])

  useEffect(()=>{
    const id=window.setInterval(()=>{ if(isStartedRef.current===false) return; if(won) return; setSecs(s=>s+1) },1000)
    return()=>clearInterval(id)
  },[won])

  const reset=(s:Size=size)=>{
    setBoard(makeShuffled(s)); setMoves(0); setWon(false); setSecs(0); setAnimIdx(null)
  }
  const changeSize=(s:Size)=>{
    setSize(s); setBoard(makeShuffled(s)); setMoves(0); setWon(false); setSecs(0)
  }

  const move=useCallback((idx:number)=>{
    if(isStartedRef.current===false) return
    if(won) return
    const zero=board.indexOf(0)
    const can= Math.abs(zero%size - idx%size)+Math.abs(Math.floor(zero/size)-Math.floor(idx/size))===1
    if(!can) return
    const nb=[...board]; [nb[zero],nb[idx]]=[nb[idx],nb[zero]]
    setBoard(nb); setMoves(m=>m+1)
    setAnimIdx(idx)
    setTimeout(()=>setAnimIdx(null),180)
    playTone(520,0.06,'square',0.08)
    const win=nb.every((v,i)=> v=== (i===size*size-1?0:i+1))
    if(win){
      const timeBonus=Math.max(0, 300 - secs*1.2)
      const moveBonus=Math.max(0, (size===4? 180:320) - moves*1.8)
      const pts=Math.floor((size===4? 200:380) + timeBonus + moveBonus)
      const ns=scoreRef.current+pts
      setScore(ns); setWon(true)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_slide_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      playTone(880,0.2,'triangle',0.16); setTimeout(()=>playTone(1100,0.22,'triangle',0.14),150)
    }
  },[board,size,won,moves,secs,onScore])

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      const zero=board.indexOf(0)
      let tgt=-1
      if(e.key==='ArrowUp' && zero < size*size - size) tgt=zero+size
      if(e.key==='ArrowDown' && zero>=size) tgt=zero-size
      if(e.key==='ArrowLeft' && zero%size!==size-1) tgt=zero+1
      if(e.key==='ArrowRight' && zero%size!==0) tgt=zero-1
      if(tgt!==-1){ e.preventDefault(); move(tgt) }
    }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[board,size,move])

  const timeStr=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <div className="flex gap-2 w-full">
        <button onClick={()=>changeSize(4)} className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-black border ${size===4?'bg-cyan-400 text-black border-cyan-400':'glass text-white/60 border-white/10'}`}>4×4 CLÁSICO</button>
        <button onClick={()=>changeSize(5)} className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-black border ${size===5?'bg-fuchsia-500 text-black border-fuchsia-500':'glass text-white/60 border-white/10'}`}>5×5 ÉLITE</button>
      </div>
      <div className="flex gap-2 w-full">
        <div className="glass rounded-lg px-3 py-1.5 flex-1 flex justify-between items-center"><span className="text-[11px] font-mono text-cyan-300">MOV {moves}</span><span className="text-[11px] font-mono text-white/60">{timeStr}</span></div>
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="glass rounded-xl p-3 w-full">
        <div className="grid gap-1.5" style={{gridTemplateColumns:`repeat(${size},1fr)`}}>
          {board.map((v,i)=>{
            const empty=v===0
            const isAnim=animIdx===i
            const hue=(v* 360/Math.max(12,size*size))%360
            return (
              <button key={i} onClick={()=>move(i)} disabled={empty}
                className={`aspect-square rounded-lg font-black flex items-center justify-center transition-all duration-180 ${empty?'bg-transparent border border-white/5':'hover:scale-[1.04] hover:brightness-125 active:scale-[0.98]'}`}
                style={{
                  background: empty?'transparent': `linear-gradient(135deg, hsl(${hue},100%,60%), #0a0a1a)`,
                  color: empty?'transparent':'#fff',
                  border: empty?'1px solid rgba(255,255,255,0.06)':'1px solid rgba(255,255,255,0.14)',
                  boxShadow: empty?'none':`0 0 10px hsla(${hue},100%,60%,0.35)`,
                  fontFamily:'Orbitron',
                  fontSize: size===5?'15px':'18px',
                  transform: isAnim? 'scale(0.92)' : undefined,
                  opacity: isAnim? 0.85:1
                }}>
                {empty?'':v}
              </button>
            )
          })}
        </div>
        {won && <div className="mt-3 p-2 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-center"><p className="font-black text-emerald-300" style={{fontFamily:'Orbitron'}}>¡RESUELTO {size}×{size} en {moves} movs!</p><p className="text-xs font-mono text-white/60">{timeStr}</p><button onClick={()=>reset()} className="mt-1 px-3 py-1 rounded-full bg-emerald-400 text-black font-black text-xs">NUEVO PUZZLE</button></div>}
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <button onClick={()=>reset()} className="px-4 py-2 rounded-lg bg-cyan-400 text-black font-black text-xs hover:brightness-110">MEZCLAR</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Shuffle soluble (inversiones) • Animación deslizante • 4×4 y 5×5 • Timer</p>
    </div>
  )
}
