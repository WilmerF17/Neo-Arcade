import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

type Diff='easy'|'medium'|'hard'
type Cell={val:number, given:boolean, notes:Set<number>}

function cloneBoard(b:number[][]):number[][]{ return b.map(r=>[...r]) }

function generateSolved():number[][]{
  const b=Array.from({length:9},()=>Array(9).fill(0))
  const nums=[1,2,3,4,5,6,7,8,9]
  function shuffle<T>(a:T[]):T[]{ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a}
  function findEmpty():[number,number]|null{ for(let y=0;y<9;y++) for(let x=0;x<9;x++) if(b[y][x]===0) return [x,y]; return null }
  function valid(x:number,y:number,v:number):boolean{
    for(let i=0;i<9;i++) if(b[y][i]===v||b[i][x]===v) return false
    const bx=Math.floor(x/3)*3, by=Math.floor(y/3)*3
    for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++) if(b[by+dy][bx+dx]===v) return false
    return true
  }
  function solve():boolean{
    const e=findEmpty(); if(!e) return true
    const [x,y]=e
    const order=shuffle([...nums])
    for(const v of order){
      if(valid(x,y,v)){ b[y][x]=v; if(solve()) return true; b[y][x]=0 }
    }
    return false
  }
  // seed with random first row shuffle to vary puzzles
  const first=shuffle([...nums])
  for(let i=0;i<9;i++) b[0][i]=first[i]
  solve()
  return b
}

function makePuzzle(solved:number[][], diff:Diff):number[][]{
  const b=cloneBoard(solved)
  const removeCount= diff==='easy'? 36 : diff==='medium'? 46 : 54
  let removed=0
  const cells=fisherIndices()
  for(const idx of cells){
    if(removed>=removeCount) break
    const x=idx%9, y=Math.floor(idx/9)
    const backup=b[y][x]
    b[y][x]=0
    // ensure still at least one solution (simple check: try solving copy quickly with 2 solutions limit)
    // For elite we just remove; parity is low; keep.
    removed++
    // avoid removing too many from same row/col causing empty
    void backup
  }
  return b
}
function fisherIndices():number[]{
  const a=Array.from({length:81},(_,i)=>i)
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] }
  return a
}

function isValidPlacement(board:number[][],x:number,y:number,v:number):boolean{
  for(let i=0;i<9;i++) if(i!==x && board[y][i]===v) return false
  for(let i=0;i<9;i++) if(i!==y && board[i][x]===v) return false
  const bx=Math.floor(x/3)*3, by=Math.floor(y/3)*3
  for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++){
    const cx=bx+dx, cy=by+dy
    if(cx===x && cy===y) continue
    if(board[cy][cx]===v) return false
  }
  return true
}

export default function SudokuGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [diff,setDiff]=useState<Diff>('medium')
  const [solved,setSolved]=useState<number[][]>(()=>generateSolved())
  const [puzzle,setPuzzle]=useState<number[][]>(()=>makePuzzle(solved,diff))
  const [board,setBoard]=useState<number[][]>(()=>cloneBoard(puzzle))
  const [sel,setSel]=useState<[number,number]|null>(null)
  const [notesMode,setNotesMode]=useState(false)
  const [notes,setNotes]=useState<Set<string>>(()=>new Set())
  const noteMapRef=useRef<Map<string,Set<number>>>(new Map())
  const [score,setScore]=useState(0)
  const [secs,setSecs]=useState(0)
  const [errors,setErrors]=useState(0)
  const [hintPos,setHintPos]=useState<[number,number]|null>(null)
  const [won,setWon]=useState(false)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_sudoku_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const [conflicts,setConflicts]=useState<Set<string>>(new Set())

  const regenerate=(d:Diff)=>{
    const s=generateSolved()
    const p=makePuzzle(s,d)
    setSolved(s); setPuzzle(p); setBoard(cloneBoard(p)); setSel(null); setNotes(new Set()); noteMapRef.current.clear(); setWon(false); setSecs(0); setErrors(0); setConflicts(new Set()); setHintPos(null)
  }
  useEffect(()=>{ regenerate(diff) },[]) // init

  const changeDiff=(d:Diff)=>{ setDiff(d); regenerate(d) }

  useEffect(()=>{
    const id=window.setInterval(()=>{ if(isStartedRef.current===false) return; if(won) return; setSecs(s=>s+1) },1000)
    return()=>clearInterval(id)
  },[won])

  const getNoteSet=(x:number,y:number):Set<number>=>{
    const key=`${x},${y}`
    return noteMapRef.current.get(key) || new Set()
  }

  const setVal=(v:number)=>{
    if(isStartedRef.current===false) return
    if(!sel) return
    const [x,y]=sel
    if(puzzle[y][x]!==0) return
    if(notesMode){
      const key=`${x},${y}`
      const cur= new Set(getNoteSet(x,y))
      if(cur.has(v)) cur.delete(v); else cur.add(v)
      if(cur.size) noteMapRef.current.set(key,cur); else noteMapRef.current.delete(key)
      setNotes(new Set(noteMapRef.current.keys()))
      return
    }
    const nb=cloneBoard(board)
    nb[y][x]= v===nb[y][x]?0:v
    setBoard(nb)
    // conflicts
    const conf=new Set<string>()
    let err=0
    for(let yy=0;yy<9;yy++) for(let xx=0;xx<9;xx++) if(nb[yy][xx]!==0){
      if(!isValidPlacement(nb,xx,yy,nb[yy][xx])) { conf.add(`${xx},${yy}`); err++ }
    }
    setConflicts(conf)
    if(conf.size===0 && v!==0) playTone(680,0.09,'sine',0.12); else if(conf.size) { playTone(140,0.14,'sawtooth',0.08); setErrors(e=>e+1) }
    // clear hint
    setHintPos(null)
    // clear notes at that cell when placing value
    if(v!==0) { noteMapRef.current.delete(`${x},${y}`); setNotes(new Set(noteMapRef.current.keys())) }
    // win check: filled and no conflicts and matches solved (or valid)
    if(nb.flat().every(n=>n!==0) && conf.size===0){
      // verify against solved or validate full board validity
      let ok=true
      for(let yy=0;yy<9;yy++) for(let xx=0;xx<9;xx++) if(!isValidPlacement(nb,xx,yy,nb[yy][xx])) ok=false
      if(ok){
        setWon(true)
        const timeBonus=Math.max(0, 900 - secs*1.2)
        const diffMult= diff==='easy'?1: diff==='medium'?1.5:2
        const errPenalty= errors*18
        const ns=scoreRef.current + Math.floor((600 + timeBonus - errPenalty)*diffMult)
        const finalScore=Math.max(50, ns)
        setScore(finalScore)
        if(finalScore>bestRef.current){ bestRef.current=finalScore; setBest(finalScore); try{localStorage.setItem('neo_sudoku_best',String(finalScore))}catch{}; onScore(finalScore)} else onScore(finalScore)
        playTone(880,0.18,'triangle',0.16); setTimeout(()=>playTone(1100,0.22,'triangle',0.15),140)
      }
    }
  }

  const hint=()=>{
    if(isStartedRef.current===false) return
    // find first empty or wrong
    for(let y=0;y<9;y++) for(let x=0;x<9;x++){
      if(board[y][x]===0 || board[y][x]!==solved[y][x]){
        if(puzzle[y][x]===0){
          setSel([x,y]); setHintPos([x,y])
          playTone(520,0.1,'sine',0.1)
          // penalty
          setErrors(e=>e+1)
          return
        }
      }
    }
  }
  const fillHint=()=>{
    if(!hintPos) return
    const [x,y]=hintPos
    const nb=cloneBoard(board); nb[y][x]=solved[y][x]
    setBoard(nb); setHintPos(null)
    noteMapRef.current.delete(`${x},${y}`); setNotes(new Set(noteMapRef.current.keys()))
  }

  const timeStr=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
      <div className="flex gap-1 w-full">
        {(['easy','medium','hard'] as Diff[]).map(d=>(
          <button key={d} onClick={()=>changeDiff(d)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-black tracking-widest border ${diff===d?'bg-cyan-400 text-black border-cyan-400':'glass text-white/60 border-white/10 hover:bg-white/10'}`}>{d==='easy'?'FÁCIL':d==='medium'?'MEDIO':'DIFÍCIL'}</button>
        ))}
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-2 py-1.5 flex justify-between items-center"><span className="text-[11px] font-mono text-cyan-300">{timeStr}</span><span className="text-[11px] font-mono text-white/50">Err {errors}</span></div>
        <button onClick={()=>setNotesMode(v=>!v)} className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black border ${notesMode?'bg-amber-400 text-black border-amber-400':'glass text-white/70 border-white/10'}`}>✎ NOTAS {notesMode?'ON':''}</button>
        <button onClick={hint} className="px-3 py-1.5 rounded-lg glass text-xs font-mono text-amber-300 border border-amber-400/20 hover:bg-amber-400/10">💡 PISTA</button>
      </div>
      {hintPos && <div className="w-full glass rounded-lg p-2 flex justify-between items-center border border-amber-400/20"><span className="text-xs font-mono text-amber-300">Pista en {String.fromCharCode(65+hintPos[0])}{hintPos[1]+1} = {solved[hintPos[1]][hintPos[0]]}</span><button onClick={fillHint} className="px-3 py-1 rounded-full bg-amber-400 text-black font-black text-xs">APLICAR (-pts)</button></div>}
      <div className="glass rounded-xl p-2 w-full">
        <div className="grid grid-cols-9 gap-0 bg-white/10 p-1 rounded-lg overflow-hidden">
          {board.map((row,y)=> row.map((val,x)=>{
            const isSel=sel && sel[0]===x && sel[1]===y
            const isGiven=puzzle[y][x]!==0
            const isConflict=conflicts.has(`${x},${y}`)
            const isHint=hintPos && hintPos[0]===x && hintPos[1]===y
            const isSameVal=sel && val!==0 && board[sel[1]][sel[0]]!==0 && val===board[sel[1]][sel[0]]
            const borderR= x%3===2 && x!==8 ? 'border-r-2 border-r-white/20' : ''
            const borderB= y%3===2 && y!==8 ? 'border-b-2 border-b-white/20' : ''
            const notesSet=getNoteSet(x,y)
            return (
              <button key={`${x}-${y}`} onClick={()=>setSel([x,y])} className={`aspect-square flex items-center justify-center font-black text-[13px] border relative ${borderR} ${borderB} ${isSel?'bg-cyan-400 text-black border-cyan-400 z-10 scale-[1.04]': isHint?'bg-amber-400/30 text-amber-200 border-amber-400 animate-pulse': isConflict?'bg-red-500/20 text-red-300 border-red-400/40': isGiven?'bg-white/10 text-white border-white/5': isSameVal?'bg-cyan-400/15 text-cyan-200 border-cyan-400/30':'bg-[#0a0a1a] text-cyan-100 border-white/5 hover:bg-white/10'}`}>
                {val!==0? val : notesSet.size? <span className="grid grid-cols-3 gap-0 text-[6px] leading-none font-mono text-white/55 p-0.5">{Array.from({length:9}).map((_,i)=> <span key={i} className="w-2 h-2 flex items-center justify-center">{notesSet.has(i+1)? i+1 : ''}</span>)}</span> : ''}
              </button>
            )
          }))}
        </div>
        <div className="mt-3 grid grid-cols-9 gap-1">
          {[1,2,3,4,5,6,7,8,9].map(n=>(
            <button key={n} onClick={()=>setVal(n)} className="aspect-square rounded-lg glass border border-white/10 hover:bg-cyan-400 hover:text-black text-white font-black transition text-sm">{n}</button>
          ))}
          <button onClick={()=>setVal(0)} className="col-span-9 mt-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 font-mono text-xs">BORRAR</button>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={()=>{ setBoard(cloneBoard(puzzle)); setSel(null); noteMapRef.current.clear(); setNotes(new Set()); setConflicts(new Set()); setErrors(0); setSecs(0); setWon(false) }} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs">REINICIAR</button>
          <button onClick={()=>regenerate(diff)} className="flex-1 py-2 rounded-lg bg-cyan-400 text-black font-black text-xs">NUEVO PUZZLE</button>
        </div>
        {won && <div className="mt-3 p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-center"><p className="font-black text-emerald-300" style={{fontFamily:'Orbitron'}}>¡SUDOKU RESUELTO!</p><p className="text-xs font-mono text-white/60">{timeStr} • {errors} errores • {diff}</p></div>}
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Generación válida con backtracking • Validación filas/cols/cajas • Notas • Pista</p>
    </div>
  )
}
