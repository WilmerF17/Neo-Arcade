import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function SnakeUltraGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_snakeultra_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,400,400)
    const GRID=20, COLS=20, ROWS=20
    const particles=createParticlePool(64)
    const input=createInput(c,W,H)

    let snake:{x:number,y:number}[]=[{x:10,y:10},{x:9,y:10},{x:8,y:10}]
    let dir={x:1,y:0}, nextDir={x:1,y:0}
    let food={x:15,y:10}
    let walls:{x:number,y:number}[]=[]
    let movingWalls:{x:number,y:number,vx:number,vy:number}[]=[]
    let portals:{a:{x:number,y:number},b:{x:number,y:number}}|null=null
    let wrapOn=false // toggle with O
    let scoreL=0, levelL=1, combo=0, tick=0
    let speed=5 // frames per move - 30% faster than Snake (Snake=7 -> 5)
    let baseSpeed=5
    let gameOver=false, paused=false
    let raf=0
    let touchStart={x:0,y:0}
    let wallTimer=0
    let foodPulse=0

    const placeFood=()=>{
      let p:{x:number,y:number}, tries=0
      do{
        p={x:Math.floor(Math.random()*COLS), y:Math.floor(Math.random()*ROWS)}
        tries++
      }while((snake.some(s=>s.x===p.x&&s.y===p.y) || walls.some(w=>w.x===p.x&&w.y===p.y) || movingWalls.some(w=>w.x===p.x&&w.y===p.y) || (portals && (portals.a.x===p.x&&portals.a.y===p.y || portals.b.x===p.x&&portals.b.y===p.y))) && tries<140)
      food=p
    }
    const genWalls=()=>{
      walls=[]
      movingWalls=[]
      const staticCount = Math.min(16, (levelL-1)*2 + Math.floor(levelL/2))
      for(let i=0;i<staticCount;i++){
        let ox:number,oy:number,tries=0
        do{ ox=Math.floor(Math.random()*COLS); oy=Math.floor(Math.random()*ROWS); tries++ }while((snake.some(s=>Math.abs(s.x-ox)+Math.abs(s.y-oy)<3) || (Math.abs(ox-food.x)+Math.abs(oy-food.y)<2)) && tries<80)
        walls.push({x:ox!,y:oy!})
      }
      // dynamic obstacles from lvl3
      if(levelL>=3){
        const dynCount=Math.min(4, levelL-2)
        for(let i=0;i<dynCount;i++){
          let ox=Math.floor(Math.random()*(COLS-2))+1, oy=Math.floor(Math.random()*(ROWS-2))+1
          if(walls.some(w=>w.x===ox&&w.y===oy)) continue
          movingWalls.push({x:ox,y:oy, vx: Math.random()>0.5?1:-1, vy: Math.random()>0.5?1:-1})
          if(Math.random()>0.5) movingWalls[movingWalls.length-1].vx=0
          else movingWalls[movingWalls.length-1].vy=0
        }
      }
      // portals every 2 levels from lvl2
      if(levelL>=2 && levelL%2===0){
        const ax=Math.floor(Math.random()*COLS), ay=Math.floor(Math.random()*ROWS)
        let bx:number,by:number,tries=0
        do{ bx=Math.floor(Math.random()*COLS); by=Math.floor(Math.random()*ROWS); tries++ }while((Math.abs(bx-ax)+Math.abs(by-ay)<6 || walls.some(w=>w.x===bx&&w.y===by)) && tries<60)
        portals={a:{x:ax,y:ay}, b:{x:bx!,y:by!}}
      } else if(levelL%2!==0) portals=null
    }
    const reset=()=>{
      snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}]
      dir={x:1,y:0}; nextDir={x:1,y:0}
      scoreL=0; levelL=1; combo=0; tick=0; wallTimer=0
      baseSpeed=5; speed=5; gameOver=false; paused=false
      wrapOn=false
      particles.clear()
      placeFood(); genWalls()
      setScore(0); setLevel(1)
    }
    resetRef.current=reset
    placeFood(); genWalls()

    const onTouchStart=(e:TouchEvent)=>{ touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY} }
    const onTouchEnd=(e:TouchEvent)=>{
      const dx=e.changedTouches[0].clientX-touchStart.x
      const dy=e.changedTouches[0].clientY-touchStart.y
      if(Math.abs(dx)<18&&Math.abs(dy)<18) return
      const cur=dir
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>0&&cur.x===0) nextDir={x:1,y:0}
        else if(dx<0&&cur.x===0) nextDir={x:-1,y:0}
      }else{
        if(dy>0&&cur.y===0) nextDir={x:0,y:1}
        else if(dy<0&&cur.y===0) nextDir={x:0,y:-1}
      }
    }
    c.addEventListener('touchstart', onTouchStart as any, {passive:true} as any)
    c.addEventListener('touchend', onTouchEnd as any)

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p' || k===' '){ if(!gameOver) paused=!paused; return }
      if(k==='o'){ wrapOn=!wrapOn; playTone(wrapOn?740:320,0.12,'sine',0.14); return }
      const cur=dir
      if((k==='arrowup'||k==='w')&&cur.y===0) nextDir={x:0,y:-1}
      if((k==='arrowdown'||k==='s')&&cur.y===0) nextDir={x:0,y:1}
      if((k==='arrowleft'||k==='a')&&cur.x===0) nextDir={x:-1,y:0}
      if((k==='arrowright'||k==='d')&&cur.x===0) nextDir={x:1,y:0}
    }
    window.addEventListener('keydown', onKey)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let i=0;i<=COLS;i++){ ctx.beginPath(); ctx.moveTo(i*GRID,0); ctx.lineTo(i*GRID,H); ctx.stroke() }
      for(let i=0;i<=ROWS;i++){ ctx.beginPath(); ctx.moveTo(0,i*GRID); ctx.lineTo(W,i*GRID); ctx.stroke() }
      if(wrapOn){
        ctx.strokeStyle='rgba(255,0,255,0.14)'; ctx.setLineDash([6,6]); ctx.strokeRect(1,1,W-2,H-2); ctx.setLineDash([])
        ctx.fillStyle='rgba(255,0,255,0.08)'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('PORTAL WRAP ON', W/2, 12)
      }
      for(const w of walls){
        ctx.fillStyle='rgba(255,60,120,0.18)'; ctx.strokeStyle='rgba(255,60,120,0.6)'; ctx.lineWidth=1.2
        ctx.beginPath(); (ctx as any).roundRect(w.x*GRID+2,w.y*GRID+2,GRID-4,GRID-4,5); ctx.fill(); ctx.stroke()
        ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(w.x*GRID+6,w.y*GRID+6,GRID-12,3)
      }
      for(const w of movingWalls){
        ctx.fillStyle='rgba(255,221,0,0.22)'; ctx.strokeStyle='#ffdd00'; ctx.lineWidth=1.4
        ctx.beginPath(); (ctx as any).roundRect(w.x*GRID+2,w.y*GRID+2,GRID-4,GRID-4,7); ctx.fill(); ctx.stroke()
        ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.arc(w.x*GRID+GRID/2, w.y*GRID+GRID/2, 2,0,Math.PI*2); ctx.fill()
      }
      if(portals){
        const drawPortal=(p:{x:number,y:number},col:string)=>{
          ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=14
          ctx.beginPath(); (ctx as any).roundRect(p.x*GRID+1,p.y*GRID+1,GRID-2,GRID-2,8); ctx.fill(); ctx.shadowBlur=0
          ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.fillText('◉',p.x*GRID+GRID/2,p.y*GRID+GRID/2+4)
        }
        drawPortal(portals.a,'#00ffff'); drawPortal(portals.b,'#ff00ff')
        ctx.strokeStyle='rgba(0,255,255,0.18)'; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(portals.a.x*GRID+GRID/2,portals.a.y*GRID+GRID/2); ctx.lineTo(portals.b.x*GRID+GRID/2,portals.b.y*GRID+GRID/2); ctx.stroke(); ctx.setLineDash([])
      }
      foodPulse+=0.14
      const pulse=0.82+Math.sin(foodPulse)*0.18
      const fx=food.x*GRID, fy=food.y*GRID
      const grad=ctx.createRadialGradient(fx+GRID/2,fy+GRID/2,2,fx+GRID/2,fy+GRID/2,GRID*0.95)
      grad.addColorStop(0,'#ffdd00'); grad.addColorStop(1,'rgba(255,221,0,0)')
      ctx.globalAlpha=pulse; ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(fx+GRID/2,fy+GRID/2,GRID*0.9,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1
      ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=14*pulse
      ctx.beginPath(); (ctx as any).roundRect(fx+4,fy+4,GRID-8,GRID-8,7); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(fx+GRID/2+2,fy+GRID/2+2,2,0,Math.PI*2); ctx.fill()

      snake.forEach((s,i)=>{
        const x=s.x*GRID,y=s.y*GRID
        if(i===0){
          ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=16
          ctx.beginPath(); (ctx as any).roundRect(x+2,y+2,GRID-4,GRID-4,7); ctx.fill(); ctx.shadowBlur=0
          const nx=dir.x, ny=dir.y
          ctx.fillStyle='#003333'; ctx.beginPath(); ctx.arc(x+GRID/2+nx*4,y+GRID/2+ny*4,2.2,0,Math.PI*2); ctx.fill()
          const ex=-ny, ey=nx
          ctx.fillStyle='#001a1a'
          ctx.beginPath(); ctx.arc(x+GRID/2+ex*5,y+GRID/2+ey*5,1.9,0,Math.PI*2); ctx.fill()
          ctx.beginPath(); ctx.arc(x+GRID/2-ex*5,y+GRID/2-ey*5,1.9,0,Math.PI*2); ctx.fill()
        }else{
          const t=i/snake.length
          const h=185 - t*28
          ctx.fillStyle=`hsla(${h},100%,58%,${1-t*0.58})`
          ctx.shadowColor=`hsla(${h},100%,60%,0.5)`; ctx.shadowBlur=6
          ctx.beginPath(); (ctx as any).roundRect(x+3.2,y+3.2,GRID-6.4,GRID-6.4,5); ctx.fill(); ctx.shadowBlur=0
        }
      })
      particles.draw(ctx)
      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,22)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL} ${wrapOn?'◉WRAP':''}`,8,15)
      ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.62)'; ctx.fillText(`VEL x${(7-speed).toFixed(1)}`,W-8,15)
      if(combo>1){ ctx.fillStyle='#ffdd00'; ctx.font='900 11px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=8; ctx.fillText(`COMBO x${combo}`,W/2,15); ctx.shadowBlur=0 }
      if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 24px Orbitron'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='12px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px JetBrains Mono'; ctx.fillText('R para reiniciar — O para wrap',W/2,H/2+30)
      } else if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='11px JetBrains Mono'; ctx.fillText('P para continuar',W/2,H/2+18)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }
      // mover muros dinámicos cada 18 ticks
      wallTimer++
      if(wallTimer%18===0){
        for(const w of movingWalls){
          const nx=w.x+w.vx, ny=w.y+w.vy
          if(nx<0||nx>=COLS||walls.some(o=>o.x===nx&&o.y===w.y)||snake.some(s=>s.x===nx&&s.y===w.y)) w.vx*=-1
          else w.x=nx
          if(ny<0||ny>=ROWS||walls.some(o=>o.x===w.x&&o.y===ny)||snake.some(s=>s.x===w.x&&s.y===ny)) w.vy*=-1
          else w.y=ny
        }
        // check if moving wall hits head instantly -> game over next tick handled
      }
      tick++
      if(tick % Math.max(2,speed)!==0){ draw(false); return }
      dir={...nextDir}
      let head={x:snake[0].x+dir.x, y:snake[0].y+dir.y}
      // portal teleport
      if(portals){
        if(head.x===portals.a.x&&head.y===portals.a.y){ head={...portals.b}; playTone(880,0.12,'sine',0.14) }
        else if(head.x===portals.b.x&&head.y===portals.b.y){ head={...portals.a}; playTone(880,0.12,'sine',0.14) }
      }
      if(wrapOn){
        if(head.x<0) head.x=COLS-1
        if(head.x>=COLS) head.x=0
        if(head.y<0) head.y=ROWS-1
        if(head.y>=ROWS) head.y=0
      } else {
        if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){ gameOver=true; playTone(160,0.35,'sawtooth',0.18); return }
      }
      if(walls.some(o=>o.x===head.x&&o.y===head.y) || movingWalls.some(o=>o.x===head.x&&o.y===head.y)){ gameOver=true; playTone(140,0.4,'square',0.2); return }
      if(snake.some(s=>s.x===head.x&&s.y===head.y)){ gameOver=true; playTone(160,0.35,'sawtooth',0.18); return }
      snake.unshift(head)
      if(head.x===food.x&&head.y===food.y){
        combo++
        const base=15, lvlBonus=levelL*3, comboBonus= combo>1?(combo-1)*8:0
        const pts=base+lvlBonus+comboBonus
        scoreL+=pts; setScore(scoreL)
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_snakeultra_best',scoreL); onScoreRef.current(scoreL) }
        for(let i=0;i<14;i++) particles.push({x:food.x*GRID+GRID/2, y:food.y*GRID+GRID/2, vx:(Math.random()-0.5)*7, vy:(Math.random()-0.5)*7, life:1, c: combo>2?'#ffdd00':'#00ff88', size:2.6+Math.random()*1.4})
        playTone(700+combo*42,0.14,'square',0.15)
        if(combo>3) playTone(900,0.16,'sine',0.12)
        const newLevel=Math.floor(scoreL/80)+1
        if(newLevel!==levelL){ levelL=newLevel; setLevel(levelL); baseSpeed=Math.max(2, 5 - Math.floor(levelL*0.55)); speed=Math.max(2, baseSpeed); genWalls(); playTone(520,0.22,'triangle',0.18) }
        // speed slight ramp per food
        speed=Math.max(2, baseSpeed - Math.floor(snake.length/14))
        placeFood()
      } else { snake.pop(); combo=0 }
      particles.update()
      draw(false)
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown',onKey)
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
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass hover:bg-white/10 text-cyan-200 font-bold text-sm">⏯ [P]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'o'}))} className="px-3 py-2 rounded-lg glass hover:bg-white/10 text-fuchsia-200 font-bold text-xs">◉ WRAP [O]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">WASD/Flechas • Portal cada 2 niveles • Muros dinámicos • 30% más rápido • O activa wrap</p>
    </div>
  )
}
