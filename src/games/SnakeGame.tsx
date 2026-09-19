import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function SnakeGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_snake_best'))
  const bestRef=useRef(best), scoreRef=useRef(0), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])

  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,400,400)
    const GRID=20, COLS=20, ROWS=20
    const particles=createParticlePool(56)
    const input=createInput(c,W,H)

    let snake:{x:number,y:number}[]=[{x:10,y:10},{x:9,y:10},{x:8,y:10}]
    let dir={x:1,y:0}, nextDir={x:1,y:0}
    let food={x:15,y:10}
    let obstacles:{x:number,y:number}[]=[]
    let scoreL=0, levelL=1, combo=0, tick=0
    let speed=7 // lower = faster, 7 frames per move
    let gameOver=false, paused=false
    let raf=0
    let touchStart={x:0,y:0}

    const placeFood=()=>{
      let p:{x:number,y:number}, tries=0
      do{
        p={x:Math.floor(Math.random()*COLS), y:Math.floor(Math.random()*ROWS)}
        tries++
      }while((snake.some(s=>s.x===p.x&&s.y===p.y) || obstacles.some(o=>o.x===p.x&&o.y===p.y)) && tries<120)
      food=p
    }
    const genObstacles=()=>{
      obstacles=[]
      if(levelL<3) return
      const count = Math.min(12, (levelL-2)*3)
      for(let i=0;i<count;i++){
        let ox:number, oy:number, tries=0
        do{
          ox=Math.floor(Math.random()*COLS); oy=Math.floor(Math.random()*ROWS); tries++
        }while((snake.some(s=>Math.abs(s.x-ox)+Math.abs(s.y-oy)<4) || (Math.abs(ox-food.x)+Math.abs(oy-food.y)<3)) && tries<80)
        obstacles.push({x:ox!,y:oy!})
      }
    }
    const reset=()=>{
      snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}]
      dir={x:1,y:0}; nextDir={x:1,y:0}
      scoreL=0; levelL=1; combo=0; tick=0; speed=7; gameOver=false; paused=false
      particles.clear()
      placeFood(); genObstacles()
      setScore(0); setLevel(1); scoreRef.current=0
    }
    resetRef.current=reset
    placeFood(); genObstacles()

    // swipe for mobile - use canvas touch via input but add swipe detection
    const onTouchStart=(e:TouchEvent)=>{ touchStart={x:e.touches[0].clientX, y:e.touches[0].clientY} }
    const onTouchEnd=(e:TouchEvent)=>{
      const dx=e.changedTouches[0].clientX - touchStart.x
      const dy=e.changedTouches[0].clientY - touchStart.y
      if(Math.abs(dx)<18 && Math.abs(dy)<18) return
      const cur=dir
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>0 && cur.x===0) nextDir={x:1,y:0}
        else if(dx<0 && cur.x===0) nextDir={x:-1,y:0}
      }else{
        if(dy>0 && cur.y===0) nextDir={x:0,y:1}
        else if(dy<0 && cur.y===0) nextDir={x:0,y:-1}
      }
    }
    c.addEventListener('touchstart', onTouchStart as any, {passive:true} as any)
    c.addEventListener('touchend', onTouchEnd as any)

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p' || k===' '){ paused=!paused; return }
      const cur=dir
      if((k==='arrowup'||k==='w') && cur.y===0) nextDir={x:0,y:-1}
      if((k==='arrowdown'||k==='s') && cur.y===0) nextDir={x:0,y:1}
      if((k==='arrowleft'||k==='a') && cur.x===0) nextDir={x:-1,y:0}
      if((k==='arrowright'||k==='d') && cur.x===0) nextDir={x:1,y:0}
    }
    window.addEventListener('keydown', onKey)

    const draw=(showPauseOverlay:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let i=0;i<=COLS;i++){ ctx.beginPath(); ctx.moveTo(i*GRID,0); ctx.lineTo(i*GRID,H); ctx.stroke() }
      for(let i=0;i<=ROWS;i++){ ctx.beginPath(); ctx.moveTo(0,i*GRID); ctx.lineTo(W,i*GRID); ctx.stroke() }
      // obstacles
      for(const o of obstacles){
        ctx.fillStyle='rgba(255,60,120,0.18)'; ctx.strokeStyle='rgba(255,60,120,0.55)'; ctx.lineWidth=1.2
        const x=o.x*GRID, y=o.y*GRID
        ctx.beginPath(); (ctx as any).roundRect(x+2,y+2,GRID-4,GRID-4,5); ctx.fill(); ctx.stroke()
        ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(x+6,y+6,GRID-12,3)
      }
      // food pulse
      const pulse = 0.85 + Math.sin(Date.now()*0.008)*0.15
      const fx=food.x*GRID, fy=food.y*GRID
      const grad=ctx.createRadialGradient(fx+GRID/2,fy+GRID/2,2, fx+GRID/2,fy+GRID/2, GRID*0.9)
      grad.addColorStop(0,'#ff0055'); grad.addColorStop(1,'rgba(255,0,85,0)')
      ctx.globalAlpha=pulse; ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(fx+GRID/2,fy+GRID/2, GRID*0.9,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1
      ctx.fillStyle='#ff2e6b'; ctx.shadowColor='#ff0055'; ctx.shadowBlur=16*pulse
      ctx.beginPath(); (ctx as any).roundRect(fx+5,fy+5,GRID-10,GRID-10,6); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(fx+GRID/2-3,fy+GRID/2-4,2,0,Math.PI*2); ctx.fill()
      // snake
      snake.forEach((s,i)=>{
        const x=s.x*GRID, y=s.y*GRID
        if(i===0){
          ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=16
          ctx.beginPath(); (ctx as any).roundRect(x+2,y+2,GRID-4,GRID-4,7); ctx.fill(); ctx.shadowBlur=0
          // direction indicator
          const nx = dir.x, ny=dir.y
          ctx.fillStyle='#003333'; ctx.beginPath(); ctx.arc(x+GRID/2 + nx*4, y+GRID/2 + ny*4, 2.2,0,Math.PI*2); ctx.fill()
          ctx.fillStyle='#001a1a'
          const eyeOff=GRID*0.22
          // eyes perpendicular to dir
          const ex = -ny, ey = nx
          ctx.beginPath(); ctx.arc(x+GRID/2 + ex*eyeOff*0.7 -2, y+GRID/2 + ey*eyeOff*0.7 -1.5, 2.2,0,Math.PI*2); ctx.fill()
          ctx.beginPath(); ctx.arc(x+GRID/2 - ex*eyeOff*0.7 -2, y+GRID/2 - ey*eyeOff*0.7 -1.5, 2.2,0,Math.PI*2); ctx.fill()
        }else{
          const t=i/snake.length
          const alpha=1 - t*0.62
          const hue = 175 - t*18
          ctx.fillStyle=`hsla(${hue},100%,55%,${alpha})`
          ctx.shadowColor=`hsla(${hue},100%,60%,0.55)`; ctx.shadowBlur=7
          ctx.beginPath(); (ctx as any).roundRect(x+3.2,y+3.2,GRID-6.4,GRID-6.4,5); ctx.fill(); ctx.shadowBlur=0
        }
      })
      particles.draw(ctx)
      // HUD level
      ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,22)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'
      ctx.fillText(`NIVEL ${levelL}`, 8,15)
      ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText(`VEL x${(9-speed).toFixed(1)}`, W-8,15)
      if(combo>1){
        ctx.fillStyle='#ffdd00'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'
        ctx.fillText(`COMBO x${combo}`, W/2, 15)
      }
      if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 24px Orbitron'; ctx.textAlign='center'; ctx.fillText('GAME OVER', W/2, H/2-10)
        ctx.fillStyle='#fff'; ctx.font='12px JetBrains Mono'; ctx.fillText(`Score ${scoreL}  Nivel ${levelL}`, W/2, H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px JetBrains Mono'; ctx.fillText('R para reiniciar', W/2, H/2+30)
      }else if(showPauseOverlay || paused){
        ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA', W/2, H/2)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='11px JetBrains Mono'; ctx.fillText('P para continuar', W/2, H/2+18)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const isStarted = isStartedRef.current
      if(isStarted===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }
      // handle input queue
      tick++
      if(tick % Math.max(3,speed) !==0){ draw(false); return }
      dir={...nextDir}
      const head={x:snake[0].x+dir.x, y:snake[0].y+dir.y}
      // wall hit
      if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){ gameOver=true; playTone(180,0.35,'sawtooth',0.18); return }
      if(obstacles.some(o=>o.x===head.x&&o.y===head.y)){ gameOver=true; playTone(140,0.45,'square',0.2); return }
      if(snake.some(s=>s.x===head.x&&s.y===head.y)){ gameOver=true; playTone(160,0.35,'sawtooth',0.18); return }
      snake.unshift(head)
      if(head.x===food.x && head.y===food.y){
        combo++
        const base=10, lvlBonus=levelL*2, comboBonus= combo>1 ? (combo-1)*6 : 0
        const pts=base+lvlBonus+comboBonus
        scoreL+=pts; scoreRef.current=scoreL; setScore(scoreL)
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_snake_best',scoreL); onScoreRef.current(scoreL) }
        // particles burst
        for(let i=0;i<14;i++) particles.push({x:food.x*GRID+GRID/2, y:food.y*GRID+GRID/2, vx:(Math.random()-0.5)*7, vy:(Math.random()-0.5)*7, life:1, c: combo>2?'#ffdd00':'#ff3366', size: 2.5+Math.random()*1.5})
        playTone(660+combo*48,0.14,'square',0.16)
        if(combo>3) playTone(880,0.18,'sine',0.12)
        // level up every 5 foods
        const newLevel = Math.floor(scoreL/50)+1
        if(newLevel!==levelL){ levelL=newLevel; setLevel(levelL); speed=Math.max(3, 7 - Math.floor(levelL*0.7)); genObstacles(); playTone(520,0.22,'triangle',0.18) }
        placeFood()
      }else{
        snake.pop(); combo=0 // reset combo if no eat
      }
      particles.update()
      draw(false)
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey)
      c.removeEventListener('touchstart', onTouchStart as any); c.removeEventListener('touchend', onTouchEnd as any)
      input.cleanup()
    }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-square" width={400} height={400}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between items-center">
          <span className="text-xs tracking-widest text-cyan-300 font-mono">SCORE</span>
          <span className="font-black text-xl text-white" style={{fontFamily:'Orbitron'}}>{score}</span>
        </div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]">
          <p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p>
        </div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm transition">REINICIAR [R]</button>
        <button onClick={()=>{
          const c=canvasRef.current; if(!c) return;
          // toggle paused via dispatching P key synthetic? Instead we toggle via ref hack: dispatch event
          window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))
        }} className="px-4 py-2 rounded-lg glass hover:bg-white/10 text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">WASD / Flechas / Swipe • Combo x{'>'}1 da bonus • Nivel cada 50pts • Obstáculos desde Niv3</p>
    </div>
  )
}
