import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

type Puzzle={fen:string,q:string,opts:string[],a:number,pts:number,diff:number,hint:string, level:number}

const PUZZLES:Puzzle[]=[
  {fen:'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', q:'Blancas juegan y ganan material — nivel 1', opts:['Cxe5','Ab5','d4'], a:0, pts:20, diff:1, hint:'Caballo por peón e5, clavada', level:1},
  {fen:'r1bqkb1r/pppp1ppp/2n2n2/2b1p3/4P3/5N2/PPPP1PPP/RNBQKB1R w', q:'Giuoco Piano: ataque al punto f7', opts:['Cg5','O-O','d3'], a:0, pts:22, diff:2, hint:'Caballo g5 presiona f7', level:1},
  {fen:'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w', q:'Defensa Siciliana: mejor para blancas', opts:['Cf3','c3','f4'], a:0, pts:20, diff:1, hint:'Desarrollo natural Cf3', level:1},
  {fen:'', q:'Mate en 1: Rey h8, Dama h5, peón g6 vs Rey h8', opts:['Dh7#','Dg5','Cf7'], a:0, pts:24, diff:1, hint:'Dama h7 apoyada', level:2},
  {fen:'', q:'Jaque doble con caballo y alfil en posición abierta', opts:['Cf7+','Ce6','Ab5'], a:0, pts:26, diff:2, hint:'Doble jaque ineludible', level:2},
  {fen:'', q:'Enroque largo es:', opts:['O-O-O','O-O','Re2'], a:0, pts:15, diff:1, hint:'Tres ceros', level:1},
  {fen:'r2qkb1r/pp2pppp/2n2n2/2pp4/3P1B2/3Q4/PPP2PPP/RNB1K2R w', q:'Mate en 2: sacrificio en f7', opts:['Bxf7+','Cxd5','O-O'], a:0, pts:30, diff:3, hint:'Alfil por f7+ abre rey', level:3},
  {fen:'', q:'Valor: Dama=9, Torre=5, ¿Alfil y Caballo?', opts:['3','5','2'], a:0, pts:15, diff:1, hint:'3 puntos', level:1},
  {fen:'', q:'Táctica: clavada absoluta deja pieza inmóvil', opts:['Rey detrás','Cualquier','Solo peón'], a:0, pts:18, diff:2, hint:'Rey detrás de pieza clavada', level:2},
  {fen:'', q:'Final: Rey y peón vs Rey, ¿regla del cuadrado?', opts:['Peón corona','Tablas si rey llega','Gana siempre'], a:1, pts:22, diff:2, hint:'Depende de tempo del rey', level:2},
]

function FenBoard({fen}:{fen:string}){
  if(!fen) return (
    <div className="grid grid-cols-8 gap-0.5 p-1 rounded-lg bg-[#1a1a2e] border border-white/10 max-w-[240px] mx-auto">
      {Array.from({length:64}).map((_,i)=>{
        const isDark=(Math.floor(i/8)+i%8)%2===1
        return <div key={i} className="aspect-square flex items-center justify-center text-[9px]" style={{background:isDark?'#2a2a3a':'#e8e8e8'}}>{i===4?'♔':i===60?'♚':i===22?'♛':''}</div>
      })}
    </div>
  )
  const rows=fen.split(' ')[0].split('/')
  const cells:string[]=[]
  rows.forEach(r=>{ for(const ch of r){ if(/\d/.test(ch)) for(let i=0;i<Number(ch);i++) cells.push(''); else cells.push(ch) } })
  const map:Record<string,string>={p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',P:'♙',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔'}
  return (
    <div className="grid grid-cols-8 gap-0.5 p-1 rounded-lg bg-[#1a1a2e] border border-white/10 max-w-[240px] mx-auto">
      {cells.map((c,i)=>{
        const isDark=(Math.floor(i/8)+i%8)%2===1
        return <div key={i} className="aspect-square flex items-center justify-center text-[13px]" style={{background:isDark?'#2a2a3a':'#e8e8e8', color:c? (c===c.toUpperCase()?'#fff':'#0a0a1a'):'transparent'}}>{c?map[c]||c:''}</div>
      })}
    </div>
  )
}

export default function ChessUltraGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
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
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_chessultra_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const puz=PUZZLES[idx%PUZZLES.length]

  useEffect(()=>{
    const id=window.setInterval(()=>{ if(isStartedRef.current===false) return; if(result) return; setSecs(s=>s+1) },1000)
    return()=>clearInterval(id)
  },[result])

  const choose=useCallback((i:number)=>{
    if(isStartedRef.current===false) return
    if(result) return
    setPicked(i)
    const ok=i===puz.a
    setResult(ok?'ok':'bad')
    if(ok){
      const timeBonus=Math.max(0, 18 - Math.floor(secs/2.5))
      const levelBonus=puz.level*4
      const streakBonus=streak*5
      const pts=puz.pts + timeBonus + levelBonus + streakBonus
      const ns=scoreRef.current+pts
      setScore(ns); setStreak(s=>s+1)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_chessultra_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      playTone(740,0.11,'triangle',0.14); setTimeout(()=>playTone(980,0.16,'triangle',0.13),100)
      window.setTimeout(()=>{ setIdx(v=>v+1); setPicked(null); setResult(null); setShowHint(false); setSecs(0)}, 850)
    } else {
      setStreak(0)
      playTone(150,0.15,'sawtooth',0.08)
      window.setTimeout(()=>{ setPicked(null); setResult(null)}, 680)
    }
  },[puz,secs,streak,result,onScore])

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key>='1'&&e.key<='3') choose(Number(e.key)-1); if(e.key==='h'||e.key==='H') setShowHint(v=>!v) }
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  },[choose])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
      <div className="glass rounded-xl p-4 w-full">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-mono tracking-widest text-cyan-300">ULTRA {idx+1} • LVL {puz.level} • {puz.diff}★</span>
          <div className="flex gap-2 items-center">
            <span className="text-[11px] font-mono text-white/60">{secs}s</span>
            {streak>1 && <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black animate-pulse">RACHA x{streak}</span>}
            <span className="px-2 py-1 rounded-full bg-white/10 text-[11px] font-mono text-white/60">♔ ÉLITE</span>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-[#0f1a2e] to-[#1a0f2e] border border-white/10">
          <p className="font-bold text-white text-sm">{puz.q}</p>
          <p className="text-xs font-mono text-white/40 mt-1">Elige la jugada brillante • 1-3 • H pista</p>
        </div>
        <div className="mt-3"><FenBoard fen={puz.fen}/></div>
        {showHint && <p className="mt-3 text-xs font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2">💡 {puz.hint}</p>}
        <div className="mt-3 grid gap-2">
          {puz.opts.map((op,i)=>(
            <button key={i} onClick={()=>choose(i)} className={`p-2.5 rounded-xl text-left font-mono text-sm border transition flex justify-between items-center ${picked===i? (result==='ok'?'bg-emerald-400 text-black border-emerald-400':'bg-red-500 text-white border-red-500'):'glass border-white/10 hover:bg-white/10 text-white'}`}>
              <span><b className="mr-2">{i+1}.</b>{op}</span>
              {picked===i && <span>{result==='ok'?'✓':'✕'}</span>}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>setShowHint(v=>!v)} className="flex-1 py-1.5 rounded-lg glass text-xs font-mono text-white/60 hover:bg-white/10">💡 {showHint?'OCULTAR':'PISTA'}</button>
          <button onClick={()=>{ setIdx(v=>v+1); setPicked(null); setResult(null); setShowHint(false); setSecs(0)}} className="flex-1 py-1.5 rounded-lg glass text-xs font-mono text-white/60 hover:bg-white/10">SALTAR →</button>
        </div>
        {result && <p className={`mt-2 text-center font-black text-sm ${result==='ok'?'text-emerald-300':'text-red-300'}`} style={{fontFamily:'Orbitron'}}>{result==='ok'?`¡BRILLANTE! +${puz.pts+Math.max(0,18-Math.floor(secs/2.5))+puz.level*4+streak*5 -5}`:'Intenta de nuevo'}</p>}
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-amber-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <button onClick={()=>{ setScore(0); setIdx(0); setPicked(null); setResult(null); setStreak(0)}} className="px-3 py-2 rounded-lg glass text-xs font-mono text-white/60">REINICIAR</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">FEN • Mate 1-3 • Timer • Racha • Niveles 1-3</p>
    </div>
  )
}
