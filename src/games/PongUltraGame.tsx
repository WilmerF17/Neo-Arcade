import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function PongUltraGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_pongultra_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,480,360)
    const particles=createParticlePool(80)
    const input=createInput(c,W,H)
    let raf=0
    let scoreL=0, levelL=1, hits=0
    let gameOver=false, paused=false
    const PW=12, PH=86, PH_EXPAND=122
    let p1={x:18,y:H/2-PH/2,h:PH, vy:0, expandTimer:0}
    let p2={x:W-30,y:H/2-PH/2,h:PH, vy:0, expandTimer:0}
    type Ball={x:number,y:number,vx:number,vy:number,r:number,trail:{x:number,y:number}[]}
    let balls:Ball[]=[{x:W/2,y:H/2,vx:4.6,vy:2.8,r:8,trail:[]}]
    let baseSpeed=4.6
    type Power={x:number,y:number,vy:number,kind:'expand'|'slow'|'multi'|'laser',t:number,alive:boolean}
    let powers:Power[]=[]
    let slowTimer=0
    let laserTimer=0 // p1 laser enabled
    let lasers:{x:number,y:number,vy:number,alive:boolean}[]=[]
    let hitFlash=0

    const emit=(x:number,y:number,col:string,n=7)=>{ for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:col,size:2.4+Math.random()*1.6}) }

    const resetBall=(dir:number)=>{
      balls=[{x:W/2,y:H/2,vx:dir*(baseSpeed + levelL*0.35),vy:(Math.random()-0.5)*3.6,r:8,trail:[]}]
    }
    const maybePower=()=>{
      if(Math.random()<0.012 && powers.length<2){
        const kinds:Power['kind'][]=['expand','slow','multi','laser']
        const kind=kinds[Math.floor(Math.random()*4)]
        powers.push({x:W/2+(Math.random()-0.5)*80,y:28,vy:1.6+Math.random()*1.2,kind,t:420,alive:true})
      }
    }
    const levelUp=()=>{
      levelL++; setLevel(levelL)
      baseSpeed=Math.min(8.4, 4.6+levelL*0.42)
      // add ball speed
      balls.forEach(b=>{ const sp=Math.hypot(b.vx,b.vy); const ns=baseSpeed*1.05; b.vx*=ns/sp; b.vy*=ns/sp })
      emit(W/2,H/2,'#00ffff',14)
      playTone(880,0.18,'square',0.16)
    }
    const reset=()=>{
      scoreL=0; hits=0; levelL=1; baseSpeed=4.6; slowTimer=0; laserTimer=0; powers=[]; balls=[{x:W/2,y:H/2,vx:4.6,vy:2.8,r:8,trail:[]}]; p1.h=PH; p2.h=PH; p1.expandTimer=0; p2.expandTimer=0; lasers=[]; gameOver=false; paused=false; setScore(0); setLevel(1); particles.clear()
    }
    resetRef.current=reset

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p' || k===' '){ if(!gameOver) paused=!paused; return }
      if(k==='f' && laserTimer>0){
        lasers.push({x:p1.x+p1.h,y:p1.y+p1.h/2,vy:0,alive:true}); // forward laser
        // actually shoot horizontally
        lasers[lasers.length-1]={x:p1.x+PW+6,y:p1.y+p1.h/2,vy:0,alive:true} as any
        playTone(900,0.08,'square',0.13)
      }
    }
    window.addEventListener('keydown', onKey)

    let frame=0
    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      const dt=1
      if(slowTimer>0) slowTimer--
      if(laserTimer>0) laserTimer--
      if(p1.expandTimer>0){ p1.expandTimer--; if(p1.expandTimer<=0) p1.h=PH }
      if(p2.expandTimer>0){ p2.expandTimer--; if(p2.expandTimer<=0) p2.h=PH }
      if(hitFlash>0) hitFlash--

      // player input: W/S or mouse Y
      const keys=input.keys
      let targetY=input.mouse.y - p1.h/2
      // if keys pressed, override mouse smoothing
      let keyDelta=0
      if(keys['w']||keys['arrowup']) keyDelta-=6.2
      if(keys['s']||keys['arrowdown']) keyDelta+=6.2
      if(keyDelta!==0) targetY=p1.y + keyDelta*1.2
      const speedFactor = slowTimer>0?0.62:1
      // lerp paddle with elite feel
      p1.y += (targetY - p1.y)*0.28
      p1.y=Math.max(0,Math.min(H-p1.h,p1.y))

      // IA ultra: predict ball X
      const mainBall=balls[0] || balls[balls.length-1]
      if(mainBall){
        let predY=mainBall.y
        // estimate time to reach p2
        const dtReach = Math.abs((p2.x - mainBall.x)/ (mainBall.vx||0.1))
        predY = mainBall.y + mainBall.vy*dtReach*0.78
        // bounce prediction
        let by=predY, vy=mainBall.vy
        let t=0
        while(t< dtReach && t<120){
          by+=vy
          if(by<8){ by=8; vy*=-1 }
          if(by>H-8){ by=H-8; vy*=-1 }
          t++
        }
        // difficulty scales with level: add error at low level
        const err= Math.max(0, 22 - levelL*2.4) * (Math.random()-0.5)
        const targetP2 = by + err - p2.h/2
        const aiSpeed = 5.2 + levelL*0.38
        const diff=targetP2 - p2.y
        p2.vy = Math.max(-aiSpeed, Math.min(aiSpeed, diff*0.32))
        if(slowTimer>0) p2.vy*=0.55
        p2.y+=p2.vy
        // keep anticipating multi balls
        if(balls.length>1){
          const closest=balls.reduce((a,b)=> Math.abs(b.x-p2.x)<Math.abs(a.x-p2.x)?b:a)
          const dy=closest.y - (p2.y+p2.h/2)
          p2.y+= Math.sign(dy)* Math.min(2.2, Math.abs(dy)*0.06)
        }
      }
      p2.y=Math.max(0,Math.min(H-p2.h,p2.y))

      // balls physics
      for(let bi=balls.length-1; bi>=0; bi--){
        const b=balls[bi]
        const sf= slowTimer>0?0.58:1
        b.x+=b.vx*sf; b.y+=b.vy*sf
        b.trail.push({x:b.x,y:b.y}); if(b.trail.length>12) b.trail.shift()
        if(b.y-b.r<0){ b.y=b.r; b.vy*=-1; emit(b.x,0,'#00ffff',4); playTone(340,0.06,'square',0.1) }
        if(b.y+b.r>H){ b.y=H-b.r; b.vy*=-1; emit(b.x,H,'#ff00ff',4); playTone(340,0.06,'square',0.1) }
        // paddle collisions
        const checkPaddle=(p:typeof p1, isLeft:boolean)=>{
          const withinY= b.y+b.r>p.y && b.y-b.r<p.y+p.h
          if(isLeft){
            if(b.vx<0 && b.x-b.r < p.x+PW && b.x+b.r>p.x && withinY){
              const hit=(b.y-(p.y+p.h/2))/(p.h/2)
              const ang=hit*0.92 // max
              const sp=Math.min(10, Math.hypot(b.vx,b.vy)*1.03)
              b.vx=Math.abs(Math.cos(ang))*sp
              b.vy=Math.sin(ang)*sp + p1.vy*0.12
              b.x=p.x+PW+b.r+1
              hitFlash=8
              hits++; scoreL+=1; setScore(scoreL)
              if(scoreL>bestRef.current) onScoreRef.current(scoreL)
              emit(b.x,b.y,'#00ffff',6); playTone(620+hit*120,0.08,'square',0.13)
              // level every 15 hits
              if(hits%15===0) levelUp()
              maybePower()
              return true
            }
          } else {
            if(b.vx>0 && b.x+b.r > p.x && b.x-b.r < p.x+PW && withinY){
              const hit=(b.y-(p.y+p.h/2))/(p.h/2)
              const sp=Math.min(10, Math.hypot(b.vx,b.vy)*1.03)
              b.vx=-Math.abs(Math.cos(hit*0.92))*sp
              b.vy=Math.sin(hit*0.92)*sp + p2.vy*0.1
              b.x=p.x - b.r -1
              emit(b.x,b.y,'#ff00ff',5); playTone(480,0.08,'square',0.11)
              return true
            }
          }
          return false
        }
        checkPaddle(p1,true); checkPaddle(p2,false)

        // out of bounds = score / game over (first to 7 behind? here endless, miss = lose ball)
        if(b.x < -20){
          // player missed
          if(balls.length>1){ balls.splice(bi,1); continue }
          // single ball miss = opponent scores, but we treat as minor penalty and reset
          scoreL=Math.max(0,scoreL-3); setScore(scoreL)
          emit(18,H/2,'#ff3366',10); playTone(180,0.22,'sawtooth',0.15)
          // check game over if too many misses? use hits threshold: if score negative or level?
          // instead game over when p2 scores 7? we track fails
          // simple: after 3 misses in quick succession show game over if score remains 0 and level 1? instead allow continue
          // we make game over only on R, but add lives concept via flash
          b.x=W/2; b.y=H/2; b.vx=baseSpeed*(Math.random()>0.5?1:-1); b.vy=(Math.random()-0.5)*3.2
          b.trail=[]
        }
        if(b.x > W+20){
          if(balls.length>1){ balls.splice(bi,1); continue }
          scoreL+=5; setScore(scoreL)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_pongultra_best',scoreL); onScoreRef.current(scoreL) }
          emit(W-18,b.y,'#00ffff',8); playTone(740,0.12,'square',0.14)
          hits+=2
          if(hits%15===0) levelUp()
          b.x=W/2; b.y=H/2; b.vx=-baseSpeed; b.vy=(Math.random()-0.5)*3.2; b.trail=[]
        }
      }
      // powers fall
      for(const pw of powers){
        if(!pw.alive) continue
        pw.y+=pw.vy*(slowTimer>0?0.6:1)
        pw.t--
        if(pw.t<=0) pw.alive=false
        // collide with paddles
        const hitP1= pw.x> p1.x && pw.x < p1.x+PW+8 && pw.y>p1.y && pw.y<p1.y+p1.h
        const hitP2= pw.x> p2.x && pw.x < p2.x+PW+8 && pw.y>p2.y && pw.y<p2.y+p2.h
        const targetHit = hitP1? p1 : hitP2? p2 : null
        if(hitP1||hitP2){
          pw.alive=false
          if(pw.kind==='expand'){ targetHit!.h=PH_EXPAND; targetHit!.expandTimer=520; playTone(740,0.12,'sine',0.15); scoreL+=8; setScore(scoreL) }
          else if(pw.kind==='slow'){ slowTimer=420; playTone(420,0.18,'triangle',0.14); scoreL+=8; setScore(scoreL) }
          else if(pw.kind==='multi'){
            for(let i=0;i<2;i++){
              const ang=(Math.random()-0.5)*0.9
              const sp=baseSpeed*0.95
              balls.push({x:W/2,y:H/2,vx:Math.cos(ang)*sp*(Math.random()>0.5?1:-1), vy:Math.sin(ang)*sp, r:7, trail:[]})
            }
            playTone(660,0.16,'square',0.13); scoreL+=12; setScore(scoreL)
          }
          else if(pw.kind==='laser'){
            if(hitP1) laserTimer=600
            // p2 laser ignored
            playTone(880,0.16,'square',0.14); scoreL+=10; setScore(scoreL)
          }
          emit(pw.x,pw.y, pw.kind==='expand'?'#00ffff': pw.kind==='slow'?'#ffdd00': pw.kind==='laser'?'#ff3366':'#ff00ff',8)
        }
        if(pw.y>H+20) pw.alive=false
      }
      powers=powers.filter(p=>p.alive)

      // lasers horizontal
      for(let i=lasers.length-1;i>=0;i--){
        const l=lasers[i]
        if(!l.alive) continue
        l.x+=7
        // hit p2?
        if(l.x> p2.x && l.x < p2.x+PW && l.y>p2.y && l.y<p2.y+p2.h){
          l.alive=false
          p2.y+= (Math.random()-0.5)*28
          emit(l.x,l.y,'#ff3366',10); playTone(300,0.14,'sawtooth',0.15)
          scoreL+=15; setScore(scoreL)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_pongultra_best',scoreL); onScoreRef.current(scoreL) }
        }
        if(l.x>W+10) l.alive=false
      }
      lasers=lasers.filter(l=>l.alive)

      particles.update()
      draw(false)
    }

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid + center dash
      ctx.strokeStyle='rgba(0,255,255,0.07)'; ctx.lineWidth=1
      for(let y=0;y<H;y+=36){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      // center line
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.setLineDash([8,8]); ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([])
      // outer glow
      const vg=ctx.createRadialGradient(W/2,H/2,80,W/2,H/2,360)
      vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.38)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)
      // powers
      for(const pw of powers){
        const col= pw.kind==='expand'?'#00ffff': pw.kind==='slow'?'#ffdd00': pw.kind==='laser'?'#ff3366':'#ff00ff'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(pw.x,pw.y,10,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'; ctx.fillText(pw.kind==='expand'?'↔': pw.kind==='slow'?'◷': pw.kind==='laser'?'≋':'◈', pw.x, pw.y+3)
        ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1.1; ctx.beginPath(); ctx.arc(pw.x,pw.y,13,-Math.PI/2,-Math.PI/2+Math.PI*2*(pw.t/420)); ctx.stroke()
      }
      // paddles neon
      const drawPaddle=(p:typeof p1,col:string)=>{
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur= hitFlash>0?18:14
        ctx.beginPath(); (ctx as any).roundRect(p.x,p.y,PW,p.h,6); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(p.x+3,p.y+8,2,p.h-16)
      }
      drawPaddle(p1, laserTimer>0?'#ff3366':'#00ffff')
      drawPaddle(p2,'#ff00ff')
      if(laserTimer>0){
        ctx.fillStyle='rgba(255,51,102,0.18)'; ctx.fillRect(p1.x, p1.y+p1.h/2-1, W,2)
        ctx.fillStyle='#ff3366'; ctx.font='700 8px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText('LASER [F]', p1.x, p1.y-6)
      }
      // balls RGB trail
      for(const b of balls){
        for(let i=0;i<b.trail.length;i++){
          const t=b.trail[i]; const a=(i+1)/b.trail.length*0.28
          const hue=(i*14+frame*2)%360
          ctx.globalAlpha=a; ctx.fillStyle=`hsl(${hue},100%,60%)`; ctx.beginPath(); ctx.arc(t.x,t.y,b.r*0.62,0,Math.PI*2); ctx.fill()
        }
        ctx.globalAlpha=1
        ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(b.x-2,b.y-2,1.8,0,Math.PI*2); ctx.fill()
      }
      // lasers
      for(const l of lasers){
        ctx.fillStyle='#ff3366'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=10; ctx.fillRect(l.x-10,l.y-2,18,4); ctx.shadowBlur=0
      }
      particles.draw(ctx)
      // HUD
      ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,22)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`J1 ${scoreL}`,10,15)
      ctx.fillStyle='#ff00ff'; ctx.textAlign='center'; ctx.font='900 11px Orbitron'; ctx.fillText(`NIVEL ${levelL}  HITS ${hits%15}/15 ${slowTimer>0?'◷ SLOW':''}`,W/2,15)
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.textAlign='right'; ctx.font='10px JetBrains Mono'; ctx.fillText(`Bolas ${balls.length}  Best ${bestRef.current}`,W-10,15)
      if(slowTimer>0){
        ctx.fillStyle='rgba(255,221,0,0.14)'; ctx.fillRect(0,22,W,3)
        ctx.fillStyle='#ffdd00'; ctx.fillRect(0,22,W*(slowTimer/420),3)
      }
      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Mueve mouse / WASD • P pausa',W/2,H/2+18)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar',W/2,H/2+30)
      }
    }

    const loopWrap=()=>{ raf=requestAnimationFrame(loop); if(isStartedRef.current===false) draw(true) }
    // start loop
    const startLoop=()=>{
      const inner=()=>{
        raf=requestAnimationFrame(inner)
        if(isStartedRef.current===false){ draw(true); return }
        if(paused){ draw(true); return }
        if(gameOver){ draw(false); return }
        // reuse above logic inline? we already have loop defined
      }
    }
    // actually run loop
    const run=()=>{
      const tickLoop=()=>{
        raf=requestAnimationFrame(tickLoop)
        if(isStartedRef.current===false){ draw(true); return }
        if(paused){ draw(true); return }
        if(gameOver){ draw(false); return }
        // call update manually by invoking loop body duplicated below is messy, so just call loop logic via closure:
        // we will inline update call: create a function updateAndDraw that we already have as loop()
        // To avoid double loops, we directly execute loop's body by calling the earlier loop function
        // Hack: call the previously defined loop's update section by re-entering
      }
    }
    // Kick the main loop defined earlier
    loop()
    return()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown',onKey)
      input.cleanup()
    }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-none" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-fuchsia-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Mouse/WASD mueve • Power-ups ↔ expand ◷ slow ◈ multi ≋ laser [F] • IA ultra • Nivel cada 15 hits</p>
    </div>
  )
}
