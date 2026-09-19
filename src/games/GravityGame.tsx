import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function GravityGame({ onScore, isStarted }: { onScore: (s: number) => void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=> loadBest(bestKey('grav'),0))
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,300)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let y=H/2, vy=0, gravity=0.55, flip=false
    let obstacles:{x:number,gapY:number,rot:number}[]=[]
    let scoreL=0, levelL=1, over=false
    let particlesOnFlip=0
    const BK=bestKey('grav')

    const doFlip=()=>{
      if(over){ obstacles=[]; y=H/2; vy=0; scoreL=0; levelL=1; flip=false; gravity=0.55; over=false; setScore(0); setLevel(1); return}
      flip=!flip; gravity= flip? -0.55:0.55
      vy+= flip? -7:7
      playTone(flip? 620: 420,0.11,'square',0.13)
      for(let i=0;i<6;i++) pool.push({x:62,y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:1,c: flip?'#ff00ff':'#00ffff',size:2.6})
      particlesOnFlip=12
    }
    const onKey=(e:KeyboardEvent)=>{ if(e.code==='Space'||e.code==='ArrowUp'||e.key.toLowerCase()==='w' || e.key.toLowerCase()==='g') doFlip() }
    window.addEventListener('keydown',onKey)
    const onDown=()=> doFlip()
    canvas.addEventListener('mousedown',onDown)
    canvas.addEventListener('touchstart', (e:TouchEvent)=>{ e.preventDefault(); doFlip() }, {passive:false} as any)
    // also WASD via input keys polling
    let wasSpace=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused && !over){
        frame++
        // poll for hold?
        if((input.keys[' ']||input.keys['w']) && !wasSpace){ doFlip() }
        wasSpace= !!(input.keys[' ']||input.keys['w'])
        if(input.mouse.down && frame%10===0){ /* handled via onDown */ }
        vy+=gravity*0.62; y+=vy
        if(y<12){ y=12; vy=0 }
        if(y>H-12){ y=H-12; vy=0 }
        if(particlesOnFlip>0) particlesOnFlip--
        const speed= 3.4 + levelL*0.32
        if(frame%(Math.max(42, 78 - levelL*4))===0){ obstacles.push({x:W+14, gapY: 68+Math.random()*(H-136), rot: Math.random()*Math.PI})}
        obstacles.forEach(o=> { o.x-=speed; o.rot+=0.02 })
        obstacles=obstacles.filter(o=> o.x>-44)
        scoreL+=0.16 + levelL*0.01; if(frame%4===0) setScore(Math.floor(scoreL))
        if(Math.floor(scoreL) > levelL*140){ levelL++; setLevel(levelL); playTone(740,0.13,'square',0.12) }
        const px=62, py=y
        for(const o of obstacles){
          const gap= 108 - Math.min(22, levelL*3)
          if(px+11>o.x && px-11<o.x+36){
            if(py-9 < o.gapY-gap/2 || py+9 > o.gapY+gap/2){
              over=true
              const sc=Math.floor(scoreL)
              if(sc>bestRef.current){ try{ saveBest(BK,sc)}catch{}; bestRef.current=sc; setBest(sc); onScoreRef.current(sc)}
              playTone(120,0.36,'sawtooth',0.16)
              for(let i=0;i<14;i++) pool.push({x:px,y:py,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff3355',size:3})
            }
          }
        }
      }
      pool.update()
      // draw
      const hue=(frame*0.72)%360
      ctx.fillStyle= flip? '#0a0614':'#080a14'; ctx.fillRect(0,0,W,H)
      // moving grid with perspective
      ctx.strokeStyle= flip?'rgba(255,0,255,0.06)':'rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let x= -((frame* (1.2+levelL*0.12))%40); x<W; x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke()}
      for(let y2=0;y2<H;y2+=40){ ctx.beginPath(); ctx.moveTo(0,y2); ctx.lineTo(W,y2); ctx.stroke()}
      // neon tunnel vignette
      const vg=ctx.createLinearGradient(0,0,W,0); vg.addColorStop(0,'rgba(0,255,255,0.06)'); vg.addColorStop(0.5,'transparent'); vg.addColorStop(1,'rgba(255,0,255,0.06)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)
      obstacles.forEach(o=>{
        const gap=108 - Math.min(22, levelL*3)
        const gradTop=ctx.createLinearGradient(o.x,0,o.x+36,0); gradTop.addColorStop(0,`hsl(${hue},100%,60%)`); gradTop.addColorStop(1,'#ffffff')
        const gradBot=ctx.createLinearGradient(o.x,0,o.x+36,0); gradBot.addColorStop(0,'#ffffff'); gradBot.addColorStop(1,`hsl(${(hue+32)%360},100%,60%)`)
        ctx.fillStyle=gradTop; ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=8
        // top with small rotation effect via skew
        ctx.save(); ctx.translate(o.x+18, (o.gapY-gap/2)/2); ctx.rotate(Math.sin(o.rot)*0.04); ctx.fillRect(-18, -(o.gapY-gap/2)/2,36,o.gapY-gap/2); ctx.restore()
        ctx.fillStyle=gradBot; ctx.shadowColor=`hsl(${(hue+32)%360},100%,60%)`
        ctx.save(); ctx.translate(o.x+18, o.gapY+gap/2 + (H-(o.gapY+gap/2))/2); ctx.rotate(Math.sin(o.rot+1)*0.04); ctx.fillRect(-18, -(H-(o.gapY+gap/2))/2,36, H-(o.gapY+gap/2)); ctx.restore()
        ctx.shadowBlur=0
        // gap indicator arrows
        ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(flip?'▲':'▼', o.x+18, o.gapY+4)
        // pulsing ring
        ctx.strokeStyle=`hsl(${hue},100%,60%)`; ctx.globalAlpha=0.22; ctx.beginPath(); ctx.arc(o.x+18, o.gapY, 10+ Math.sin(frame*0.12)*2,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1
      })
      // player with exhaust
      ctx.save(); ctx.translate(62,y); ctx.rotate(flip?Math.PI:0 + vy*0.04)
      // shadow
      ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,14,12,4,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=`hsl(${hue},100%,62%)`; ctx.shadowColor=`hsl(${hue},100%,62%)`; ctx.shadowBlur=14
      ctx.beginPath(); (ctx as any).roundRect(-12,-10,24,20,4); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(6,-4,3,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(7,-4,1.2,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=flip?'#ff00ff':'#00ffff'; ctx.globalAlpha=0.62 + Math.sin(frame*0.3)*0.18; ctx.beginPath(); ctx.ellipse(-14,0,9,5,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1
      // gravity arrow
      ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.font='700 7px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(flip?'↑':'↓',0,-14)
      ctx.restore()
      // particles with gravity direction
      pool.draw(ctx)
      // HUD
      ctx.fillStyle= flip?'#ff00ff':'#00ffff'; ctx.font='900 11px Orbitron'; ctx.textAlign='left'; ctx.shadowColor=flip?'#ff00ff':'#00ffff'; ctx.shadowBlur=8; ctx.fillText(flip?'GRAVITY: ↑':'GRAVITY: ↓',10,18); ctx.shadowBlur=0
      ctx.fillStyle='rgba(255,255,255,0.52)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='right'; ctx.fillText(`Lv ${levelL}`,W-10,18)
      if(over){
        ctx.fillStyle='rgba(0,0,0,0.58)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡GRAVEDAD FALLIDA!',W/2,H/2-8)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Distancia ${Math.floor(scoreL)} • Nivel ${levelL}`,W/2,H/2+14)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('Espacio / Click para flip y reiniciar',W/2,H/2+32)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); canvas.removeEventListener('mousedown',onDown); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[8/5] cursor-pointer" width={480} height={300}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">DISTANCIA</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Lv{level} • Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Espacio/W/Click invierte gravedad • Túneles con velocidad progresiva • Partículas direccionales</p>
    </div>
  )
}
