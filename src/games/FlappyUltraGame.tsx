import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function FlappyUltraGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_flappyultra_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,400,560)
    const particles=createParticlePool(72)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let bird={x:84,y:H/2, vy:0, r:13}
    const GRAV=0.55, FLAP=-7.6, PIPE_W=46, GAP=68, BASE=4.2
    let pipes:{x:number,y:number,gap:number,passed:boolean, double:boolean}[]=[]
    let wind=0, windTimer=0
    let scoreL=0, levelL=1, speedMul=BASE
    let gameOver=false, paused=false

    const spawn=()=>{
      // double pipe every 3rd
      const isDouble = pipes.length % 5 === 2
      const y= 40 + Math.random()*(H-80-GAP - (isDouble? 22:0))
      pipes.push({x:W+18,y,gap:isDouble? GAP-6 : GAP, passed:false, double:isDouble})
      if(isDouble){
        // second gap offset
        // we fake double by having two gaps? instead push extra obstacle pipe as visual split
      }
    }
    for(let i=0;i<4;i++) pipes.push({x:W+i*138, y:50+Math.random()*(H-140-GAP), gap:GAP, passed:false, double: i%3===1})

    const reset=()=>{
      bird={x:84,y:H/2,vy:0,r:13}; pipes=[]; for(let i=0;i<4;i++) pipes.push({x:W+i*138,y:50+Math.random()*(H-140-GAP),gap:GAP,passed:false,double:i%3===1})
      scoreL=0; levelL=1; speedMul=BASE; wind=0; windTimer=0; frame=0; gameOver=false; paused=false; particles.clear(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const flap=()=>{
      if(gameOver){ reset(); return }
      bird.vy=FLAP
      playTone(740,0.08,'square',0.13)
      for(let i=0;i<4;i++) particles.push({x:bird.x,y:bird.y,vx:(Math.random()-0.5)*4-1,vy:Math.random()*2+1,life:1,c:'#ff00ff',size:2})
    }
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '||k==='w'||k==='arrowup'){ e.preventDefault(); flap() }
      if(k==='r'){ reset(); return }
      if(k==='p'){ if(!gameOver) paused=!paused; return }
    }
    window.addEventListener('keydown', onKey)
    const onPointer=()=> flap()
    c.addEventListener('mousedown', onPointer as any)
    c.addEventListener('touchstart', onPointer as any, {passive:true} as any)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // wind indicator & fast grid
      ctx.strokeStyle='rgba(255,0,255,0.06)'; ctx.lineWidth=1
      for(let i=0;i<W;i+=32){ const off=(frame* speedMul*0.6)%32; ctx.beginPath(); ctx.moveTo(i-off,0); ctx.lineTo(i-off,H); ctx.stroke() }
      if(Math.abs(wind)>0.08){
        ctx.fillStyle= wind>0?'rgba(0,255,255,0.12)':'rgba(255,0,255,0.12)'
        ctx.fillRect(0,0,W,22)
        ctx.fillStyle= wind>0?'#00ffff':'#ff00ff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'
        ctx.fillText(`${wind>0?'VIENTO →':'← VIENTO'} ${wind.toFixed(2)}`,W/2,15)
        // streaks
        ctx.strokeStyle= wind>0?'rgba(0,255,255,0.22)':'rgba(255,0,255,0.22)'; ctx.lineWidth=1
        for(let i=0;i<12;i++){ const x=(i*44 + frame*wind*38)%W, y=40+i*26; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+ wind*18, y); ctx.stroke() }
      }
      // pipes ULTRA double
      for(const p of pipes){
        // top
        ctx.fillStyle=p.double?'#ff00ff':'#ff3366'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=10
        ctx.beginPath(); (ctx as any).roundRect(p.x,0,PIPE_W,p.y,6); ctx.fill(); ctx.shadowBlur=0
        // bottom
        ctx.fillStyle=p.double?'#ff00ff':'#ff3366'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=10
        ctx.beginPath(); (ctx as any).roundRect(p.x,p.y+p.gap,PIPE_W,H-(p.y+p.gap),6); ctx.fill(); ctx.shadowBlur=0
        if(p.double){
          // middle blocker to make double gap harder (two gaps)
          const midY=p.y+p.gap/2 -6
          ctx.fillStyle='rgba(255,0,255,0.95)'; ctx.fillRect(p.x-4,midY,PIPE_W+8,12)
          ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(p.x-4,midY,PIPE_W+8,12)
        }
      }
      // bird ultra
      const ang=Math.max(-0.7, Math.min(1.2, bird.vy*0.09))
      ctx.save(); ctx.translate(bird.x,bird.y); ctx.rotate(ang)
      ctx.fillStyle='#ffffff'; ctx.shadowColor='#ff00ff'; ctx.shadowBlur=16; ctx.beginPath(); ctx.ellipse(0,0,14,10,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      const wing=Math.sin(frame*0.75)*4
      ctx.fillStyle='#ff00ff'; ctx.beginPath(); ctx.ellipse(-3,wing,7,5, -0.3,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#003333'; ctx.beginPath(); ctx.arc(5,-3,2.6,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.moveTo(13,0); ctx.lineTo(7,-4); ctx.lineTo(7,4); ctx.closePath(); ctx.fill()
      // trail
      ctx.fillStyle='rgba(255,0,255,0.22)'; ctx.beginPath(); ctx.arc(-10,0,6,0,Math.PI*2); ctx.fill()
      ctx.restore()

      particles.draw(ctx)
      ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,22)
      ctx.fillStyle='#ff00ff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}`,8,15)
      ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='900 12px Orbitron'; ctx.fillText(`${scoreL}`,W/2,15)
      ctx.textAlign='right'; ctx.font='10px JetBrains Mono'; ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText(`VEL ${speedMul.toFixed(2)} GAP ${GAP}`,W-8,15)

      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff00ff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.66)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='12px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Espacio / Click / R',W/2,H/2+30)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      // wind cycle every 180 frames
      windTimer++
      if(windTimer>180){
        windTimer=0
        wind= (Math.random()-0.5)*0.42 // -0.21..0.21
        if(levelL>4) wind*=1.3
      }
      // wind affects bird X slightly and vertical drift
      bird.vy+=GRAV + wind*0.06
      bird.vy=Math.min(10, bird.vy)
      bird.y+=bird.vy
      bird.x+= wind*1.2
      bird.x=Math.max(44, Math.min(W-44, bird.x))

      speedMul= BASE + (levelL-1)*0.52
      for(const p of pipes) p.x-=speedMul
      if(pipes[0] && pipes[0].x < -PIPE_W-18){ pipes.shift(); spawn() }

      for(const p of pipes){
        const inX= bird.x+bird.r > p.x && bird.x-bird.r < p.x+PIPE_W
        let hit=false
        if(inX){
          if(p.double){
            const mid= p.y+p.gap/2
            const gap1Top=p.y, gap1Bot=mid-6, gap2Top=mid+6, gap2Bot=p.y+p.gap
            const inGap1= bird.y-bird.r > gap1Top && bird.y+bird.r < gap1Bot
            const inGap2= bird.y-bird.r > gap2Top && bird.y+bird.r < gap2Bot
            if(!(inGap1||inGap2)) hit=true
          } else {
            if(!(bird.y-bird.r > p.y && bird.y+bird.r < p.y+p.gap)) hit=true
          }
        }
        if(hit){
          gameOver=true; playTone(150,0.38,'sawtooth',0.18)
          for(let i=0;i<16;i++) particles.push({x:bird.x,y:bird.y,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,life:1,c:'#ff3366',size:2.8})
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_flappyultra_best',scoreL); onScoreRef.current(scoreL) }
        }
        if(!p.passed && p.x+PIPE_W < bird.x){
          p.passed=true; scoreL+=1; setScore(scoreL)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_flappyultra_best',scoreL); onScoreRef.current(scoreL) }
          playTone(820,0.09,'square',0.13)
          for(let i=0;i<9;i++) particles.push({x:p.x+PIPE_W,y:p.y+p.gap/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ffdd00',size:2.4})
          const newLevel=Math.floor(scoreL/12)+1
          if(newLevel!==levelL){ levelL=newLevel; setLevel(levelL); playTone(960,0.16,'triangle',0.15) }
        }
      }
      if(bird.y+bird.r>H || bird.y-bird.r<0){
        gameOver=true; playTone(130,0.4,'square',0.18)
        for(let i=0;i<14;i++) particles.push({x:bird.x,y:bird.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff3366',size:2.6})
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_flappyultra_best',scoreL); onScoreRef.current(scoreL) }
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
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-fuchsia-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-fuchsia-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-fuchsia-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">ULTRA: gap 68 • grav 0.55 • viento • doble tubería • nivel cada 12 • Espacio/W/Click</p>
    </div>
  )
}
