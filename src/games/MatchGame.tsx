import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

const ICONS=['🔴','🟢','🔵','🟡','🟣','🟠']
const SIZE=8

type Cell={icon:string, id:number}
let gid=0

function randomBoard():Cell[][]{
  let b:Cell[][]
  do{
    b=Array.from({length:SIZE},()=> Array.from({length:SIZE},()=>({icon: ICONS[Math.floor(Math.random()*ICONS.length)], id: gid++})))
  } while(findMatches(b).size>0)
  return b
}

function findMatches(b:Cell[][]):Set<string>{
  const toRemove=new Set<string>()
  for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++){
    const c=b[y][x].icon
    // horiz 3+
    if(x<=SIZE-3 && b[y][x+1].icon===c && b[y][x+2].icon===c){
      let len=3; while(x+len < SIZE && b[y][x+len].icon===c) len++
      for(let k=0;k<len;k++) toRemove.add(`${x+k},${y}`)
    }
    // vert 3+
    if(y<=SIZE-3 && b[y+1][x].icon===c && b[y+2][x].icon===c){
      let len=3; while(y+len < SIZE && b[y+len][x].icon===c) len++
      for(let k=0;k<len;k++) toRemove.add(`${x},${y+k}`)
    }
  }
  return toRemove
}

function hasPossibleMove(b:Cell[][]):boolean{
  for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++){
    for(const [dx,dy] of [[1,0],[0,1]] as const){
      const nx=x+dx, ny=y+dy
      if(nx>=SIZE||ny>=SIZE) continue
      const copy=b.map(r=>r.map(c=>({...c})))
      const tmp=copy[y][x]; copy[y][x]=copy[ny][nx]; copy[ny][nx]=tmp
      if(findMatches(copy).size>0) return true
    }
  }
  return false
}

export default function MatchGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [board,setBoard]=useState<Cell[][]>(()=>randomBoard())
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [maxCombo,setMaxCombo]=useState(0)
  const [sel,setSel]=useState<[number,number]|null>(null)
  const [secs,setSecs]=useState(60)
  const [busy,setBusy]=useState(false)
  const [animDrop,setAnimDrop]=useState<Set<string>>(new Set())
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_match_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const timersRef=useRef<number[]>([])

  useEffect(()=>{
    const id=window.setInterval(()=>{
      if(isStartedRef.current===false) return
      if(busy) return
      setSecs(s=>{
        if(s<=1){
          // time up -> level up, reset timer, bonus
          const bonus=Math.floor(scoreRef.current*0.08)
          const ns=scoreRef.current+bonus
          setScore(ns)
          if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_match_best',String(ns))}catch{}; onScore(ns)}
          setLevel(l=>l+1)
          playTone(560,0.16,'triangle',0.12)
          return 60
        }
        return s-1
      })
    },1000)
    return()=>clearInterval(id)
  },[busy,onScore])

  const cascade=useCallback(async (startBoard:Cell[][], initPtsMultiplier=1)=>{
    let b=startBoard.map(r=>r.map(c=>({...c})))
    let totalPts=0
    let cascades=0
    let currentMult=initPtsMultiplier
    while(true){
      const matches=findMatches(b)
      if(matches.size===0) break
      cascades++
      const pts=matches.size*10*currentMult + (cascades>1? (cascades-1)*20:0)
      totalPts+=pts
      // remove
      const next:Cell[][]=b.map(r=>[...r])
      matches.forEach(k=>{
        const [mx,my]=k.split(',').map(Number)
        next[my][mx]=null as unknown as Cell
      })
      // gravity + refill with animation marks
      const dropSet=new Set<string>()
      for(let x=0;x<SIZE;x++){
        let col:Cell[]=[]
        for(let y=SIZE-1;y>=0;y--) if(next[y][x]) col.push(next[y][x]!)
        while(col.length<SIZE) col.push({icon: ICONS[Math.floor(Math.random()*ICONS.length)], id: gid++})
        col=col.reverse()
        for(let y=0;y<SIZE;y++){
          if(b[y][x].id !== col[y].id) dropSet.add(`${x},${y}`)
          next[y][x]=col[y]
        }
      }
      setAnimDrop(dropSet)
      b=next
      setBoard(b.map(r=>r.map(c=>({...c}))))
      playTone(620 + cascades*40, 0.09, 'triangle', 0.11)
      await new Promise(r=>{ const t=window.setTimeout(r, 280); timersRef.current.push(t) })
      currentMult+=0.35
      // ensure no deadlock
      if(cascades>12) break
    }
    setTimeout(()=>setAnimDrop(new Set()), 300)
    if(totalPts>0){
      const comboBonus= cascades>1? (cascades-1)*12 : 0
      const finalPts= totalPts + comboBonus
      const ns=scoreRef.current+finalPts
      setScore(ns)
      const newCombo= cascades>1? combo + cascades : (totalPts>0? 1:0)
      // keep combo if cascade else reset after delay
      if(cascades>1){
        setCombo(c=>c+cascades)
        setMaxCombo(m=>Math.max(m, combo+cascades))
      } else {
        setCombo(1)
        setTimeout(()=>setCombo(0), 1200)
      }
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_match_best',String(ns))}catch{}; onScore(ns)}
      // level progression
      setLevel(Math.floor(ns/380)+1)
    } else {
      setCombo(0)
    }
    // reshuffle if no moves
    if(!hasPossibleMove(b)){
      let nb:Cell[][]
      do{ nb=randomBoard() } while(!hasPossibleMove(nb))
      setBoard(nb)
      playTone(300,0.14,'sawtooth',0.08)
    }
  },[combo,onScore])

  const handleClick=async (x:number,y:number)=>{
    if(isStartedRef.current===false) return
    if(busy) return
    if(!sel){ setSel([x,y]); return }
    const [sx,sy]=sel
    if(sx===x && sy===y){ setSel(null); return }
    if(Math.abs(sx-x)+Math.abs(sy-y)!==1){ setSel([x,y]); return }
    // try swap
    const nb=board.map(r=>r.map(c=>({...c})))
    const tmp=nb[sy][sx]; nb[sy][sx]=nb[y][x]; nb[y][x]=tmp
    if(findMatches(nb).size===0){
      // invalid swap - shake
      setSel(null)
      playTone(150,0.10,'sawtooth',0.07)
      return
    }
    setBusy(true); setSel(null)
    setBoard(nb)
    await new Promise(r=> setTimeout(r, 140))
    await cascade(nb)
    setBusy(false)
  }

  const reset=()=>{
    timersRef.current.forEach(id=>clearTimeout(id)); timersRef.current=[]
    setBoard(randomBoard()); setScore(0); scoreRef.current=0; setCombo(0); setMaxCombo(0); setSel(null); setSecs(60); setLevel(1); setBusy(false)
  }

  useEffect(()=>()=>{ timersRef.current.forEach(id=>clearTimeout(id)) },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-[11px] font-mono text-fuchsia-300">LVL {level}</span>
          <span className="text-xs font-mono text-white/60">{secs}s</span>
          {combo>1 && <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black animate-pulse">COMBO x{combo}</span>}
        </div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <div className="glass rounded-lg px-2 py-1 text-[11px] font-mono text-white/50">MaxCombo {maxCombo}</div>
      </div>
      <div className="glass rounded-xl p-2 w-full">
        <div className="grid grid-cols-8 gap-1">
          {board.map((row,y)=> row.map((c,x)=>{
            const isSel=sel && sel[0]===x && sel[1]===y
            const isDrop=animDrop.has(`${x},${y}`)
            return (
              <button key={`${c.id}-${x}-${y}`} onClick={()=>handleClick(x,y)} disabled={busy}
                className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all duration-200 ${isSel?'scale-90 ring-2 ring-cyan-400 bg-cyan-400/20 z-10': isDrop?'animate-[drop_0.28s_ease]':'hover:scale-105'} ${busy?'opacity-80':''}`}
                style={{background: isSel? undefined : 'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', transform: isDrop? 'translateY(-6px)': undefined}}>
                <span className={isDrop?'animate-[pop_0.22s_ease]':''}>{c.icon}</span>
              </button>
            )
          }))}
        </div>
        {busy && <p className="text-center text-xs font-mono text-cyan-300 mt-2 animate-pulse">CASCADA...</p>}
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-fuchsia-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <button onClick={reset} className="px-4 py-2 rounded-lg bg-fuchsia-500 text-black font-black text-xs hover:brightness-110">NUEVO</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Match-3 8×8 • Cascada + Combo • Timer 60s por nivel • Validación swap • Sin deadlock</p>
      <style>{`@keyframes drop{0%{transform:translateY(-10px);opacity:0.8}100%{transform:translateY(0);opacity:1}} @keyframes pop{0%{transform:scale(0.85)}50%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
    </div>
  )
}
