import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

type Level=1|2|3

function randTarget(level:Level){
  if(level===1) return {r: 100+Math.floor(Math.random()*120), g: 100+Math.floor(Math.random()*120), b:100+Math.floor(Math.random()*120)}
  if(level===2) return {r: Math.floor(Math.random()*256), g: Math.floor(Math.random()*256), b: Math.floor(Math.random()*256)}
  return {r: Math.floor(Math.random()*256), g: Math.floor(Math.random()*256), b: Math.floor(Math.random()*256)}
}

function deltaE(lab1:{r:number,g:number,b:number}, lab2:{r:number,g:number,b:number}):number{
  // simple weighted Euclidean (CIE76 approx simplified) with luminance weighting
  // Convert to ~Lab approx via gamma + XYZ weights not full, but better than naive RGB
  const wR=0.30, wG=0.59, wB=0.11
  const dr=lab1.r-lab2.r, dg=lab1.g-lab2.g, db=lab1.b-lab2.b
  return Math.sqrt( (2+ wR)*dr*dr + (4+ wG)*dg*dg + (3+ wB)*db*db ) / Math.sqrt(7)
}

export default function ColorGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [level,setLevel]=useState<Level>(1)
  const [target,setTarget]=useState(()=> randTarget(1))
  const [guess,setGuess]=useState({r:128,g:128,b:128})
  const [score,setScore]=useState(0)
  const [secs,setSecs]=useState(22)
  const [round,setRound]=useState(1)
  const [tries,setTries]=useState(0)
  const [bestAttempts,setBestAttempts]=useState<number|null>(null)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_color_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const [flash,setFlash]=useState<'good'|'bad'|null>(null)

  const dist=Math.sqrt((target.r-guess.r)**2 + (target.g-guess.g)**2 + (target.b-guess.b)**2)
  const pct=Math.max(0, 100 - dist/4.42)
  const dE=deltaE(target,guess)
  const dEPct=Math.max(0, 100 - dE*0.62)
  // combined score weighted
  const combined=Math.round(pct*0.6 + dEPct*0.4)

  const tolerance= level===1? 12 : level===2? 9 : 7

  useEffect(()=>{
    const id=window.setInterval(()=>{
      if(isStartedRef.current===false) return
      setSecs(s=>{
        if(s<=1){
          // time out -> next round penalty
          setTries(t=>t+1)
          playTone(140,0.18,'sawtooth',0.08)
          setTarget(randTarget(level))
          setGuess({r:128,g:128,b:128})
          return 22
        }
        return s-1
      })
    },1000)
    return()=>clearInterval(id)
  },[level])

  const submit=useCallback(()=>{
    if(isStartedRef.current===false) return
    const ok= dist <= tolerance*4.42 // approx to pct > 100 - tolerance
    const isPerfect= combined >= 92
    const pts= isPerfect? Math.floor(combined + Math.max(0, secs)*1.2) : Math.floor(combined*0.45)
    if(isPerfect || pct>= (100 - tolerance)){
      const timeBonus=Math.floor(secs*1.1)
      const finalPts= pts + timeBonus + (level-1)*8
      const ns=scoreRef.current+finalPts
      setScore(ns)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_color_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      setFlash('good')
      setTimeout(()=>setFlash(null),400)
      playTone(880,0.14,'triangle',0.15); setTimeout(()=>playTone(1100,0.16,'triangle',0.13),120)
      // level progression every 3 rounds
      const nr=round+1
      setRound(nr)
      if(nr%3===0 && level<3) setLevel(l=> (l+1) as Level)
      setTarget(randTarget(level===3?3: nr%3===0? (level+1 as Level): level))
      setGuess({r:128,g:128,b:128})
      setSecs(22); setTries(0)
      if(bestAttempts===null || tries+1 < bestAttempts) setBestAttempts(tries+1)
    } else {
      setTries(t=>t+1)
      setFlash('bad')
      setTimeout(()=>setFlash(null),320)
      playTone(180,0.12,'sawtooth',0.07)
      if(tries>=5){
        // auto reveal new target after 6 tries
        setTimeout(()=>{ setTarget(randTarget(level)); setTries(0); setGuess({r:128,g:128,b:128}); setSecs(22) }, 700)
      }
    }
  },[guess,target,dist,pct,combined,secs,level,round,tries,bestAttempts,onScore])

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key==='Enter') submit() }
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[submit])

  const changeLevel=(l:Level)=>{ setLevel(l); setTarget(randTarget(l)); setGuess({r:128,g:128,b:128}); setRound(1); setSecs(22); setTries(0) }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[440px]">
      <div className="flex gap-1 w-full">
        {[1,2,3].map(l=>(
          <button key={l} onClick={()=>changeLevel(l as Level)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-black border ${level===l?'bg-cyan-400 text-black border-cyan-400':'glass text-white/60 border-white/10'}`}>{l===1?'FÁCIL':l===2?'MEDIO':'DIFÍCIL'} {level===l?'•':''}</button>
        ))}
      </div>
      <div className={`glass rounded-xl p-4 w-full relative overflow-hidden ${flash==='good'?'ring-2 ring-emerald-400': flash==='bad'?'ring-2 ring-red-400':''}`}>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-mono tracking-widest text-white/50">RONDA {round} • TOL ±{tolerance}%</span>
          <span className={`text-xs font-mono font-black px-2 py-1 rounded-full ${secs<=7?'bg-red-500 text-white animate-pulse':'bg-white/10 text-white/70'}`}>⏱ {secs}s</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <p className="text-[11px] font-mono tracking-widest text-white/50">OBJETIVO</p>
            <div className="mt-2 h-28 rounded-xl border border-white/10 shadow-[0_0_18px_rgba(0,0,0,0.3)] relative overflow-hidden" style={{background:`rgb(${target.r},${target.g},${target.b})`}}>
              <span className="absolute bottom-1 right-2 text-[9px] font-mono text-white/60 bg-black/30 px-1 rounded">RGB({target.r},{target.g},{target.b}) secreto</span>
            </div>
            <p className="text-[10px] font-mono text-white/40 mt-1">Secreto • Nivel {level}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono tracking-widest text-white/50">TU COLOR {combined}%</p>
            <div className="mt-2 h-28 rounded-xl border border-white/10 shadow-[0_0_18px_rgba(0,0,0,0.3)] relative overflow-hidden" style={{background:`rgb(${guess.r},${guess.g},${guess.b})`}}>
              <div className="absolute inset-0 opacity-20" style={{background: `linear-gradient(90deg, #ff0000, #00ff00, #0000ff)`, mixBlendMode:'overlay'}}/>
            </div>
            <p className="text-[10px] font-mono mt-1 flex gap-2"><span className="text-emerald-300">match {combined}%</span><span className="text-white/40">ΔE {dE.toFixed(1)}</span></p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {(['r','g','b'] as const).map(ch=>(
            <div key={ch} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{background: ch==='r'?'#ff3355': ch==='g'?'#00ff88':'#00aaff', boxShadow:`0 0 8px ${ch==='r'?'#ff3355':ch==='g'?'#00ff88':'#00aaff'}88`}}>{ch.toUpperCase()}</span>
              <input type="range" min={0} max={255} value={guess[ch]} onChange={e=> setGuess({...guess, [ch]:Number(e.target.value)})} className="flex-1 h-2 rounded-full appearance-none" style={{background:`linear-gradient(90deg, ${ch==='r'?'#000, #ff3355': ch==='g'?'#000, #00ff88':'#000, #00aaff'})`, accentColor: ch==='r'?'#ff3355':ch==='g'?'#00ff88':'#00aaff'}}/>
              <span className="w-12 text-right font-mono text-sm text-white bg-white/5 rounded px-1 py-0.5">{guess[ch]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full transition-all duration-300" style={{width:`${combined}%`, background: combined>=92?'linear-gradient(90deg,#00ff88,#00ffff)': combined>=70?'linear-gradient(90deg,#ffdd00,#ff8800)':'linear-gradient(90deg,#ff3355,#ff00ff)'}}/></div>
          <div className="flex justify-between text-[10px] font-mono text-white/40 mt-1"><span>0%</span><span>92% para ganar</span><span>100%</span></div>
        </div>
        <button onClick={submit} className="mt-4 w-full py-2.5 rounded-xl font-black tracking-widest text-black hover:scale-[1.02] transition" style={{background: combined>=92?'linear-gradient(90deg,#00ff88,#00ffff)':'linear-gradient(90deg,#ff00ff,#00ffff)', fontFamily:'Orbitron', opacity: isStarted===false?0.6:1}}>{combined>=92?'¡PERFECTO! SIGUIENTE [ENTER]': tries>=5?'REVELAR NUEVO':'PROBAR [ENTER]'}</button>
        <p className="text-[11px] font-mono text-white/40 text-center mt-2">Intento {tries+1}/6 • Precisión combinada RGB+ΔE • {combined>=92?'listo':`faltan ${Math.max(0,92-combined)}%`}</p>
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-fuchsia-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/50">Mejor {bestAttempts??'-'} intentos</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Sliders RGB • Tolerancia por nivel • ΔE ponderado • Timer 22s • Score preciso</p>
    </div>
  )
}
