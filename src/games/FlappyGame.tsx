import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function FlappyGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_flappy_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,400,560)
    const particles=createParticlePool(64)
    const input=createInput(c,W,H)
    let raf=0
    let bird={x:88,y:H/2, vy:0, r:14}
    const GRAV=0.42, FLAP=-7.2, PIPE_W=54, INIT_GAP=118, BASE_SPEED=2.8
    let pipes:{x:number,y:number,gap:number,passed:boolean}[]=[]
    let scoreL=0, levelL=1, speedMul=BASE_SPEED
    let gameOver=false, paused=false
    let frame=0
    let bgOff=0

    const spawnPipe=()=>{
      const gap= Math.max(88, INIT_GAP - levelL*2 - Math.random()*18) // variable gap smaller at high level
      const minY= 44, maxY= H-44-gap
      const y= minY+Math.random()*(maxY-minY)
      pipes.push({x:W+20,y,gap,passed:false})
    }
    for(let i=0;i<3;i++) { const g=Math.max(88,INIT_GAP - Math.random()*10); pipes.push({x: W+ i*168, y: 80+Math.random()*(H-160-g), gap:g, passed:false}) }

    const reset=()=>{
      bird={x:88,y:H/2,vy:0,r:14}; pipes=[]; for(let i=0;i<3;i++) pipes.push({x:W+i*168,y:80+Math.random()*(H-260),gap:Math.max(88,INIT_GAP-Math.random()*10),passed:false})
      scoreL=0; levelL=1; speedMul=BASE_SPEED; gameOver=false; paused=false; frame=0; bgOff=0; particles.clear(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const flap=()=>{
      if(gameOver){ reset(); return }
      bird.vy=FLAP
      playTone(680,0.09,'square',0.12)
      for(let i=0;i<3;i++) particles.push({x:bird.x-6,y:bird.y+6,vx:(Math.random()-0.5)*3-1,vy:Math.random()*2+1,life:1,c:'#00ffff',size:2.2})
    }
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '||k==='w'||k==='arrowup'){ e.preventDefault(); flap() }
      if(k==='r'){ reset(); return }
      if(k==='p'){ if(!gameOver) paused=!paused; return }
    }
    window.addEventListener('keydown', onKey)
    const onPointer=(e:MouseEvent|TouchEvent)=>{
      // only flap if started
      flap()
    }
    c.addEventListener('mousedown', onPointer as any)
    c.addEventListener('touchstart', onPointer as any, {passive:true} as any)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // parallax grid
      ctx.strokeStyle='rgba(0,255,255,0.05)'; ctx.lineWidth=1
      for(let i=0;i<W;i+=40){ const off=(bgOff*0.5)%40; ctx.beginPath(); ctx.moveTo(i-off,0); ctx.lineTo(i-off,H); ctx.stroke() }
      // subtle clouds
      ctx.fillStyle='rgba(255,255,255,0.03)'
      for(let i=0;i<4;i++){ const cx=(i*160 - bgOff*0.3)% (W+120) -20, cy=30+i*18; ctx.beginPath(); ctx.ellipse(cx,cy,30,12,0,0,Math.PI*2); ctx.fill() }
      // pipes neon
      for(const p of pipes){
        // top
        const gradTop=ctx.createLinearGradient(p.x,0,p.x+PIPE_W,0)
        gradTop.addColorStop(0,'#00ff88'); gradTop.addColorStop(1,'#00aaff')
        ctx.fillStyle=gradTop; ctx.shadowColor='#00ff88'; ctx.shadowBlur=10
        ctx.beginPath(); (ctx as any).roundRect(p.x,0,PIPE_W,p.y,8); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(p.x,0,PIPE_W,3)
        // bottom
        const by=p.y+p.gap
        const gradBot=ctx.createLinearGradient(p.x,by,p.x+PIPE_W,by)
        gradBot.addColorStop(0,'#00aaff'); gradBot.addColorStop(1,'#00ff88')
        ctx.fillStyle=gradBot; ctx.shadowColor='#00aaff'; ctx.shadowBlur=10
        ctx.beginPath(); (ctx as any).roundRect(p.x,by,PIPE_W,H-by,8); ctx.fill(); ctx.shadowBlur=0
        // caps
        ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(p.x-3,p.y-10,PIPE_W+6,10); ctx.fillRect(p.x-3,by,PIPE_W+6,10)
      }
      // bird with rotation
      const ang=Math.max(-0.6, Math.min(1.1, bird.vy*0.08))
      ctx.save(); ctx.translate(bird.x,bird.y); ctx.rotate(ang)
      const bodyGrad=ctx.createRadialGradient(-4,-4,2,0,0,18)
      bodyGrad.addColorStop(0,'#ffffff'); bodyGrad.addColorStop(1,'#00ffff')
      ctx.fillStyle=bodyGrad; ctx.shadowColor='#00ffff'; ctx.shadowBlur=14
      ctx.beginPath(); ctx.ellipse(0,0,16,12,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      // wing flap anim
      const wingY=Math.sin(frame*0.6)*3
      ctx.fillStyle='rgba(0,200,255,0.9)'; ctx.beginPath(); ctx.ellipse(-4,wingY,8,6, -0.2,0,Math.PI*2); ctx.fill()
      // eye
      ctx.fillStyle='#003333'; ctx.beginPath(); ctx.arc(6,-4,3,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(7,-5,1.3,0,Math.PI*2); ctx.fill()
      // beak
      ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(8,-5); ctx.lineTo(8,5); ctx.closePath(); ctx.fill()
      ctx.restore()

      particles.draw(ctx)
      // HUD bar
      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,22)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}`,8,15)
      ctx.textAlign='center'; ctx.fillStyle='#ffdd00'; ctx.font='900 12px Orbitron'; ctx.fillText(`${scoreL}`,W/2,15)
      ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='10px JetBrains Mono'; ctx.fillText(`VEL ${(speedMul).toFixed(2)}  GAP ${Math.round(pipes[0]?.gap||0)}`,W-8,15)
      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.48)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=10; ctx.fillText('PAUSA',W/2,H/2); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('P para continuar',W/2,H/2+18)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=10; ctx.fillText('GAME OVER',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='12px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Espacio / Click / R para reiniciar',W/2,H/2+30)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      // physics
      bird.vy+=GRAV
      bird.vy=Math.min(9, bird.vy)
      bird.y+=bird.vy
      speedMul= 2.8 + (levelL-1)*0.35
      bgOff+=speedMul
      // pipes move
      for(const p of pipes) p.x-=speedMul
      // recycle
      if(pipes[0] && pipes[0].x < -PIPE_W-20){ pipes.shift(); spawnPipe() }
      // collisions & scoring
      for(const p of pipes){
        const inX= bird.x+bird.r > p.x && bird.x-bird.r < p.x+PIPE_W
        const inGap= bird.y - bird.r > p.y && bird.y + bird.r < p.y+p.gap
        if(inX && !inGap){
          gameOver=true
          playTone(160,0.36,'sawtooth',0.18)
          for(let i=0;i<14;i++) particles.push({x:bird.x,y:bird.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff3366',size:2.6})
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_flappy_best',scoreL); onScoreRef.current(scoreL) }
        }
        if(!p.passed && p.x+PIPE_W < bird.x){
          p.passed=true
          scoreL+=1
          setScore(scoreL)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_flappy_best',scoreL); onScoreRef.current(scoreL) }
          playTone(740,0.1,'square',0.13)
          for(let i=0;i<8;i++) particles.push({x:p.x+PIPE_W,y:p.y+p.gap/2,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ffdd00',size:2.2})
          const newLevel=Math.floor(scoreL/6)+1
          if(newLevel!==levelL){ levelL=newLevel; setLevel(levelL); playTone(880,0.16,'triangle',0.14) }
        }
      }
      if(bird.y+bird.r>H || bird.y-bird.r<0){
        gameOver=true
        playTone(140,0.4,'square',0.18)
        for(let i=0;i<12;i++) particles.push({x:bird.x,y:bird.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff3366',size:2.4})
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_flappy_best',scoreL); onScoreRef.current(scoreL) }
      }
      particles.update()
      draw(false)
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey)
      c.removeEventListener('mousedown', onPointer as any); c.removeEventListener('touchstart', onPointer as any)
      input.cleanup()
    }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full" style={{aspectRatio:'400/560'}} width={400} height={560}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Espacio/W/Click para flap • Gravedad 0.42 • Gap variable • Velocidad 2.8+ lvl*0.35</p>
    </div>
  )
}
