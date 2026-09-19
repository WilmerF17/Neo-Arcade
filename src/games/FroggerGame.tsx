import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function FroggerGame({onScore, isStarted}:{onScore:(s:number)=>void,isStarted?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_frogger_best'))
  const [livesUI,setLivesUI]=useState(3)
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{
    const c=canvasRef.current!; const {ctx,W,H}=setupCanvas(c,400,380)
    const particles=createParticlePool(48)
    const input=createInput(c,W,H)
    let raf=0, scoreL=0, level=1, gameOver=false
    let frog={x:W/2,y:H-22,w:16,h:16}
    let lives=3, invuln=0, moveCooldown=0, goalFlash=0
    let cars:{x:number,y:number,w:number,h:number,vx:number,c:string}[]=[]
    let logs:{x:number,y:number,w:number,vx:number}[]=[]
    let frame=0, last=performance.now(), shake=0
    const lanes=[
      {y:H-68, vx:1.9, c:'#ff3355'},
      {y:H-102, vx:-2.35, c:'#00ffff'},
      {y:H-136, vx:2.7, c:'#ffdd00'},
      {y:H-212, vx:2.35, c:'#8a2be2'},
      {y:H-252, vx:-2.05, c:'#00ff88'},
    ]
    const resetFrog=(withInvuln=true)=>{
      frog.x=W/2; frog.y=H-22
      if(withInvuln) invuln=68
    }
    const spawn=()=>{
      lanes.slice(0,3).forEach(l=>{
        const prob= 0.018 + level*0.002
        if(Math.random()<prob){
          const w=32+Math.random()*16
          cars.push({x: l.vx>0? -44: W+44, y:l.y-9, w, h:16, vx: l.vx + level*0.10 + (Math.random()-0.5)*0.3, c:l.c})
        }
      })
      lanes.slice(3).forEach(l=>{
        const prob=0.012 + level*0.001
        if(Math.random()<prob){
          const w=62+Math.random()*34
          logs.push({x: l.vx>0? -86: W+86, y:l.y, w, vx: l.vx + (level-1)*0.08 })
        }
      })
    }
    const doMove=(dx:number,dy:number)=>{
      if(moveCooldown>0||gameOver) return
      if(isStartedRef.current===false) return
      const nx=Math.max(10,Math.min(W-10,frog.x+dx))
      const ny=Math.max(14,Math.min(H-14,frog.y+dy))
      // precision: step sizes
      frog.x=nx; frog.y=ny
      moveCooldown=7
      playTone(520,0.05,'sine',0.09)
      if(ny<30){
        scoreL+=100*level
        setScore(scoreL)
        if(scoreL>bestRef.current) onScoreRef.current(scoreL)
        goalFlash=22
        for(let i=0;i<10;i++) particles.push({x:W/2,y:20,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5-0.6,life:1,c:'#00ff88',size:3})
        playTone(880,0.18,'square',0.16)
        // level progression
        if(Math.floor(scoreL/300)+1 !== level){
          level=Math.floor(scoreL/300)+1
          playTone(1040,0.22,'triangle',0.16)
        }
        resetFrog()
      }
    }
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='w'||k==='arrowup') doMove(0,-34)
      if(k==='s'||k==='arrowdown') doMove(0,34)
      if(k==='a'||k==='arrowleft') doMove(-28,0)
      if(k==='d'||k==='arrowright') doMove(28,0)
      if(k==='r' && lives<=0){ lives=3; setLivesUI(3); scoreL=0; level=1; frog.x=W/2; frog.y=H-22; cars=[]; logs=[]; particles.clear(); setScore(0); gameOver=false; playTone(640,0.12,'square',0.14) }
    }
    window.addEventListener('keydown', onKey)
    // touch swipe
    let touchStart:{x:number,y:number}|null=null
    const onTouchStart=(e:TouchEvent)=>{
      const t=e.touches[0]
      const rect=c.getBoundingClientRect()
      const x=(t.clientX-rect.left)*(W/rect.width), y=(t.clientY-rect.top)*(H/rect.height)
      touchStart={x,y}
    }
    const onTouchEnd=(e:TouchEvent)=>{
      if(!touchStart) return
      const t=e.changedTouches[0]
      const rect=c.getBoundingClientRect()
      const x=(t.clientX-rect.left)*(W/rect.width), y=(t.clientY-rect.top)*(H/rect.height)
      const dx=x-touchStart.x, dy=y-touchStart.y
      if(Math.abs(dx)<10 && Math.abs(dy)<10){
        // tap: decide direction by quadrant relative to frog -> nearest screen half
        if(y<100) doMove(0,-34)
        else if(y>H-70) doMove(0,34)
        else if(x<W/2) doMove(-28,0)
        else doMove(28,0)
      } else if(Math.abs(dx)>Math.abs(dy)){
        doMove(Math.sign(dx)*28,0)
      } else {
        doMove(0,Math.sign(dy)*34)
      }
      touchStart=null
      if(gameOver){ lives=3; setLivesUI(3); scoreL=0; level=1; cars=[]; logs=[]; particles.clear(); setScore(0); gameOver=false; resetFrog(false) }
    }
    c.addEventListener('touchstart', onTouchStart as any, {passive:true} as any)
    window.addEventListener('touchend', onTouchEnd as any)
    // mouse click to move toward click
    const onClick=(e:MouseEvent)=>{
      if(gameOver){ lives=3; setLivesUI(3); scoreL=0; level=1; cars=[]; logs=[]; particles.clear(); setScore(0); gameOver=false; resetFrog(false); return }
      const rect=c.getBoundingClientRect()
      const x=(e.clientX-rect.left)*(W/rect.width), y=(e.clientY-rect.top)*(H/rect.height)
      const dx=x-frog.x, dy=y-frog.y
      if(Math.abs(dx)>Math.abs(dy)) doMove(Math.sign(dx)*28,0)
      else doMove(0,Math.sign(dy)*34)
    }
    c.addEventListener('mousedown', onClick)
    const loseLife=()=>{
      lives--; setLivesUI(lives)
      shake=5
      invuln=68
      for(let i=0;i<10;i++) particles.push({x:frog.x,y:frog.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6-0.6,life:1,c: lives<=0?'#ff3355':'#00aaff',size:2.8})
      playTone(160,0.26,'sawtooth',0.16)
      if(lives<=0){
        gameOver=true
        if(scoreL>bestRef.current){ saveBest('neo_frogger_best',scoreL); setBest(scoreL); bestRef.current=scoreL }
        onScoreRef.current(scoreL)
      } else {
        resetFrog()
      }
    }
    const update=()=>{
      const now=performance.now()
      const dt=Math.min(32, now-last)/16.66
      last=now
      if(isStartedRef.current===false) return
      if(gameOver) return
      frame++
      if(moveCooldown>0) moveCooldown-=dt
      if(invuln>0) invuln-=dt
      if(goalFlash>0) goalFlash-=dt
      if(shake>0) shake-=0.15*dt
      // input via createInput as well: push move with debounce
      const keys=input.keys
      if(keys['arrowup']||keys['w']){ doMove(0,-34); keys['arrowup']=false; keys['w']=false }
      else if(keys['arrowdown']||keys['s']){ doMove(0,34); keys['arrowdown']=false; keys['s']=false }
      else if(keys['arrowleft']||keys['a']){ doMove(-28,0); keys['arrowleft']=false; keys['a']=false }
      else if(keys['arrowright']||keys['d']){ doMove(28,0); keys['arrowright']=false; keys['d']=false }
      spawn()
      for(const o of cars) o.x+=o.vx*dt
      for(const l of logs) l.x+=l.vx*dt
      cars=cars.filter(o=> o.x>-70 && o.x<W+70)
      logs=logs.filter(l=> l.x>-120 && l.x<W+120)
      // road collision: need precise AABB with rounded cars
      const onRoad = frog.y>H-168 && frog.y>H-152-50? true: frog.y>H-168
      // logically: y between H-168 and H-40 is road area
      const isOnRoad = frog.y>H-155 && frog.y< H-38
      if(isOnRoad && invuln<=0){
        for(const car of cars){
          // precise: frog radius 9, car rect
          if(Math.abs(frog.x - (car.x+car.w/2)) < car.w/2 + 7 && Math.abs(frog.y - (car.y+8)) < 9){
            loseLife()
            break
          }
        }
      }
      // river logic
      const onRiver = frog.y<=H-160 && frog.y>=34
      if(onRiver && invuln<=0){
        let onLog=false
        for(const log of logs){
          if(frog.x>log.x+6 && frog.x<log.x+log.w-6 && Math.abs(frog.y - (log.y+7))<10){
            onLog=true
            frog.x+=log.vx*0.92*dt
            // clamp to not be pushed out without drowning? if pushed off screen, drown
            if(frog.x<6||frog.x>W-6){
              loseLife()
              break
            }
            break
          }
        }
        if(!onLog){
          // drown
          loseLife()
        }
      }
      // keep frog inside
      frog.x=Math.max(9,Math.min(W-9,frog.x))
      frog.y=Math.max(12,Math.min(H-12,frog.y))
      particles.update()
    }
    const draw=(paused:boolean)=>{
      ctx.save()
      if(shake>0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake)
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid
      ctx.strokeStyle='rgba(0,255,255,0.03)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      // goal area
      ctx.fillStyle= goalFlash>0? `rgba(0,255,136,${0.18+goalFlash*0.01})`:'rgba(0,255,136,0.12)'; ctx.fillRect(0,0,W,34)
      ctx.fillStyle='#00ff88'; ctx.font='10px JetBrains Mono'; ctx.textAlign='center'
      ctx.shadowColor='#00ff88'; ctx.shadowBlur= goalFlash>0?10:0
      ctx.fillText(`META • +${100*level}  NIVEL ${level}`,W/2,21); ctx.shadowBlur=0
      if(goalFlash>0){
        ctx.fillStyle=`rgba(0,255,136,${goalFlash*0.04})`; ctx.fillRect(0,0,W,34)
      }
      // river
      ctx.fillStyle='#0a1a3a'; ctx.fillRect(0,34,W, H-168-34)
      // water animation
      ctx.strokeStyle='rgba(0,170,255,0.14)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=18){
        const off=(x*0.7 + frame*0.38)%18
        ctx.beginPath(); ctx.moveTo((x+frame*0.32)%W, 58+ Math.sin(x*0.2+frame*0.06)*3); ctx.lineTo((x+frame*0.32)%W+8, 68+ Math.cos(x*0.15+frame*0.05)*2); ctx.stroke()
      }
      // river banks
      ctx.fillStyle='#12203a'; ctx.fillRect(0,34,W,3); ctx.fillRect(0,H-168-3,W,3)
      // road
      ctx.fillStyle='#1a1a1e'; ctx.fillRect(0,H-168,W,112)
      ctx.strokeStyle='rgba(255,221,0,0.95)'; ctx.setLineDash([12,12]); ctx.lineDashOffset= -frame*0.5; ctx.beginPath(); ctx.moveTo(0,H-122); ctx.lineTo(W,H-122); ctx.stroke()
      ctx.strokeStyle='rgba(255,255,255,0.92)'; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(0,H-88); ctx.lineTo(W,H-88); ctx.stroke()
      // safe zones
      ctx.fillStyle='rgba(0,255,136,0.06)'; ctx.fillRect(0,H-168+112,W, H-(H-168+112))
      // logs
      for(const l of logs){
        ctx.fillStyle='#6b4a2a'; ctx.shadowColor='#8a5a2a'; ctx.shadowBlur=6
        ctx.beginPath(); (ctx as any).roundRect(l.x,l.y, l.w,14,6); ctx.fill(); ctx.shadowBlur=0
        // wood lines
        ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1; for(let i=1;i<3;i++){ ctx.beginPath(); ctx.moveTo(l.x+6, l.y+4*i); ctx.lineTo(l.x+l.w-6, l.y+4*i); ctx.stroke() }
      }
      // cars with precise rect
      for(const car of cars){
        ctx.fillStyle=car.c; ctx.shadowColor=car.c; ctx.shadowBlur=8
        ctx.beginPath(); (ctx as any).roundRect(car.x,car.y,car.w,car.h,4); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillRect(car.x+4,car.y+3, car.w-8,4)
        ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(car.x+3,car.y+11, car.w-6,2)
        // headlights
        const hx= car.vx>0? car.x+car.w-2: car.x+2
        ctx.fillStyle='#fff3aa'; ctx.beginPath(); ctx.arc(hx, car.y+8, 2.5,0,Math.PI*2); ctx.fill()
      }
      // frog with invuln blink
      const blink= invuln>0 && Math.floor(invuln/6)%2===0
      if(!blink || invuln<=0){
        ctx.save(); ctx.translate(frog.x,frog.y)
        ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=12
        ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#003311'; ctx.beginPath(); ctx.arc(-3,-2,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-2,2,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-3,-3,0.9,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3,-3,0.9,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#ff6b35'; ctx.beginPath(); ctx.ellipse(0,5,4,2,0,0,Math.PI*2); ctx.fill()
        if(invuln>0){ ctx.strokeStyle='rgba(0,255,136,0.85)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke() }
        ctx.restore()
      }
      particles.draw(ctx)
      // lives
      // level display
      ctx.fillStyle='rgba(255,255,255,0.54)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='left'
      ctx.fillText(`NIVEL ${level}`, 10, H-12)
      if(paused){
        ctx.fillStyle='rgba(8,10,20,0.74)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ff88'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=12; ctx.fillText('PAUSA',W/2,H/2-6); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.78)'; ctx.font='11px JetBrains Mono'; ctx.fillText('WASD / Flechas / Click / Swipe',W/2,H/2+14)
        ctx.fillText('Carretera = esquiva • Río = sube a troncos',W/2,H/2+28)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=12; ctx.fillText('GAME OVER',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 12px JetBrains Mono'; ctx.fillText(`SCORE ${scoreL}  NIVEL ${level}`,W/2,H/2+10)
        ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='11px JetBrains Mono'; ctx.fillText('R / Click / Swipe para reiniciar',W/2,H/2+26)
      }
      ctx.restore()
    }
    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(true); return }
      if(gameOver){ draw(false); return }
      update(); draw(false)
    }
    loop()
    return()=>{ cancelAnimationFrame(raf); input.cleanup(); window.removeEventListener('keydown', onKey); window.removeEventListener('touchend', onTouchEnd as any); c.removeEventListener('mousedown', onClick); c.removeEventListener('touchstart', onTouchStart as any)}
  },[])
   return <div className="flex flex-col items-center gap-3 w-full max-w-[400px]"><canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[20/19]"/><div className="flex gap-2 w-full"><div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-emerald-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div><div className="glass rounded-lg px-3 py-2 flex items-center gap-1">{Array.from({length:3}).map((_,i)=><span key={i} className={`w-2.5 h-2.5 rounded-full ${i<livesUI?'bg-emerald-400 shadow-[0_0_8px_#00ff88]':'bg-white/10'}`} />) }<span className="ml-1 text-xs font-mono text-white/60">VIDAS</span></div><div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div></div><p className="text-[11px] text-white/50 font-mono">WASD/Flechas/Click/Swipe • Troncos + precisión AABB + niveles</p></div>
}
