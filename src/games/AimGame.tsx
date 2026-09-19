import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

type Target = { x:number,y:number,r:number,life:number, maxLife:number, vx:number, vy:number, kind:0|1|2 }
export default function AimGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [time,setTime]=useState(30)
  const [best,setBest]=useState(()=> loadBest(bestKey('aim'),0))
  const [hits,setHits]=useState(0)
  const [acc,setAcc]=useState(0)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,360)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0
    let scoreL=0, levelL=1, comboL=0, hitsL=0, missL=0, timeL=30
    let targets:Target[]=[]
    let frame=0, playing=true, ended=false
    const BK=bestKey('aim')

    const sizes:[number,number,number]=[13,20,28]
    const spawn=()=>{
      const kind=Math.floor(Math.random()*3) as 0|1|2
      const r=sizes[kind] + (Math.random()-0.5)*2
      const maxLife= Math.max(0.6, 1.35 - levelL*0.07 - kind*0.08)
      const ang=Math.random()*Math.PI*2, sp=(0.25+Math.random()*0.55)+(levelL*0.07)
      targets.push({x: r+Math.random()*(W-r*2), y: r+30+Math.random()*(H-70-r*2), r, life:maxLife, maxLife, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, kind})
    }
    for(let i=0;i<3;i++) spawn()

    const handleHit=(x:number,y:number)=>{
      if(!playing || ended) return
      for(let i=targets.length-1;i>=0;i--){
        const t=targets[i]
        if(Math.hypot(x-t.x,y-t.y)<t.r){
          hitsL++; const base= t.kind===0? 35: t.kind===1?22:14
          const timeBonus=Math.floor(t.life*10)
          const comboBonus=comboL*4
          scoreL+= base+timeBonus+comboBonus; comboL++
          if(comboL>4) levelL=Math.min(12, 1+Math.floor((hitsL)/7))
          playTone(880 + t.kind*120 + Math.min(260,comboL*18),0.12,'square',0.16)
          for(let k=0;k<9;k++) pool.push({x:t.x,y:t.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c: t.kind===0?'#ffdd00': t.kind===1?'#00ffff':'#ff44aa', size:3})
          targets.splice(i,1); spawn()
          if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL) }
          return true
        }
      }
      // miss
      missL++; comboL=0; playTone(150,0.16,'sawtooth',0.12)
      for(let k=0;k<5;k++) pool.push({x,y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ff3355',size:2.2})
      return false
    }
    const onMouseDown=()=>{
      if(!playing && ended){ // reset
        playing=true; ended=false; timeL=30; scoreL=0; hitsL=0; missL=0; comboL=0; levelL=1; targets=[]; for(let i=0;i<3;i++) spawn()
        return
      }
      handleHit(input.mouse.x,input.mouse.y)
    }
    // poll mouse down
    let wasDown=false

    const timer=setInterval(()=>{
      if(isStartedRef.current===false) return
      if(!playing) return
      timeL-=1
      if(timeL<=0){ timeL=0; playing=false; ended=true; if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; setBest(scoreL); onScoreRef.current(scoreL)} }
      setTime(timeL)
    },1000)

    const onKey=(e:KeyboardEvent)=>{ if(e.code==='Space' && ended){ playing=true; ended=false; timeL=30; scoreL=0; hitsL=0; missL=0; comboL=0; levelL=1; targets=[]; for(let i=0;i<3;i++) spawn(); setTime(30)} }

    window.addEventListener('keydown',onKey)

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused){
        frame++
        if(playing){
          if(frame% Math.max(18, 46 - levelL*2)===0 && targets.length<6 && Math.random()>0.45) spawn()
          // move + life
          targets.forEach(t=>{ t.x+=t.vx; t.y+=t.vy; if(t.x-t.r<4||t.x+t.r>W-4) t.vx*=-1; if(t.y-t.r<28||t.y+t.r>H-4) t.vy*=-1; t.life-=0.016 + levelL*0.0012 })
          const before=targets.length
          targets=targets.filter(t=>{
            if(t.life<=0){ missL++; comboL=0; for(let k=0;k<4;k++) pool.push({x:t.x,y:t.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:1,c:'#ff8800',size:2}); return false}
            return true
          })
          if(targets.length!==before){ /* miss handled */ }
          // mouse polling for click
          if(input.mouse.down && !wasDown){ onMouseDown() }
          wasDown=input.mouse.down
        }
      }
      // sync react occasionally
      if(frame%6===0){ setScore(scoreL); setLevel(levelL); setCombo(comboL); setHits(hitsL); const tot=hitsL+missL; setAcc(tot?Math.round(hitsL/tot*100):0) }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke()}
      for(let i=0;i<H;i+=40){ ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(W,i); ctx.stroke()}
      // HUD top
      ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(0,0,W,26)
      ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}  x${comboL}`,10,17)
      ctx.textAlign='right'; ctx.fillStyle= timeL<=10?'#ff3355':'#ffffff'; ctx.fillText(`${timeL}s`,W-10,17)
      // targets
      targets.forEach(t=>{
        const pulse=Math.sin(Date.now()*0.008 + t.x)*0.1+0.9
        ctx.save(); ctx.translate(t.x,t.y); ctx.scale(pulse,pulse)
        ctx.fillStyle='rgba(255,0,85,0.18)'; ctx.beginPath(); ctx.arc(0,0,t.r+8,0,Math.PI*2); ctx.fill()
        const col= t.kind===0?'#ffdd00': t.kind===1?'#00ffff':'#ff44cc'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(0,0,t.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(0,0,t.r*0.62,0,Math.PI*2); ctx.fill()
        ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,0,t.r*0.32,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(0,0,t.r*0.12,0,Math.PI*2); ctx.fill()
        ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,t.r+4,-Math.PI/2,-Math.PI/2+Math.PI*2*(t.life/t.maxLife)); ctx.stroke()
        ctx.restore()
      })
      pool.draw(ctx)
      // crosshair at mouse
      if(!ended){
        ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(input.mouse.x-12,input.mouse.y); ctx.lineTo(input.mouse.x+12,input.mouse.y); ctx.moveTo(input.mouse.x,input.mouse.y-12); ctx.lineTo(input.mouse.x,input.mouse.y+12); ctx.stroke()
        ctx.strokeStyle='rgba(0,255,255,0.35)'; ctx.beginPath(); ctx.arc(input.mouse.x,input.mouse.y,8,0,Math.PI*2); ctx.stroke()
      }
      if(ended){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.fillText('¡TIEMPO!',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='12px JetBrains Mono'; ctx.fillText(`Score ${scoreL} • Hits ${hitsL} • ${hitsL+missL?Math.round(hitsL/(hitsL+missL)*100):0}%`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Click / Espacio para reiniciar',W/2,H/2+32)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); clearInterval(timer); window.removeEventListener('keydown',onKey); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-crosshair" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono" style={{color: combo>3?'#ffdd00':'#fff'}}>x{combo} Lv{level}</div>
        <div className="glass rounded-lg px-3 py-2 flex items-center gap-2"><span className="text-xs font-mono text-white/60">TIEMPO</span><span className={`font-black ${time<=10?'text-red-400 animate-pulse':'text-white'}`} style={{fontFamily:'Orbitron'}}>{time}s</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">{hits}H {acc}% • Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">3 tamaños • Combo y niveles con velocidad • Precisión + tiempo extra • Presiona para disparar</p>
    </div>
  )
}
