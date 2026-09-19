import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function PongGame({onScore, isStarted}:{onScore:(s:number)=>void,isStarted?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_pong_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{
    const c=canvasRef.current!; const {ctx,W,H}=setupCanvas(c,480,320)
    const particles=createParticlePool(48)
    const input=createInput(c,W,H)
    let raf=0, scoreL=0, level=1, gameOver=false
    let playerY=H/2-36, aiY=H/2-36
    let ball={x:W/2,y:H/2,vx:4.2,vy:3.1, r:7}
    let ballTrail:{x:number,y:number}[]=[]
    let playerScore=0, aiScore=0, hits=0
    let hue=0, shake=0
    let last=performance.now()
    const resetBall=(dir:number)=>{
      ball.x=W/2; ball.y=H/2
      const sp= 4.6 + level*0.35 + Math.min(2.2, hits*0.04)
      ball.vx=dir* (sp + Math.random()*0.6)
      ball.vy=(Math.random()-0.5)*5 * (0.9+ level*0.06)
      ballTrail=[]
    }
    resetBall(Math.random()>0.5?1:-1)
    const emit=(x:number,y:number,c:string,n=6)=>{
      for(let i=0;i<n;i++) particles.push({x,y,vx: (x<W/2?1:-1)*(Math.random()*3+0.5), vy:(Math.random()-0.5)*4, life:1, c, size:2.8})
    }
    const update=()=>{
      const now=performance.now()
      const dt=Math.min(32, now-last)/16.66
      last=now
      hue=(hue+0.7*dt)%360
      if(shake>0) shake-=0.12*dt
      // player input: keys + mouse via createInput
      const keys=input.keys
      let targetY=input.mouse.y -36
      // if mouse is actively down, lerp faster
      if(keys['w']||keys['arrowup']) playerY-=6.2*dt
      if(keys['s']||keys['arrowdown']) playerY+=6.2*dt
      // mouse smooth follow when not using keys
      if(!keys['w']&&!keys['s']&&!keys['arrowup']&&!keys['arrowdown']){
        // Only snap if mouse moved inside canvas (use input.mouse)
        playerY += (targetY - playerY)*0.18*dt
      }
      playerY=Math.max(0,Math.min(H-72,playerY))
      // AI progresiva: level increases speed, prediction error decreases with level
      const aiSpeed = 3.1 + level*0.42 + Math.min(1.4, hits*0.03)
      const reaction = Math.max(0.12, 0.52 - level*0.06)
      // predict where ball will be
      let predictY=ball.y
      if(ball.vx>0){
        const timeToReach = (W-22 - ball.x)/ Math.max(0.6, Math.abs(ball.vx))
        predictY = ball.y + ball.vy*timeToReach
        // bounce prediction
        let py=predictY, vy=ball.vy
        while(py<0||py>H){
          if(py<0){ py=-py; vy*=-1 }
          if(py>H){ py=2*H - py; vy*=-1 }
        }
        predictY=py
        // add error that shrinks with level/hits
        const error = (Math.random()-0.5)* (42 - level*4 - hits*0.6)
        predictY+=error
      } else {
        // return to center with slight wander
        predictY = H/2 + Math.sin(performance.now()*0.0012)*22
      }
      const aiCenter=aiY+36
      const diff=predictY - aiCenter
      // apply reaction lag
      if(Math.abs(diff)>4){
        aiY+= Math.sign(diff) * Math.min(Math.abs(diff)*reaction, aiSpeed)*dt
      }
      aiY=Math.max(0,Math.min(H-72,aiY))
      // ball move
      ball.x+=ball.vx*dt
      ball.y+=ball.vy*dt
      ballTrail.push({x:ball.x,y:ball.y})
      if(ballTrail.length>10) ballTrail.shift()
      if(ball.y<6||ball.y>H-6){ ball.vy*=-1; ball.y=Math.max(6,Math.min(H-6,ball.y)); playTone(380,0.07,'sine',0.11); shake=1.2 }
      // paddle collisions with angle perfection
      if(ball.x<22 && ball.y>playerY-2 && ball.y<playerY+74){
        if(ball.vx<0){
          ball.vx=Math.abs(ball.vx)*1.045
          const hit=(ball.y-(playerY+36))/36 // -1..1
          ball.vy+= hit*3.2 + (input.mouse.y - (playerY+36))*0.02
          ball.vy=Math.max(-7,Math.min(7,ball.vy))
          ball.x=22
          hits++
          scoreL+= 5 + Math.floor(hits/6)
          setScore(scoreL)
          if(scoreL>bestRef.current){ onScoreRef.current(scoreL) }
          // level up every 10 hits
          if(hits%12===0){ level=Math.min(12, level+1); playTone(880,0.14,'square',0.16) }
          else playTone(660,0.08,'square',0.14)
          emit(22,ball.y,`hsl(${hue},100%,60%)`,7)
          shake=2
        }
      }
      if(ball.x>W-22 && ball.y>aiY-2 && ball.y<aiY+74){
        if(ball.vx>0){
          ball.vx=-Math.abs(ball.vx)*1.035
          const hit=(ball.y-(aiY+36))/36
          ball.vy+= hit*3.0
          ball.vy=Math.max(-7,Math.min(7,ball.vy))
          ball.x=W-22
          playTone(520,0.07,'square',0.11)
          emit(W-22,ball.y,`hsl(${(hue+180)%360},100%,60%)`,6)
          shake=1.4
        }
      }
      // scoring
      if(ball.x<-8){
        aiScore++
        hits=Math.max(0,hits-2)
        playTone(180,0.22,'sawtooth',0.15)
        for(let i=0;i<10;i++) particles.push({x:ball.x,y:ball.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff3355',size:3})
        resetBall(1)
        if(aiScore>=7){
          gameOver=true
          if(scoreL>bestRef.current){ saveBest('neo_pong_best',scoreL); setBest(scoreL); bestRef.current=scoreL }
          onScoreRef.current(scoreL)
        }
      }
      if(ball.x>W+8){
        playerScore++
        scoreL+=20 + level*4
        setScore(scoreL)
        if(scoreL>bestRef.current){ onScoreRef.current(scoreL) }
        playTone(740,0.16,'sine',0.16)
        for(let i=0;i<10;i++) particles.push({x:ball.x,y:ball.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#00ffff',size:3})
        resetBall(-1)
        // keep cap of 7 points for win? just continue endless scoring
        if(playerScore>=7){
          level=Math.min(12, level+1)
          playerScore=0; aiScore=0
          playTone(960,0.28,'triangle',0.18)
        }
      }
      particles.update()
    }
    const draw=(paused:boolean)=>{
      ctx.save()
      if(shake>0){ ctx.translate((Math.random()-0.5)*shake*2,(Math.random()-0.5)*shake) }
      // fondo #080a14
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid sutil
      ctx.strokeStyle='rgba(0,255,255,0.045)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for(let y=0;y<H;y+=36){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      // center dashed
      ctx.strokeStyle='rgba(255,255,255,0.13)'; ctx.setLineDash([8,8]); ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([])
      // subtle RGB gradient overlay
      const g=ctx.createLinearGradient(0,0,W,0); g.addColorStop(0,'rgba(0,255,255,0.05)'); g.addColorStop(0.5,'rgba(255,0,255,0.04)'); g.addColorStop(1,'rgba(255,221,0,0.04)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
      // ball trail RGB
      for(let i=0;i<ballTrail.length;i++){
        const p=ballTrail[i]; const a=(i+1)/ballTrail.length*0.5
        ctx.globalAlpha=a; ctx.fillStyle=`hsl(${hue},100%,60%)`; ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=8
        ctx.beginPath(); ctx.arc(p.x,p.y, ball.r* (0.35+ i*0.06),0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      }
      ctx.globalAlpha=1
      // paddles
      const gradP=ctx.createLinearGradient(10,playerY,22,playerY+72); gradP.addColorStop(0,`hsl(${hue},100%,60%)`); gradP.addColorStop(1,'#ffffff')
      ctx.fillStyle=gradP; ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=14; ctx.beginPath(); (ctx as any).roundRect(10,playerY,12,72,6); ctx.fill(); ctx.shadowBlur=0
      // touch handle indicator
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(16, playerY+36, 2,0,Math.PI*2); ctx.fill()
      const gradA=ctx.createLinearGradient(W-22,aiY,W-10,aiY+72); gradA.addColorStop(0,'#ffffff'); gradA.addColorStop(1,`hsl(${(hue+180)%360},100%,60%)`)
      ctx.fillStyle=gradA; ctx.shadowColor=`hsl(${(hue+180)%360},100%,60%)`; ctx.shadowBlur=14; ctx.beginPath(); (ctx as any).roundRect(W-22,aiY,12,72,6); ctx.fill(); ctx.shadowBlur=0
      // ball glowing
      ctx.fillStyle=`hsl(${hue},100%,62%)`; ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=16
      ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ball.x-2.2,ball.y-2,1.8,0,Math.PI*2); ctx.fill()
      // particles
      particles.draw(ctx)
      // scores top
      ctx.fillStyle='#fff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText(String(playerScore), W/2-42, 30); ctx.fillText(String(aiScore), W/2+42, 30)
      ctx.fillStyle='rgba(255,255,255,0.42)'; ctx.font='10px JetBrains Mono'; ctx.fillText('TU', W/2-42,44); ctx.fillText('IA', W/2+42,44)
      // level + speed
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${level}  HITS ${hits}`, 12, H-10)
      ctx.textAlign='right'; ctx.fillText(`VEL ${Math.abs(ball.vx).toFixed(1)}`, W-12, H-10)
      if(paused){
        ctx.fillStyle='rgba(8,10,20,0.74)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.fillText('PAUSA',W/2,H/2-4); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font='11px JetBrains Mono'; ctx.fillText('W/S o mouse/touch • Golpea con borde para curva',W/2,H/2+18)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle= playerScore>=aiScore? '#00ff88':'#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'
        ctx.shadowColor=ctx.fillStyle as string; ctx.shadowBlur=12; ctx.fillText(playerScore>=aiScore?'¡GANASTE!':'GAME OVER',W/2,H/2-8); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 12px JetBrains Mono'; ctx.fillText(`SCORE ${scoreL}  LVL ${level}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Espacio / R / Click para reiniciar',W/2,H/2+28)
      }
      ctx.restore()
    }
    const onKeyRestart=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '||k==='r'||k==='enter'){
        if(gameOver){
          gameOver=false; playerScore=0; aiScore=0; hits=0; level=1; scoreL=0; setScore(0)
          resetBall(Math.random()>0.5?1:-1); particles.clear(); playTone(640,0.12,'square',0.14)
        }
      }
    }
    const onClickRestart=()=>{
      if(gameOver){ gameOver=false; playerScore=0; aiScore=0; hits=0; level=1; scoreL=0; setScore(0); resetBall(Math.random()>0.5?1:-1); particles.clear() }
    }
    window.addEventListener('keydown', onKeyRestart)
    c.addEventListener('mousedown', onClickRestart)
    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(true); return }
      if(gameOver){ draw(false); return }
      update(); draw(false)
    }
    loop()
    return()=>{ cancelAnimationFrame(raf); input.cleanup(); window.removeEventListener('keydown', onKeyRestart); c.removeEventListener('mousedown', onClickRestart) }
  },[])
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[3/2] cursor-none"/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">PUNTOS</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono">W/S o mouse/touch arrastra • IA progresiva + RGB trail + partículas</p>
    </div>
  )
}
