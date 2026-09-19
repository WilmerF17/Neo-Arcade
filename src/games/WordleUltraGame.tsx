import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

const WORDS_5=[
'NEONG','LASER','PIXEL','PLASMA','VECTOR','MATRIX','FUSION','STORM','RIDER','PULSE','TURBO','PRISM','HYPER','BLAST','GLOW','VAPOR','DRIFT','NOVA','QUARK','PHOTON','ORBIT','COMET','NEBULA','GALAX','CYBER','SYNTH','RETRO','FUTUR','DIGIT','CIRCU','GADGET','DEVICE','SYSTEM','ENGINE','ROBOT','DRONE','ALPHA','DELTA','GAMMA','OMEGA','ARGON','XENON','HELIX','VORTEX','NEXUS','FLUX','NANO','CORE','BYTE','CHIP','CODE','DATA','NODE','MESH','GRID','WAVE','BEAM','STAR','MOON','SOLAR','LUNAR','ECLIP','AUROR','CROMO','RADAR','SONAR','LIDAR','FIBER','OPTIC','IONIC','BOSON','FERMI','HADRO','LEPTON','MUON','GLUON','QUBIT','MEGA','GIGA','TERA','PETA','BRONZ','SILVE','GOLD','STEEL','TITAN','CRYST','DIAMO','RUBY','EMERA','SAPPH','TOPAZ','QUART','OPAL','JADE','PEARL','CORAL','EBONY','MAPLE','CEDAR','BIRCH','WILLO','OAK','PINE','FERN','MOSS','LILY','ROSE','TULIP','ORCHI','LOTUS','DAISY','VIOLE','JASMI','LASER','PLASM','ARGON','NEON','XENON','HELIO','NITRO','OXIGE','CARBO','SILIC','BORON','LITHI','SODIU','MAGNE','ALUMI','CHROM','MANGA','COBAL','NICKEL','COPPE','ZINC','GALLI','GERMA','ARSEN','SELEN','BROMO','KRYPT','RUBID','STRON','YTTRI','ZIRCO','NIOBI','MOLYB','TECHN','RUTHE','RHODI','PALLA','SILVE','CADMI','INDIU','STANN','ANTIM','TELLU','IODIN','XENON','CESIU','BARIU','LANTH','CERIU','PRASE','NEODY','PROME','SAMAR','EUROP','GADOL','TERBI','DYSPR','HOLMI','ERBIU','THULI','YTTER','LUTET','HAFNI','TANTA','WOLFR','RHENI','OSMIU','IRIDI','PLATI','AURUM','HYDRG','HELIU','BERYL','BORON','CARBO','NITRO','OXYGE','FLUOR',
'CRYPTO','GALAXY','ORBITA','CIBER','SINTET','FUTURO','DIGITAL','BINARY','MATRIX','VECTOR','TENSOR','CIRCUIT','WIDGET','SYSTEM','ROBOT','ANDROID','CYBORG','QUANTUM','PHOTON','FUSION','STORM','HYPER','ULTRA','MEGA','GIGA','PRISMA','PLASMA','LASER','NEBULOSA','COMETA','AURORA','ECLIPSE','COSMOS','NEUTRON','PROTON','ELECTR','HADRON','BOSON','FERMION','LEPTON','MUON','GLUON','QUBIT','NEXUS','HELIX','VORTEX','CRYSTAL','DIAMOND','EMERALD','SAPPHIRE','TOPAZ','QUARTZ','GADGET','DEVICE','ENGINE','MOTOR','TURBINE','BRIDGE','TOWER','CASTLE','SHADOW','BLADE','SWORD','SHIELD','ARMOR','CROWN','THRONE','GOLD','SILVER','BRONZE','COPPER','STEEL','TITAN','ROBOT','DRONE','LASER','RADAR','SONAR','PLASMA','ATOM','NUCLEO','CELULA','GENOMA','HELICE','PROTEIN','VIRUS','GEN','ADN','MUTAN','EVOLVE','TERRA','AQUA','FUEGO','AIRE','ETHER','VOID','CHAOS','ORDER','LIGHT','DARK'
].map(w=>w.slice(0,5).toUpperCase()).filter((v,i,a)=>a.indexOf(v)===i && v.length===5)

function pick():string{ return WORDS_5[Math.floor(Math.random()*WORDS_5.length)] }

function evalGuess(target:string, guess:string):('green'|'yellow'|'gray')[]{
  const res:Array<'green'|'yellow'|'gray'> = Array(5).fill('gray')
  const t=target.split(''), g=guess.split('')
  const used=Array(5).fill(false)
  for(let i=0;i<5;i++) if(g[i]===t[i]){ res[i]='green'; used[i]=true }
  for(let i=0;i<5;i++){
    if(res[i]==='green') continue
    const idx=t.findIndex((c,j)=> !used[j] && c===g[i])
    if(idx!==-1){ res[i]='yellow'; used[idx]=true }
  }
  return res
}

export default function WordleUltraGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [target,setTarget]=useState(()=>pick())
  const [guess,setGuess]=useState('')
  const [history,setHistory]=useState<string[]>([])
  const [evals,setEvals]=useState<('green'|'yellow'|'gray')[][]>([])
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [won,setWon]=useState(false)
  const [shake,setShake]=useState(false)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_wordleultra_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const timersRef=useRef<number[]>([])

  const submit=useCallback(()=>{
    if(isStartedRef.current===false) return
    if(guess.length!==5){ setShake(true); setTimeout(()=>setShake(false),300); playTone(140,0.12,'sawtooth',0.08); return }
    const g=guess.toUpperCase()
    if(!/^[A-Z]{5}$/.test(g)) return
    // dictionary check: allow any 5 letters but prefer list; if not in list show warning but accept
    // const isValid = WORDS_5.includes(g)
    // if(!isValid){ setShake(true); setTimeout(()=>setShake(false),300); playTone(180,0.14,'sawtooth',0.08); return }
    const ev=evalGuess(target,g)
    const newHist=[...history,g]
    const newEvals=[...evals,ev]
    setHistory(newHist); setEvals(newEvals); setGuess('')
    if(g===target){
      const tries=newHist.length
      const pts= Math.max(20, 80 - (tries-1)*12) + 10
      const ns=scoreRef.current+pts
      setScore(ns); setWon(true)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_wordleultra_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      playTone(720,0.12,'triangle',0.14); setTimeout(()=>playTone(880,0.14,'triangle',0.13),100); setTimeout(()=>playTone(1080,0.18,'sine',0.14),220)
      const t=window.setTimeout(()=>{ setTarget(pick()); setHistory([]); setEvals([]); setWon(false); setLevel(l=>l+1) }, 1300)
      timersRef.current.push(t)
    } else if(newHist.length>=6){
      playTone(160,0.22,'sawtooth',0.09)
      const t=window.setTimeout(()=>{ setHistory([]); setEvals([]); setGuess('') }, 1400)
      timersRef.current.push(t)
    } else {
      playTone(360,0.07,'square',0.07)
    }
  },[guess,target,history,evals,onScore])

  // single listener with cleanup, no deps leak
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==='Enter') submit()
      else if(e.key==='Backspace') setGuess(g=>g.slice(0,-1))
      else if(/^[a-zA-Z]$/.test(e.key)) setGuess(g=> (g+e.key.toUpperCase()).slice(0,5))
    }
    window.addEventListener('keydown',h)
    return()=> window.removeEventListener('keydown',h)
  },[submit])

  useEffect(()=>()=>{ timersRef.current.forEach(id=>clearTimeout(id)) },[])

  const keyState:Record<string,'green'|'yellow'|'gray'|undefined>={}
  history.forEach((w,i)=>{
    const ev=evals[i]
    for(let k=0;k<5;k++){
      const ch=w[k]
      if(ev[k]==='green') keyState[ch]='green'
      else if(ev[k]==='yellow' && keyState[ch]!=='green') keyState[ch]='yellow'
      else if(!keyState[ch]) keyState[ch]='gray'
    }
  })
  const rows=[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['Z','X','C','V','B','N','M']]

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <div className={`glass rounded-xl p-4 w-full ${shake?'animate-[shake_0.3s_ease]':''}`}>
        <div className="flex justify-between items-center">
          <p className="text-[11px] font-mono tracking-widest text-cyan-300">WORDLE ULTRA • NIVEL {level}</p>
          <span className="text-[10px] font-mono px-2 py-1 rounded-full glass text-white/60">{history.length}/6</span>
        </div>
        <p className="text-[10px] font-mono text-white/40 text-center mt-1">{WORDS_5.length} palabras • verde correcto • amarillo existe • gris no existe</p>
        <div className="mt-3 space-y-1.5">
          {Array.from({length:6}).map((_,r)=>{
            const word=history[r] || (r===history.length? guess.padEnd(5,' ') : ''.padEnd(5,' '))
            const ev= evals[r]
            return (
              <div key={r} className="grid grid-cols-5 gap-1.5">
                {word.split('').map((ch,i)=>{
                  let bg='rgba(255,255,255,0.06)', border='rgba(255,255,255,0.08)', col='#fff'
                  if(evals[r]){
                    const e=ev[i]
                    if(e==='green'){ bg='#00ff88'; border='#00ff88'; col='#000' }
                    else if(e==='yellow'){ bg='#ffdd00'; border='#ffdd00'; col='#000' }
                    else { bg='rgba(255,255,255,0.14)'; border='rgba(255,255,255,0.14)'; col='#fff' }
                  } else if(r===history.length && ch.trim()){
                    bg='rgba(0,255,255,0.14)'; border='#00ffff'
                  }
                  return <div key={i} className={`aspect-square rounded-lg flex items-center justify-center font-black text-lg transition-all ${r===history.length && ch.trim()?'scale-[1.04]':''}`} style={{background:bg, border:`1px solid ${border}`, color: ch.trim()?col:'transparent', fontFamily:'Orbitron', boxShadow: ev && ev[i]!=='gray'? `0 0 10px ${bg}66`: undefined, animation: won && r===history.length-1? 'pop 0.3s ease': undefined}}>{ch}</div>
                })}
              </div>
            )
          })}
        </div>
        {won && <p className="text-center font-black text-emerald-300 mt-3" style={{fontFamily:'Orbitron'}}>¡EXCELENTE! +{Math.max(20,80-(history.length-1)*12)+10}</p>}
        {!won && history.length>=6 && <p className="text-center font-mono text-xs text-red-300 mt-2">Era: {target}</p>}
        <div className="mt-4 flex gap-2">
          <input value={guess} onChange={e=>setGuess(e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,5))} placeholder="ESCRIBE" className="flex-1 glass rounded-lg px-3 py-2.5 text-white font-mono tracking-widest text-center outline-none border border-white/10 focus:border-cyan-400/50"/>
          <button onClick={submit} className="px-5 py-2 rounded-lg bg-cyan-400 text-black font-black text-sm hover:brightness-110">OK</button>
        </div>
        <div className="mt-3 space-y-1">
          {rows.map((row,ri)=>(
            <div key={ri} className="flex justify-center gap-1">
              {row.map(k=>{
                const st=keyState[k]
                const bg= st==='green'?'#00ff88': st==='yellow'?'#ffdd00': st==='gray'?'rgba(255,255,255,0.16)':'rgba(255,255,255,0.06)'
                const col= st==='yellow'||st==='green'?'#000':'#fff'
                return <button key={k} onClick={()=>setGuess(g=> (g+k).slice(0,5))} className="min-w-[28px] h-8 rounded-md flex items-center justify-center text-xs font-black border" style={{background:bg, color:col, borderColor: st==='green'||st==='yellow'?bg:'rgba(255,255,255,0.10)'}}>{k}</button>
              })}
              {ri===2 && <button onClick={()=>setGuess(g=>g.slice(0,-1))} className="px-2 h-8 rounded-md glass text-xs border border-white/10">⌫</button>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <button onClick={()=>{ setHistory([]); setEvals([]); setGuess(''); setTarget(pick()) }} className="px-3 py-2 rounded-lg glass text-xs font-mono text-white/60">NUEVO</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono">Enter para enviar • Teclado visual • 6 intentos</p>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}} @keyframes pop{0%{transform:scale(0.9)}50%{transform:scale(1.08)}100%{transform:scale(1)}}`}</style>
    </div>
  )
}
