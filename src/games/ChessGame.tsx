import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

type Side='w'|'b'
type Puzzle={
  id:number
  fen:string
  q:string
  opts:string[]
  correct:number
  diff:number
  hint:string
}

const PUZZLES:Puzzle[]=[
  {id:1, fen:'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w', q:'Blancas juegan y ganan peón: ¿cuál es la táctica?', opts:['Cxe5','Ab5','d4'], correct:0, diff:1, hint:'Caballo captura en e5 aprovechando clavada'},
  {id:2, fen:'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w', q:'Mate en 1: Rey negro en h8, Dama blanca en h5, peón g6', opts:['Dh7#','Dg6','Cf7+'], correct:0, diff:1, hint:'Dama a h7 apoyada por peón'},
  {id:3, fen:'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w', q:'Juego italiano: mejor jugada blanca', opts:['Cg5','d3','O-O'], correct:0, diff:1, hint:'Ataque al punto f7'},
  {id:4, fen:'', q:'¿Qué pieza se mueve en L?', opts:['Caballo','Alfil','Torre'], correct:0, diff:1, hint:'Salta piezas'},
  {id:5, fen:'', q:'Apertura: 1.e4 e5 2.Cf3 ¿respuesta negra principal?', opts:['Cc6','d5','Ab4'], correct:0, diff:1, hint:'Defiende peón e5'},
  {id:6, fen:'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w', q:'Blancas alfil c4 ataca f7, negras caballo f6 defiende. ¿Sacrificio?', opts:['Cxe5','Bxf7+','d4'], correct:1, diff:2, hint:'Alfil por f7 jaque'},
  {id:7, fen:'', q:'¿Enroque largo se anota como?', opts:['O-O-O','O-O','Re2'], correct:0, diff:1, hint:'Tres ceros'},
  {id:8, fen:'', q:'Mate en 2: Dama y torre vs rey solo, ¿idea?', opts:['Jaques forzados','Esperar','Tablas'], correct:0, diff:2, hint:'Limitar casillas'},
  {id:9, fen:'', q:'Blancas: Rey g1, Torre e1, Negras Rey h8 ¿mate?', opts:['Te8#','Tg1+','Rh1'], correct:0, diff:1, hint:'Octava fila'},
  {id:10, fen:'', q:'Valor material: Dama=?', opts:['9','5','3'], correct:0, diff:1, hint:'Más que torre+alfil'},
]

function FenBoard({fen}:{fen:string}){
  // simple 8x8 visual using FEN if present, else decorative
  if(!fen){
    return (
      <div className="grid grid-cols-8 gap-0.5 p-1 rounded-lg bg-[#1a1a2e] border border-white/10 max-w-[260px] mx-auto">
        {Array.from({length:64}).map((_,i)=>{
          const isDark=(Math.floor(i/8)+i%8)%2===1
          const piece= i===4?'♔': i===60?'♚': i===22?'♛': i===18?'♞': i===42?'♝':''
          return <div key={i} className="aspect-square flex items-center justify-center text-[12px]" style={{background:isDark?'#2a2a3a':'#e8e8e8', color:isDark?'#fff':'#0a0a1a'}}>{piece}</div>
        })}
      </div>
    )
  }
  const rows=fen.split(' ')[0].split('/')
  const cells:string[]=[]
  rows.forEach(r=>{
    for(const ch of r){
      if(/\d/.test(ch)) for(let i=0;i<Number(ch);i++) cells.push('')
      else cells.push(ch)
    }
  })
  const map:Record<string,string>={p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',P:'♙',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔'}
  return (
    <div className="grid grid-cols-8 gap-0.5 p-1 rounded-lg bg-[#1a1a2e] border border-white/10 max-w-[260px] mx-auto">
      {cells.map((c,i)=>{
        const isDark=(Math.floor(i/8)+i%8)%2===1
        const isWhite= c && c===c.toUpperCase()
        return <div key={i} className="aspect-square flex items-center justify-center text-[14px] font-bold" style={{background:isDark?'#2a2a3a':'#e8e8e8', color: c? (isWhite?'#fff':'#0a0a1a') : 'transparent', textShadow: c? '0 1px 2px rgba(0,0,0,0.5)': 'none'}}>{c? (map[c]||c) : ''}</div>
      })}
    </div>
  )
}

export default function ChessGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [idx,setIdx]=useState(0)
  const [score,setScore]=useState(0)
  const [picked,setPicked]=useState<number|null>(null)
  const [result,setResult]=useState<'ok'|'bad'|null>(null)
  const [showHint,setShowHint]=useState(false)
  const [secs,setSecs]=useState(0)
  const [streak,setStreak]=useState(0)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_chess_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const timerRef=useRef<number|null>(null)
  const puz=PUZZLES[idx % PUZZLES.length]

  useEffect(()=>{
    const id=window.setInterval(()=>{ if(isStartedRef.current===false) return; if(result) return; setSecs(s=>s+1) },1000)
    timerRef.current=id as unknown as number
    return()=> window.clearInterval(id)
  },[result])

  const choose=useCallback((i:number)=>{
    if(isStartedRef.current===false) return
    if(result) return
    setPicked(i)
    const ok=i===puz.correct
    setResult(ok?'ok':'bad')
    if(ok){
      const timeBonus=Math.max(0, 20 - Math.floor(secs/3))
      const streakBonus=streak*4
      const pts=20 + timeBonus + streakBonus
      const ns=scoreRef.current+pts
      setScore(ns); setStreak(s=>s+1)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_chess_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      playTone(660,0.12,'triangle',0.14); setTimeout(()=>playTone(880,0.14,'triangle',0.12),90)
      window.setTimeout(()=>{ setIdx(v=>v+1); setPicked(null); setResult(null); setShowHint(false); setSecs(0)}, 900)
    } else {
      setStreak(0)
      playTone(160,0.16,'sawtooth',0.08)
      window.setTimeout(()=>{ setPicked(null); setResult(null)}, 700)
    }
  },[puz,secs,streak,result,onScore])

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key>='1' && e.key<='3') choose(Number(e.key)-1)
      if(e.key==='h' || e.key==='H') setShowHint(v=>!v)
    }
    window.addEventListener('keydown',h)
    return()=> window.removeEventListener('keydown',h)
  },[choose])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[420px]">
      <div className="glass rounded-xl p-5 w-full">
        <div className="flex justify-between items-center">
          <p className="text-[11px] font-mono tracking-widest text-cyan-300">PUZZLE {idx+1} / ∞ • LVL {puz.diff}</p>
          <div className="flex gap-2 items-center">
            <span className="text-[11px] font-mono text-white/60">{secs}s</span>
            {streak>1 && <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">RACHA x{streak}</span>}
            <span className="px-2 py-1 rounded-full text-[11px] font-mono bg-white/10 text-white/60">♔ TÁCTICAS</span>
          </div>
        </div>
        <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-[#0f1a2e] to-[#1a0f2e] border border-white/10">
          <p className="font-bold text-white text-sm leading-relaxed">{puz.q}</p>
          <p className="text-xs font-mono text-white/40 mt-1">Elige la jugada ganadora • Teclas 1-3 • H pista</p>
        </div>
        <div className="mt-4">
          <FenBoard fen={puz.fen}/>
        </div>
        {showHint && <p className="mt-3 text-xs font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2">💡 {puz.hint}</p>}
        <div className="mt-4 grid gap-2">
          {puz.opts.map((op,i)=>(
            <button key={i} onClick={()=>choose(i)} className={`p-3 rounded-xl text-left font-mono text-sm border transition flex justify-between items-center ${picked===i? (result==='ok'?'bg-emerald-400 text-black border-emerald-400': result==='bad'?'bg-red-500 text-white border-red-500':'glass'): 'glass border-white/10 hover:bg-white/10 text-white'}`}>
              <span><span className="font-black mr-2">{i+1}.</span>{op}</span>
              {picked===i && result && <span className="text-lg">{result==='ok'?'✓':'✕'}</span>}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>setShowHint(v=>!v)} className="flex-1 py-1.5 rounded-lg glass text-xs font-mono text-white/60 hover:bg-white/10">💡 {showHint?'OCULTAR':'PISTA'}</button>
          <button onClick={()=>{ setIdx(v=>v+1); setPicked(null); setResult(null); setShowHint(false); setSecs(0)}} className="flex-1 py-1.5 rounded-lg glass text-xs font-mono text-white/60 hover:bg-white/10">SALTAR →</button>
        </div>
        {result && <p className={`mt-3 text-center font-black text-sm ${result==='ok'?'text-emerald-300':'text-red-300'}`} style={{fontFamily:'Orbitron'}}>{result==='ok'?`¡CORRECTO! +${20+Math.max(0,20-Math.floor(secs/3))+streak*4}`:'Inténtalo de nuevo'}</p>}
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-amber-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <button onClick={()=>{ setScore(0); setIdx(0); setPicked(null); setResult(null); setStreak(0); setSecs(0)}} className="px-3 py-2 rounded-lg glass text-white/70 text-xs">REINICIAR</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono">FEN real • Validación • Timer • Racha • Pista</p>
    </div>
  )
}
