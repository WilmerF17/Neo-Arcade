import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

const DICT = ("NEON LASER PIXEL VECTOR QUANTUM SYNTH CYBER PLASMA ORBIT MATRIX FUSION STORM RIDER PULSE TURBO NOVA PRISM HYPER BLAST GLOW RGB VAPOR DRIFT ECHO PHOENIX NEBULA COSMOS GALAXY STELLAR AURORA CRYSTAL PHOTON NEUTRON PROTON ELECTRON ION ATOM QUARK HADRON BOSON FERMION GLITCH BINARY ENCRYPT DECRYPT FIREWALL PROTOCOL PACKET SOCKET STREAM BUFFER CACHE MEMORY PROCESS THREAD SIGNAL VOLTAGE CURRENT RESISTANCE CAPACITOR TRANSISTOR DIODE SENSOR ACTUATOR ROBOT DRONE ROVER SATELLITE ROCKET THRUSTER ORBITAL LUNAR SOLAR ECLIPSE COMET ASTEROID METEOR CRATER CANYON VALLEY RIDGE PEAK SUMMIT ABYSS OCEAN TUNDRA DESERT JUNGLE FOREST MEADOW PRAIRIE SAVANNA VOLCANO GLACIER AVALANCHE TORNADO HURRICANE CYCLONE TYPHOON MONSOON TSUNAMI EARTHQUAKE MAGMA LAVA OBSIDIAN GRANITE BASALT QUARTZ EMERALD SAPPHIRE RUBY DIAMOND OPAL AMETHYST TOPAZ GARNET PERIDOT ZIRCON SPINEL TURQUOISE JADE ONYX PEARL CORAL AMBER JET MALACHITE AZURITE BLOODSTONE MOONSTONE SUNSTONE LABRADORITE SPECTROLITE AMAZONITE FLUORITE CALCITE PYRITE HEMATITE MAGNETITE ILMENITE CHROMITE GALENA SPHALERITE CINNABAR REALGAR STIBNITE BORNITE CHALCOPYRITE ARSENOPYRITE MOLYBDENITE TUNGSTEN TITANIUM PLATINUM PALLADIUM RHODIUM IRIDIUM OSMIUM RUTHENIUM COBALT NICKEL CHROME VANADIUM MANGANESE ZINC COPPER SILVER GOLD MERCURY LEAD TIN ANTIMONY BISMUTH ARSENIC SELENIUM TELLURIUM BROMINE IODINE XENON KRYPTON ARGON NEON HELIUM HYDROGEN OXYGEN NITROGEN CARBON SILICON GERMANIUM TIN LEAD FLUORINE CHLORINE BROMINE ASTATINE RADON URANIUM PLUTONIUM THORIUM RADIUM POLONIUM ACTINIUM PROTACTINIUM NEPTUNIUM AMERICIUM CURIUM BERKELIUM CALIFORNIUM EINSTEINIUM FERMIUM MENDELEVIUM NOBELIUM LAWRENCIUM RUTHERFORDIUM DUBNIUM SEABORGIUM BOHRIUM HASSIUM MEITNERIUM DARMSTADTIUM ROENTGENIUM COPERNICIUM NIHONIUM FLEROVIUM MOSCOVIUM LIVERMORIUM TENNESSINE OGANESSON").split(/\s+/)
while(DICT.length<320){ DICT.push(DICT[Math.floor(Math.random()*DICT.length)]+Math.floor(Math.random()*9)) }

export default function TypingGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [wpm,setWpm]=useState(0)
  const [time,setTime]=useState(30)
  const [best,setBest]=useState(()=> loadBest(bestKey('type'),0))
  const [word,setWord]=useState(()=> DICT[Math.floor(Math.random()*DICT.length)])
  const [input,setInput]=useState('')
  const [shake,setShake]=useState(0)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const wordRef=useRef(word); useEffect(()=>{wordRef.current=word},[word])
  const inputRef=useRef(input); useEffect(()=>{inputRef.current=input},[input])
  const scoreRef=useRef(score); useEffect(()=>{scoreRef.current=score},[score])
  const levelRef=useRef(level); useEffect(()=>{levelRef.current=level},[level])
  const comboRef=useRef(combo); useEffect(()=>{comboRef.current=combo},[combo])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,320)
    const inputHandler=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let timeL=30, scoreL=scoreRef.current, comboL=comboRef.current, levelL=levelRef.current
    let charsTyped=0, startAt=Date.now()
    let curWord=wordRef.current
    let curInput=''
    let shakeT=0
    let ended=false
    let lastWpm=0

    const BK=bestKey('type')
    const pickWord=()=> DICT[Math.floor(Math.random()*DICT.length)]
    const syncReact=()=>{
      setScore(scoreL); setCombo(comboL); setLevel(levelL); setTime(timeL); setWord(curWord); setInput(curInput)
      const elapsed=(Date.now()-startAt)/60000
      const w= elapsed>0.02? Math.round((charsTyped/5)/elapsed):0
      if(w!==lastWpm){ lastWpm=w; setWpm(w) }
    }
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape') return
      if(isStartedRef.current===false) return
      if(ended) {
        if(e.key==='Enter'){ timeL=30+levelL*2; scoreL=0; comboL=0; levelL=1; curWord=pickWord(); curInput=''; charsTyped=0; startAt=Date.now(); ended=false; shakeT=0; syncReact(); }
        return
      }
      if(e.key==='Backspace'){ curInput=curInput.slice(0,-1); syncReact(); e.preventDefault(); return }
      if(e.key.length===1){
        const ch=e.key.toUpperCase()
        if(/[A-Z0-9]/.test(ch)){
          // append and validate prefix
          const next=curInput+ch
          charsTyped++
          if(curWord.startsWith(next)){
            curInput=next
            playTone(520+next.length*80,0.08,'sine',0.12)
            for(let i=0;i<2;i++) pool.push({x: W/2 + (next.length- curWord.length/2)*18, y: H/2-10, vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2-1, life:1, c:'#00ffff', size:2})
            if(next===curWord){
              const base=curWord.length*10
              const speedBonus=Math.max(0, timeL-10)
              const comboBonus=comboL*5
              const lvlBonus=levelL*3
              scoreL+= base+speedBonus+comboBonus+lvlBonus
              comboL++
              if(comboL>4) playTone(880,0.14,'square',0.14)
              else playTone(680,0.1,'square',0.11)
              if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL); }catch{}; setBest(scoreL); bestRef.current=scoreL; onScoreRef.current(scoreL) }
              // level up every 5 combos
              if(comboL%5===0){ levelL++; timeL=Math.min(45, timeL+4) }
              else timeL=Math.min(45, timeL+1)
              for(let k=0;k<8;k++) pool.push({x:W/2,y:H/2-10,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c: comboL>5?'#ffdd00':'#00ff88', size:3})
              curWord=pickWord()
              curInput=''
            }
          } else {
            // error shake
            shakeT=10; comboL=0; playTone(160,0.2,'sawtooth',0.13)
            for(let k=0;k<5;k++) pool.push({x:W/2,y:H/2-10,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ff3355',size:2.5})
          }
          syncReact()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    const timer=setInterval(()=>{
      if(isStartedRef.current===false) return
      if(ended) return
      const dec = 1 + (levelL-1)*0.04
      // we count per second via this interval: subtract 1 (plus tiny level factor via faster ticks? keep simple)
      timeL-=1
      if(timeL<=0){ timeL=0; ended=true; if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; setBest(scoreL); onScoreRef.current(scoreL)} }
      syncReact()
    },1000)

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){
        // draw paused overlay
      }
      frame++
      pool.update()
      // bg
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for(let y=0;y<H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      // header
      ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(0,0,W,34)
      ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}  COMBO x${comboL}  WPM ${lastWpm}`,12,20)
      ctx.textAlign='right'; ctx.fillStyle= timeL<=10?'#ff3355':'#ffffff'; ctx.fillText(`${timeL}s`,W-12,20)
      // word with shake
      const shakeOff = shakeT>0? (Math.sin(frame*2.2)* (shakeT*0.7)):0
      if(shakeT>0) shakeT--
      setShake(shakeT)
      ctx.save(); ctx.translate(shakeOff,0)
      const letters=curWord.split('')
      const totalW=letters.length*28
      let startX=W/2 - totalW/2
      letters.forEach((ch,i)=>{
        const typed=curInput[i]
        const ok=typed===ch
        const isTyped=i<curInput.length
        const x=startX+i*28+14, y=H/2-10
        // bg box
        ctx.fillStyle= !isTyped? 'rgba(255,255,255,0.06)' : ok? 'rgba(0,255,136,0.18)':'rgba(255,51,85,0.22)'
        ctx.strokeStyle= !isTyped? 'rgba(255,255,255,0.08)': ok?'#00ff88':'#ff3355'
        ctx.lineWidth=1.2
        const bx=x-12, by=y-18, bw=24, bh=28
        // round rect
        ctx.beginPath(); (ctx as any).roundRect?.(bx,by,bw,bh,6) || ctx.rect(bx,by,bw,bh); ctx.fill(); ctx.stroke()
        ctx.fillStyle= !isTyped? 'rgba(255,255,255,0.55)' : ok?'#00ff88':'#ff7777'
        ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.shadowColor= ok?'#00ff88':'#ff3355'; ctx.shadowBlur=isTyped?10:0
        ctx.fillText(ch,x,y+6); ctx.shadowBlur=0
        // typed ghost
        if(isTyped){
          ctx.fillStyle= ok?'#ffffff':'#ffaaaa'
          ctx.font='700 9px JetBrains Mono'; ctx.fillText(typed,x,y+16)
        }
      })
      ctx.restore()
      // progress underline
      const prog= curWord? curInput.length/curWord.length:0
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(W/2-80,H/2+34,160,4)
      ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=8; ctx.fillRect(W/2-80,H/2+34,160*prog,4); ctx.shadowBlur=0

      pool.draw(ctx)

      if(ended){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=12; ctx.fillText('¡TIEMPO!',W/2,H/2-18); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='12px JetBrains Mono'; ctx.fillText(`Score ${scoreL} • WPM ${lastWpm} • Nivel ${levelL}`,W/2,H/2+8)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('ENTER para reiniciar',W/2,H/2+28)
      } else if(isStartedRef.current===false){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
      // shake state for react overlay
      if(shakeT!==shake) setShake(shakeT)
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); clearInterval(timer); window.removeEventListener('keydown',onKey); inputHandler.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[3/2]" width={480} height={320}/>
      <div className={`flex gap-2 w-full transition-transform ${shake>0?'animate-[shake_0.2s_ease]':''}`} style={{transform: shake?`translateX(${Math.sin(Date.now()*0.05)*shake}px)`:undefined}}>
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono" style={{color: combo>4?'#ffdd00':'#fff'}}>x{combo} • Lv{level} • {wpm} WPM</div>
        <div className={`glass rounded-lg px-3 py-2 flex items-center gap-2 ${time<=10?'border-red-400/40':''}`}><span className="text-xs font-mono text-white/60">TIEMPO</span><span className={`font-black ${time<=10?'text-red-400 animate-pulse':'text-white'}`} style={{fontFamily:'Orbitron'}}>{time}s</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Escribe la palabra neón • Combo y niveles aumentan velocidad • ENTER reinicia</p>
    </div>
  )
}
