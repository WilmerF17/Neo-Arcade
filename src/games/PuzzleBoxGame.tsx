import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

type PuzzleType='math'|'seq'|'color'|'rotate'
type Puzzle={type:PuzzleType,q:string,opts:string[],a:number,hint:string}

const PUZZLES:Puzzle[]=[
  {type:'math', q:'2 + 2 × 2 = ?', opts:['6','8','4'], a:0, hint:'Multiplicación primero'},
  {type:'seq', q:'Siguiente: 2, 4, 8, 16, ?', opts:['24','32','30'], a:1, hint:'×2 cada vez'},
  {type:'color', q:'🔴 + 🔵 = 🟣  •  🔵 + 🟡 = 🟢  •  🔴 + 🟡 = ?', opts:['🟠','🟤','⚪'], a:0, hint:'Rojo+Amarillo=Naranja'},
  {type:'rotate', q:'Gira 90° horario: ┌ → ?', opts:['┐','└','┘'], a:0, hint:'Horario'},
  {type:'math', q:'Binario 1010 = ?', opts:['10','12','8'], a:0, hint:'8+2'},
  {type:'seq', q:'Secuencia: 1,1,2,3,5,8, ?', opts:['11','13','12'], a:1, hint:'Fibonacci'},
  {type:'color', q:'#FF0000 + #00FF00 = ?', opts:['#FFFF00',' #FF00FF','#00FFFF'], a:0, hint:'Rojo+Verde=Amarillo'},
  {type:'rotate', q:'Gira 180°: ↑ → ?', opts:['↓','←','→'], a:0, hint:'Opuesto'},
  {type:'math', q:'15% de 200 = ?', opts:['30','25','35'], a:0, hint:'10% es 20'},
  {type:'seq', q:'Primos: 2,3,5,7,11, ?', opts:['12','13','15'], a:1, hint:'Siguiente primo'},
  {type:'color', q:'Mezcla luz: 🔴+🟢+🔵 = ?', opts:['⚪','⚫','🟤'], a:0, hint:'Blanco'},
  {type:'rotate', q:'Espejo horizontal: b → ?', opts:['d','q','p'], a:0, hint:'Espejo'},
  {type:'math', q:'3² + 4² = ?', opts:['25','24','20'], a:0, hint:'9+16'},
  {type:'seq', q:'Potencias de 3: 1,3,9,27, ?', opts:['54','81','72'], a:1, hint:'×3'},
  {type:'rotate', q:'Gira 90° antihorario: ┐ → ?', opts:['┌','┘','└'], a:0, hint:'Antihorario'},
]

export default function PuzzleBoxGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [level,setLevel]=useState(0)
  const [score,setScore]=useState(0)
  const [streak,setStreak]=useState(0)
  const [picked,setPicked]=useState<number|null>(null)
  const [result,setResult]=useState<'ok'|'bad'|null>(null)
  const [showHint,setShowHint]=useState(false)
  const [rotation,setRotation]=useState(0)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_puzzlebox_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const timersRef=useRef<number[]>([])

  const puz=PUZZLES[level % PUZZLES.length]
  const tier=Math.floor(level/5)+1

  const choose=useCallback((i:number)=>{
    if(isStartedRef.current===false) return
    if(result) return
    setPicked(i)
    const ok=i===puz.a
    setResult(ok?'ok':'bad')
    if(ok){
      const streakBonus=streak*6
      const tierBonus=tier*4
      const pts=20 + tierBonus + streakBonus
      const ns=scoreRef.current+pts
      setScore(ns); setStreak(s=>s+1)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_puzzlebox_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      playTone(680,0.11,'triangle',0.14); setTimeout(()=>playTone(900,0.13,'triangle',0.12),90)
      if(puz.type==='rotate') setRotation(r=>r+90)
      const t=window.setTimeout(()=>{ setLevel(l=>l+1); setPicked(null); setResult(null); setShowHint(false) }, 750)
      timersRef.current.push(t)
    } else {
      setStreak(0)
      playTone(160,0.15,'sawtooth',0.08)
      const t=window.setTimeout(()=>{ setPicked(null); setResult(null)}, 620)
      timersRef.current.push(t)
    }
  },[puz,streak,tier,result,onScore])

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key>='1'&&e.key<='3') choose(Number(e.key)-1); if(e.key==='h') setShowHint(v=>!v) }
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  },[choose])

  useEffect(()=>()=>{ timersRef.current.forEach(id=>clearTimeout(id)) },[])

  const typeColor:Record<PuzzleType,string>={math:'#00ffff', seq:'#ffdd00', color:'#ff00ff', rotate:'#00ff88'}
  const typeLabel:Record<PuzzleType,string>={math:'MATEMÁTICA', seq:'SECUENCIA', color:'COLOR', rotate:'ROTACIÓN'}

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
      <div className="glass rounded-xl p-5 w-full text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{background:`repeating-linear-gradient(45deg, ${typeColor[puz.type]} 0 1px, transparent 1px 12px)`}}/>
        <div className="relative">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-mono tracking-widest" style={{color:typeColor[puz.type]}}>PUZZLE {level+1} • NIVEL {tier} • {typeLabel[puz.type]}</p>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full glass text-white/60">{puz.type}</span>
          </div>
          <div className="mt-3 min-h-[56px] flex items-center justify-center">
            <p className="font-black text-white text-lg leading-snug" style={{fontFamily:'Orbitron', transform: puz.type==='rotate'? `rotate(${rotation}deg)`: undefined, transition:'transform 0.5s ease'}}>
              {puz.q}
            </p>
          </div>
          {puz.type==='rotate' && <p className="text-[10px] font-mono text-white/40">Rotación acumulada {rotation}°</p>}
          <div className="mt-4 grid gap-2">
            {puz.opts.map((o,i)=>(
              <button key={i} onClick={()=>choose(i)} className={`p-3 rounded-xl border text-left font-mono text-sm transition flex justify-between items-center ${picked===i? (result==='ok'?'bg-emerald-400 text-black border-emerald-400': result==='bad'?'bg-red-500 text-white border-red-500':'glass'): 'glass border-white/10 hover:bg-white/10 text-white'}`}>
                <span><span className="font-black mr-2">{i+1}.</span>{o}</span>
                <span className="text-cyan-300">{picked===i && result? (result==='ok'?'✓':'✕'):'→'}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2 justify-center">
            <button onClick={()=>setShowHint(v=>!v)} className="px-3 py-1 rounded-full glass text-xs font-mono text-white/60 border border-white/10">💡 {showHint?'OCULTAR':'PISTA'}</button>
            <button onClick={()=>{ setLevel(l=>l+1); setPicked(null); setResult(null); setShowHint(false)}} className="px-3 py-1 rounded-full glass text-xs font-mono text-white/60">SALTAR →</button>
          </div>
          {showHint && <p className="mt-3 text-xs font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2">💡 {puz.hint}</p>}
          {result && <p className={`mt-3 font-black text-sm ${result==='ok'?'text-emerald-300':'text-red-300'}`} style={{fontFamily:'Orbitron'}}>{result==='ok'?`¡CORRECTO! +${20+tier*4+streak*6}`:'Incorrecto -5'}</p>}
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({length:5}).map((_,i)=>(
              <span key={i} className={`w-2 h-2 rounded-full transition ${i < (level%5) ? 'bg-cyan-400 shadow-[0_0_6px_#00ffff]' : i===level%5 && result==='ok' ? 'bg-emerald-400 animate-ping':'bg-white/10'}`}/>
            ))}
          </div>
          <p className="text-[11px] font-mono text-white/40 mt-2">Progreso nivel {tier} • Racha x{streak}</p>
        </div>
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <button onClick={()=>{ setScore(0); setLevel(0); setPicked(null); setResult(null); setStreak(0); setRotation(0)}} className="px-3 py-2 rounded-lg glass text-xs font-mono text-white/60">REINICIAR</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">4 tipos: matemática • secuencia • color • rotación • Niveles cada 5 • Racha bonus</p>
    </div>
  )
}
