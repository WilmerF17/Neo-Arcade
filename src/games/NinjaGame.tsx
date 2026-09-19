import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function NinjaGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=> loadBest(bestKey('ninja'),0))
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,320)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, levelL=1
    let x=80, y=H-60, vy=0, onGround=true, jumps=0, facing=1
    let platforms:{x:number,y:number,w:number}[]=[
      {x:0,y:H-30,w:W}, {x:180,y:H-92,w:92}, {x:300,y:H-142,w:82}, {x:80,y:H-182,w:102}, {x:260,y:H-222,w:72}
    ]
    let shurikens:{x:number,y:number,vx:number}[]=[]
    let enemies:{x:number,y:number,alive:boolean,dir:number,plat:number}[]=[
      {x:210,y:H-108,alive:true,dir:1,plat:1},{x:320,y:H-158,alive:true,dir:-1,plat:2},{x:100,y:H-198,alive:true,dir:1,plat:3}
    ]
    let over=false
    const BK=bestKey('ninja')

    const jump=()=>{
      if(jumps<2){ vy=-10.2 - levelL*0.12; onGround=false; jumps++; playTone(520+ jumps*80,0.09,'square',0.11); for(let i=0;i<4;i++) pool.push({x,y,vx:(Math.random()-0.5)*2,vy:1+Math.random()*2,life:1,c:'#00ffff',size:2}) }
    }
    const shoot=()=>{
      shurikens.push({x:x+12*facing,y:y-6,vx:6.8*facing})
      playTone(740,0.07,'square',0.09)
    }

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(e.code==='Space'||k==='w'||k==='arrowup') jump()
      if(k==='f'||k==='k'||k==='j') shoot()
      if(k==='r' && over){ scoreL=0; levelL=1; x=80; y=H-60; vy=0; over=false; setScore(0); setLevel(1) }
    }
    window.addEventListener('keydown',onKey)

    let wasDown=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused && !over){
        frame++
        // input move WASD/Flechas
        const left=input.keys['a']||input.keys['arrowleft']
        const right=input.keys['d']||input.keys['arrowright']
        if(left){ x-=3.4+levelL*0.07; facing=-1 }
        if(right){ x+=3.4+levelL*0.07; facing=1 }
        // mouse/touch: tap left/right to move, tap up to jump, double tap shoot
        if(input.mouse.down){
          if(!wasDown){
            if(input.mouse.x < W*0.32) { /* left */ }
            else if(input.mouse.x > W*0.68) { /* right */ }
            else if(input.mouse.y < H*0.5) jump()
            else shoot()
          }
          // continuous left/right via position
          if(input.mouse.x < W*0.32) { x-=3.2; facing=-1 }
          if(input.mouse.x > W*0.68) { x+=3.2; facing=1 }
        }
        wasDown=input.mouse.down
        x=Math.max(12,Math.min(W-12,x))
        vy+=0.64; y+=vy
        onGround=false
        for(const p of platforms){
          if(x+8>p.x && x-8<p.x+p.w && y+10>p.y && y+10<p.y+12 && vy>=0){
            y=p.y-10; vy=0; onGround=true; jumps=0; break
          }
        }
        if(y>H+26){
          over=true; if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)} playTone(140,0.4,'sawtooth',0.15)
        }
        shurikens.forEach(s=> { s.x+=s.vx; s.vx*=0.998 })
        shurikens=shurikens.filter(s=> s.x<W+22 && s.x>-22)
        // enemies patrol on platform
        enemies.forEach(e=>{
          if(!e.alive) return
          const pl=platforms[e.plat]
          if(pl){ e.x+= e.dir*(0.7+levelL*0.14); if(e.x<pl.x+10) e.dir=1; if(e.x>pl.x+pl.w-10) e.dir=-1 }
        })
        for(let i=enemies.length-1;i>=0;i--){
          const e=enemies[i]
          if(!e.alive) continue
          for(let j=shurikens.length-1;j>=0;j--){
            const s=shurikens[j]
            if(Math.hypot(s.x-e.x,s.y-e.y)<18){
              e.alive=false; shurikens.splice(j,1)
              scoreL+= 50 + levelL*6; setScore(scoreL)
              if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)}
              for(let k=0;k<9;k++) pool.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#00ffff',size:2.8})
              playTone(880,0.14,'square',0.14)
              setTimeout(()=>{ e.alive=true }, 2200 - levelL*80)
              if(scoreL> levelL*220){ levelL++; setLevel(levelL); platforms.forEach(p=> p.w=Math.max(54, p.w-4)) }
              break
            }
          }
          if(e.alive && Math.hypot(x-e.x, y-e.y)<16){
            vy=-5.5; x+= (x<e.x?-14:14)
            scoreL=Math.max(0,scoreL-18); setScore(scoreL)
            for(let k=0;k<6;k++) pool.push({x,y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ffdd00',size:2.2})
            playTone(200,0.12,'sawtooth',0.13)
          }
        }
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.fillStyle='rgba(255,255,255,0.03)'
      for(let i=0;i<5;i++){ const px=(frame*0.22 + i*118)%(W+40)-20; ctx.beginPath(); ctx.ellipse(px, 46+i*10, 34,8,0,0,Math.PI*2); ctx.fill()}
      ctx.strokeStyle='rgba(0,255,255,0.05)'; for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo((i - frame*0.22)%W,0); ctx.lineTo((i - frame*0.22)%W, H); ctx.stroke()}
      platforms.forEach(p=>{
        ctx.fillStyle='#111e32'; ctx.fillRect(p.x,p.y,p.w,11)
        ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=6; ctx.fillRect(p.x,p.y,p.w,3); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(p.x,p.y+3,p.w,2)
      })
      enemies.forEach(e=>{
        if(!e.alive) return
        ctx.fillStyle='#ff3355'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(e.x,e.y,10,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(e.x-3,e.y-2,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(e.x+3,e.y-2,2,0,Math.PI*2); ctx.fill()
        ctx.fillStyle=e.dir>0?'#ffdd00':'#00ffff'; ctx.beginPath(); ctx.arc(e.x, e.y+4, 2.5,0,Math.PI*2); ctx.fill()
      })
      shurikens.forEach(s=>{
        ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(frame*0.52)
        ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(6,0); ctx.moveTo(0,-6); ctx.lineTo(0,6); ctx.stroke()
        ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.restore()
      })
      // ninja double-jump indicator
      ctx.save(); ctx.translate(x,y)
      ctx.scale(facing,1)
      ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=10
      ctx.beginPath(); (ctx as any).roundRect(-8,-18,16,20,4); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#003333'; ctx.beginPath(); ctx.arc(0,-12,5,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#ffdd88'; ctx.fillRect(-2,-4,4,6)
      ctx.fillStyle='#111'; ctx.fillRect(-6,-16,12,3)
      // jump trail
      if(!onGround){ ctx.fillStyle='rgba(0,255,255,0.22)'; ctx.beginPath(); ctx.arc(0,10,6,0,Math.PI*2); ctx.fill() }
      ctx.restore()
      pool.draw(ctx)
      // HUD
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(8,8, 88,18); ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`JUMPS ${2-jumps}/2`,12,20)
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='right'; ctx.fillText(`Lv ${levelL}`,W-10,20)
      if(over){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡CAÍDA!',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} • Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('R para reiniciar',W/2,H/2+30)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[3/2]" width={480} height={320}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Lv{level} • Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Doble salto con plataformas • Shurikens F/K • Enemigos patrullan • Click también</p>
    </div>
  )
}
