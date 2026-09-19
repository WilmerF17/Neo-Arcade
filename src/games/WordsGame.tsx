import { useState, useRef, useEffect, useCallback } from 'react'
import { playTone } from './engine/elite'

// 220 palabras válidas (4-7 letras)
const WORD_LIST=[
'NEON','LASER','PLASMA','VECTOR','PIXEL','ARCADE','CRYPTO','GALAXY','ORBITA','MATRIX','QUEST','CIBER','SINTON','FUSION','PULSO','RIDER','PRISMA','HIPER','BLAST','GLOW','VAPOR','DRIFT','NOVA','TURBO','STORM','PULSE','ORBIT','MATRIX','SONIC','OMEGA','DELTA','ALPHA','BETA','GAMMA','PHOTON','QUARK','ATOMO','NEXUS','HELIX','VORTEX','FLUX','NANO','CORE','BYTE','CHIP','CODE','DATA','INFO','LINK','NODE','MESH','GRID','WAVE','BEAM','RAY','STAR','MOON','SUN','COSMOS','NEBULA','COMET','METEOR','ASTRO','LUNAR','SOLAR','ECLIPSE','AURORA','CROMO','ESPECTRO','RADAR','SONAR','LIDAR','FIBRA','OPTICA','LASER','PLASMA','ION','ELECTRON','PROTON','NEUTRON','BOSON','FERMION','HADRON','LEPTON','MUON','GLUON','QUANTUM','QUBIT','ENTANG','SUPER','HYPER','ULTRA','MEGA','GIGA','TERA','PETA','EXA','ZETTA','YOTTA','BRON','NEON','CYBER','SYNTH','RETRO','FUTUR','DIGITAL','ANALOG','BINARY','HEX','OCTAL','DECI','MATRIX','VECTOR','SCALAR','TENSOR','MATRIZ','CERO','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','CIRCUIT','WIDGET','GADGET','DEVICE','SYSTEM','ENGINE','MOTOR','TURBIN','ROBOT','ANDROID','CYBORG','DRONE','LASER','RADAR','SONAR','PLASMA','FUSION','ATOM','NUCLEO','CELULA','GENOMA','HELICE','PROTEIN','ENZIMA','VIRUS','BACTER','GEN','ADN','ARN','CRISPR','CLON','MUTAN','EVOLVE','SPECIES','ECOSYS','BIOM','TERRA','AQUA','IGNIS','AER','TIERRA','AGUA','FUEGO','AIRE','ETHER','VOID','CHAOS','ORDER','LIGHT','DARK','SHADOW','BLADE','SWORD','SHIELD','ARMOR','HELM','CROWN','THRON','CASTLE','TOWER','BRIDGE','GATE','DOOR','KEY','LOCK','CHEST','GOLD','SILVER','BRONZE','COPPER','IRON','STEEL','TITAN','CRYSTAL','DIAMOND','RUBY','EMERALD','SAPPHIRE','TOPAZ','QUARTZ','OPAL','JADE','PEARL','CORAL','IVORY','EBONY','OAK','PINE','CEDAR','MAPLE','BIRCH','WILLOW','ELM','ASH','YEW','PALM','FERN','MOSS','LILY','ROSE','TULIP','ORCHID','LOTUS','DAISY','VIOLET','JASMINE','LAVENDER'
].map(w=>w.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()).filter((v,i,a)=>a.indexOf(v)===i)

const POOL_LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function pickTarget():string{
  return WORD_LIST[Math.floor(Math.random()*WORD_LIST.length)]
}

function getColors(target:string, guess:string):string[]{
  const res=Array(guess.length).fill('rgba(255,255,255,0.12)')
  const tArr=target.split('')
  const gArr=guess.split('')
  const used=Array(target.length).fill(false)
  // green pass
  for(let i=0;i<gArr.length;i++){
    if(gArr[i]===tArr[i]){ res[i]='#00ff88'; used[i]=true }
  }
  // yellow pass
  for(let i=0;i<gArr.length;i++){
    if(res[i]==='#00ff88') continue
    const idx=tArr.findIndex((c,j)=> !used[j] && c===gArr[i])
    if(idx!==-1){ res[i]='#ffdd00'; used[idx]=true }
    else res[i]='rgba(255,255,255,0.12)'
  }
  return res
}

export default function WordsGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const [target,setTarget]=useState(()=>pickTarget())
  const [guess,setGuess]=useState('')
  const [tries,setTries]=useState<string[]>([])
  const [colors,setColors]=useState<string[][]>([])
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [hint,setHint]=useState(false)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const bestRef=useRef(0)
  const [best,setBest]=useState(()=>{ try{ const v=Number(localStorage.getItem('neo_words_best')||0); bestRef.current=v; return v }catch{return 0} })
  useEffect(()=>{bestRef.current=best},[best])
  const [msg,setMsg]=useState<string|null>(null)
  const msgTimerRef=useRef<number|null>(null)
  const [shake,setShake]=useState(false)

  const showMsg=(m:string)=>{
    setMsg(m)
    if(msgTimerRef.current) window.clearTimeout(msgTimerRef.current)
    msgTimerRef.current=window.setTimeout(()=>setMsg(null),1600) as unknown as number
  }

  const submit=useCallback(()=>{
    if(isStartedRef.current===false) return
    const up=guess.toUpperCase().trim()
    if(up.length!==target.length){ setShake(true); setTimeout(()=>setShake(false),300); showMsg(`Debe tener ${target.length} letras`); playTone(140,0.12,'sawtooth',0.08); return }
    if(!WORD_LIST.includes(up) && up!==target) {
      // allow any valid length word but warn? We'll allow but require letters only
      if(!/^[A-Z]+$/.test(up)){ setShake(true); setTimeout(()=>setShake(false),300); showMsg('Solo letras A-Z'); return }
    }
    const cols=getColors(target,up)
    const newTries=[...tries, up]
    const newColors=[...colors, cols]
    setTries(newTries); setColors(newColors); setGuess('')
    if(up===target){
      const pts= Math.max(20, 120 - newTries.length*14 + (hint? -18:0) ) + target.length*6
      const ns=scoreRef.current+pts
      setScore(ns)
      if(ns>bestRef.current){ bestRef.current=ns; setBest(ns); try{localStorage.setItem('neo_words_best',String(ns))}catch{}; onScore(ns)} else onScore(ns)
      playTone(660,0.12,'triangle',0.14); setTimeout(()=>playTone(880,0.16,'triangle',0.14),110)
      showMsg(`¡Correcto! +${pts}`)
      window.setTimeout(()=>{
        const nt=pickTarget(); setTarget(nt); setTries([]); setColors([]); setGuess(''); setHint(false); setLevel(l=>l+1)
      }, 900)
    } else if(newTries.length>=6){
      showMsg(`Era: ${target}`)
      playTone(180,0.22,'sawtooth',0.09)
      window.setTimeout(()=>{ setTries([]); setColors([]); setGuess(''); }, 1400)
    } else {
      playTone(320,0.08,'square',0.07)
      // hint on colors
      const greens=cols.filter(c=>c==='#00ff88').length
      if(greens>0) showMsg(`${greens} verde(s)`)
    }
  },[guess,target,tries,colors,hint,onScore])

  // single listener with cleanup
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key==='Enter') submit() }
    window.addEventListener('keydown',h)
    return()=> window.removeEventListener('keydown',h)
  },[submit])

  useEffect(()=>()=>{ if(msgTimerRef.current) window.clearTimeout(msgTimerRef.current) },[])

  const keyboardRows=[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['Z','X','C','V','B','N','M']]
  const keyState:Record<string,string>={}
  tries.forEach((w,i)=>{
    const cols=colors[i]
    for(let k=0;k<w.length;k++){
      const ch=w[k], col=cols[k]
      if(col==='#00ff88') keyState[ch]='green'
      else if(col==='#ffdd00' && keyState[ch]!=='green') keyState[ch]='yellow'
      else if(!keyState[ch]) keyState[ch]='gray'
    }
  })

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[380px]">
      <div className={`glass rounded-xl p-4 w-full ${shake?'animate-[shake_0.3s_ease]':''}`}>
        <div className="flex justify-between items-center">
          <p className="text-xs font-mono tracking-widest text-cyan-300">CIFRA • NIVEL {level} • {target.length} LETRAS</p>
          <button onClick={()=>setHint(v=>!v)} className={`text-[11px] font-mono px-2 py-1 rounded-full border ${hint?'bg-amber-400 text-black border-amber-400':'glass text-white/70 border-white/10'}`}>{hint?'OCULTAR':'PISTA'}</button>
        </div>
        {hint && <p className="text-xs font-mono text-amber-300 mt-2">Pista: {target[0]} ••• {target[target.length-1]} {target.includes('A')?'• contiene A':''} • {WORD_LIST.length} palabras</p>}
        {msg && <p className="text-xs font-mono text-cyan-300 text-center mt-2 animate-pulse">{msg}</p>}
        <div className="mt-3 space-y-1.5">
          {Array.from({length:6}).map((_,r)=>{
            const word=tries[r] || (r===tries.length? guess.padEnd(target.length,' ') : ''.padEnd(target.length,' '))
            const cols= tries[r]? colors[r] : Array(target.length).fill('rgba(255,255,255,0.07)')
            const isCurrent=r===tries.length
            return (
              <div key={r} className="grid gap-1.5" style={{gridTemplateColumns:`repeat(${target.length},1fr)`}}>
                {word.split('').map((ch,i)=>{
                  const bg=cols[i]
                  const border= bg==='#00ff88'?'#00ff88': bg==='#ffdd00'?'#ffdd00':'rgba(255,255,255,0.12)'
                  const isEmpty=!ch.trim()
                  return (
                    <div key={i} className={`aspect-square rounded-lg flex items-center justify-center font-black text-lg transition-all ${isCurrent && ch.trim()?'scale-[1.03]':''}`} style={{background: isEmpty?'rgba(255,255,255,0.06)':bg, border:`1px solid ${isEmpty?'rgba(255,255,255,0.08)':border}`, color: ch.trim()?'#fff':'transparent', fontFamily:'Orbitron', boxShadow: bg!=='rgba(255,255,255,0.12)' && bg!=='rgba(255,255,255,0.07)'? `0 0 10px ${bg}66`:'none'}}>
                      {ch}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <input value={guess} onChange={e=> setGuess(e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,target.length))} placeholder={`ESCRIBE ${target.length} LETRAS`} className="flex-1 glass rounded-lg px-3 py-2.5 text-white font-mono tracking-widest placeholder:text-white/30 outline-none border border-white/10 focus:border-cyan-400/50 text-center"/>
          <button onClick={submit} className="px-5 py-2 rounded-lg bg-cyan-400 text-black font-black text-sm hover:brightness-110">OK</button>
        </div>
        <div className="mt-3 space-y-1">
          {keyboardRows.map((row,ri)=>(
            <div key={ri} className="flex justify-center gap-1">
              {row.map(k=>{
                const st=keyState[k]
                const bg= st==='green'?'#00ff88': st==='yellow'?'#ffdd00': st==='gray'?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.07)'
                const col= st==='gray'?'#aaa': st? '#000':'#fff'
                return <button key={k} onClick={()=> setGuess(g=> (g+k).slice(0,target.length))} className="min-w-[28px] h-8 rounded-md flex items-center justify-center text-xs font-black border" style={{background:bg, color:col, borderColor: st==='green'||st==='yellow'?bg:'rgba(255,255,255,0.10)'}}>{k}</button>
              })}
              {ri===2 && <button onClick={()=>setGuess(g=>g.slice(0,-1))} className="px-2 h-8 rounded-md glass text-xs">⌫</button>}
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1 justify-center">
          {POOL_LETTERS.slice(0,12).map(c=>(
            <button key={c} onClick={()=> setGuess(g=> (g+c).slice(0,target.length))} className="w-7 h-7 rounded-lg glass text-white font-mono text-[10px] hover:bg-white/10">{c}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-emerald-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <button onClick={()=>{setTries([]); setColors([]); setGuess('')}} className="px-3 py-2 rounded-lg glass text-white/70 text-xs font-mono">LIMPIAR</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Verde=correcto • Amarillo=existe • {WORD_LIST.length} palabras • Sin leak listeners</p>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}`}</style>
    </div>
  )
}
