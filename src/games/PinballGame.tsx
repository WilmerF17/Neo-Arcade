import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function PinballGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [best,setBest]=useState(()=> loadBest(bestKey('pinball'),0))
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,360,440)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, levelL=1, comboL=0, multiball=0
    let balls:{x:number,y:number,vx:number,vy:number,r:number,active:boolean}[]=[{x:W/2,y:H-64,vx:0,vy:0,r:7,active:true}]
    let flippers={ left:-0.42, right:0.42, leftT:0, rightT:0 }
    let bumpers:{x:number,y:number,r:number,hit:number, col:string}[]=[
      {x:110,y:120,r:18,hit:0,col:'#00ffff'},{x:250,y:138,r:22,hit:0,col:'#ff00ff'},{x:180,y:200,r:16,hit:0,col:'#ffdd00'},
      {x: 90,y:190,r:13,hit:0,col:'#00ff88'},{x:270,y:190,r:13,hit:0,col:'#ff6b35'}
    ]
    let lastHit=0
    const BK=bestKey('pinball')

    const launch=(x:number)=>{
      balls.forEach(b=>{ if(b.y>H-44){ b.vy=-11 - levelL*0.35; b.vx=(x-W/2)*0.045 + (Math.random()-0.5)*1.2; pool.push({x:b.x,y:b.y,vx:0,vy:1,life:1,c:'#ffffff',size:2}) } })
      playTone(520,0.12,'square',0.14)
    }

    const onKeyD=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='arrowleft'||k==='a') flippers.leftT=1
      if(k==='arrowright'||k==='d') flippers.rightT=1
      if(e.code==='Space'){ launch(W/2); if(balls.every(b=>b.y>H+20)) { balls=[{x:W/2,y:H-64,vx:0,vy:0,r:7,active:true}]; scoreL=0; comboL=0; setScore(0); setCombo(0) } }
    }
    const onKeyU=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='arrowleft'||k==='a') flippers.leftT=0
      if(k==='arrowright'||k==='d') flippers.rightT=0
    }
    window.addEventListener('keydown',onKeyD); window.addEventListener('keyup',onKeyU)

    const onDown=()=>{
      if(input.mouse.x<W/2) flippers.leftT=1; else flippers.rightT=1
      setTimeout(()=>{ flippers.leftT=0; flippers.rightT=0 },150)
      launch(input.mouse.x)
    }
    let wasDown=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused){
        frame++
        const targetL = flippers.leftT? 0.58 : -0.42
        const targetR = flippers.rightT? -0.58 : 0.42
        flippers.left += (targetL - flippers.left)*0.34
        flippers.right += (targetR - flippers.right)*0.34
        // input tap
        if(input.mouse.down && !wasDown) onDown()
        wasDown=input.mouse.down

        balls.forEach(ball=>{
          ball.vy+=0.38 + levelL*0.015; ball.x+=ball.vx; ball.y+=ball.vy
          ball.vx*=0.998
          if(ball.x-ball.r<8){ ball.x=8+ball.r; ball.vx*=-0.92; playTone(220,0.06,'square',0.06) }
          if(ball.x+ball.r>W-8){ ball.x=W-8-ball.r; ball.vx*=-0.92; playTone(220,0.06,'square',0.06) }
          if(ball.y-ball.r<8){ ball.y=8+ball.r; ball.vy*=-0.92 }
          // bumpers RGB
          bumpers.forEach(b=>{
            const dx=ball.x-b.x, dy=ball.y-b.y, d=Math.hypot(dx,dy)
            if(d< ball.r+b.r){
              const nx=dx/d, ny=dy/d
              ball.vx = nx*(6.2+levelL*0.2); ball.vy = ny*(6.2+levelL*0.2)
              b.hit=14
              const now=frame
              if(now-lastHit<28) comboL++; else comboL=1
              lastHit=now
              const pts= 25 + comboL*6 + levelL*3
              scoreL+=pts; if(multiball) scoreL+= pts
              setScore(scoreL); setCombo(comboL)
              if(frame% 180===0 && comboL>3 && balls.length<3){ // multiball trigger
                balls.push({x:W/2, y:H/2, vx:(Math.random()-0.5)*5, vy:-5, r:7, active:true}); multiball=1
                playTone(880,0.28,'square',0.16)
              } else playTone( 440 + (['#00ffff','#ff00ff','#ffdd00'].indexOf(b.col)>=0? 120:0),0.09,'square',0.13)
              for(let i=0;i<7;i++) pool.push({x:b.x,y:b.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:b.col,size:2.8})
              if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)}
              if(scoreL> levelL*320){ levelL++; setLevel(levelL); bumpers.forEach(bb=> bb.r=Math.max(10, bb.r-0.3)) }
            }
            if(b.hit>0) b.hit--
          })
          // flippers
          const leftX=88, leftY=H-60
          const rightX=W-88, rightY=H-60
          const lx = leftX + Math.cos(flippers.left)*50
          const ly = leftY + Math.sin(flippers.left)*7
          if(Math.hypot(ball.x-lx, ball.y-ly)<23 && ball.vy>0){
            ball.vy=-8.2 - Math.abs(flippers.left)*5 - levelL*0.18
            ball.vx+=(Math.random()-0.5)*3 + Math.cos(flippers.left)*2
            scoreL+= 8 + comboL*2; setScore(scoreL); playTone(660,0.07,'sine',0.11)
          }
          const rx = rightX + Math.cos(flippers.right)*50
          const ry = rightY + Math.sin(flippers.right)*7
          if(Math.hypot(ball.x-rx, ball.y-ry)<23 && ball.vy>0){
            ball.vy=-8.2 - Math.abs(flippers.right)*5 - levelL*0.18
            ball.vx+=(Math.random()-0.5)*3 + Math.cos(flippers.right)*2
            scoreL+= 8 + comboL*2; setScore(scoreL); playTone(660,0.07,'sine',0.11)
          }
        })
        // drain - keep at least one ball logic
        balls=balls.filter(b=> b.y < H+30)
        if(balls.length===0){
          if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)}
          comboL=0; multiball=0; setCombo(0)
          balls=[{x:W/2,y:H-64,vx:0,vy:0,r:7,active:true}]
          scoreL=Math.max(0, scoreL- Math.floor(scoreL*0.08))
          setScore(scoreL)
          for(let i=0;i<12;i++) pool.push({x:W/2,y:H-40,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7-1,life:1,c:'#ff3355',size:2.6})
        }
        // decay combo if idle
        if(frame-lastHit>140) { comboL=0; if(frame%30===0) setCombo(0) }
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.06)'; for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke()}
      // walls with neon
      ctx.strokeStyle='rgba(0,255,255,0.16)'; ctx.lineWidth=7; ctx.strokeRect(4,4,W-8,H-8)
      ctx.strokeStyle='rgba(255,0,255,0.10)'; ctx.lineWidth=2; ctx.strokeRect(9,9,W-18,H-18)
      // ramp decoration
      ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.beginPath(); ctx.moveTo(40, H-110); ctx.lineTo(W-40, H-110); ctx.lineTo(W-12, H-18); ctx.lineTo(12, H-18); ctx.closePath(); ctx.fill()
      bumpers.forEach(b=>{
        const pulse=b.hit>0? 1.22:1
        ctx.save(); ctx.translate(b.x,b.y); ctx.scale(pulse,pulse)
        ctx.fillStyle=b.hit>0?'#ffffff': b.col; ctx.shadowColor=b.col; ctx.shadowBlur=b.hit>0?20:12
        ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(2,3,b.r*0.55,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(-2,-2,b.r*0.18,0,Math.PI*2); ctx.fill()
        ctx.restore()
      })
      // flippers RGB
      ctx.save(); ctx.translate(88,H-60); ctx.rotate(flippers.left)
      ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=14
      ctx.beginPath(); (ctx as any).roundRect(0,-7,52,13,7); ctx.fill(); ctx.shadowBlur=0; ctx.restore()
      ctx.save(); ctx.translate(W-88,H-60); ctx.rotate(flippers.right)
      ctx.fillStyle='#ff00ff'; ctx.shadowColor='#ff00ff'; ctx.shadowBlur=14
      ctx.beginPath(); (ctx as any).roundRect(-52,-7,52,13,7); ctx.fill(); ctx.shadowBlur=0; ctx.restore()
      // pivot dots
      ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(88,H-60,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(W-88,H-60,3,0,Math.PI*2); ctx.fill()
      // balls
      balls.forEach(ball=>{
        ctx.fillStyle='#ffffff'; ctx.shadowColor='#ffffff'; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(ball.x-1.5,ball.y-1.5,2,0,Math.PI*2); ctx.fill()
      })
      // trail for fastest ball
      if(balls[0]){
        ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(balls[0].x,balls[0].y,10,0,Math.PI*2); ctx.stroke()
      }
      pool.draw(ctx)
      // combo text
      if(comboL>2){
        ctx.fillStyle='#ffdd00'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=8; ctx.fillText(`${comboL}x COMBO${multiball?' MULTIBALL!':''}`,W/2, 18); ctx.shadowBlur=0
      }
      // launch hint
      if(balls.some(b=>b.y>H-44)){
        ctx.fillStyle='rgba(255,255,255,0.62)'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('ESPACIO / CLICK LANZAR • A/D FLIPPERS',W/2,H-12)
      }
      if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKeyD); window.removeEventListener('keyup',onKeyU); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[6/7]" width={360} height={440}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono" style={{color: combo>3?'#ffdd00':'#fff'}}>x{combo} Lv{level}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Bumpers RGB + impulso • Multiball • Combos por hits rápidos</p>
    </div>
  )
}
