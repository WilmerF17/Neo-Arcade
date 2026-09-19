import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function BreakoutGame({onScore, isStarted}:{onScore:(s:number)=>void,isStarted?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_breakout_best'))
  const bestRef=useRef(best), scoreRef=useRef(0), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{scoreRef.current=score},[score])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{
    const c=canvasRef.current!; const {ctx,W,H}=setupCanvas(c,480,360)
    const particles=createParticlePool(48)
    const input=createInput(c,W,H)
    let raf=0, scoreL=0, level=1, gameOver=false, pausedTime=0
    let lives=3, combo=0, comboTimer=0, speedMul=1
    let ballTrail:{x:number,y:number}[]=[]
    // paddle
    let paddle={x:W/2-50, y:H-28, w:100, h:12, tx:W/2-50}
    let ball={x:W/2,y:H/2,vx:3.6,vy:-4.2,r:7, baseSpeed:5.4}
    // bricks 40 = 8*5
    const cols=8, rows=5
    const brickW=(W-40)/cols, brickH=22
    type Brick={x:number,y:number,w:number,h:number,hp:number,maxHp:number,alive:boolean}
    let bricks:Brick[]=[]
    const buildBricks=()=>{
      bricks=[]
      for(let r=0;r<rows;r++) for(let cc=0;cc<cols;cc++){
        const hp = r===0?3: r<2?2:1
        // add variation: every 3rd brick has 2 hp extra on higher levels
        const extra = level>2 && (cc+r)%4===0 ? 1:0
        bricks.push({x:20+cc*brickW, y:50+r*(brickH+6), w:brickW-6, h:brickH, hp:hp+extra, maxHp:hp+extra, alive:true})
      }
    }
    buildBricks()
    type Power={x:number,y:number,vy:number,kind:'expand'|'slow'|'multi',alive:boolean}
    let powers:Power[]=[]
    let paddleExpandTimer=0
    let slowTimer=0
    let multiBalls:{x:number,y:number,vx:number,vy:number,r:number,alive:boolean}[]=[]
    let isPausedOverlay=false
    const resetBall=(withImpulse=false)=>{
      ball.x=W/2; ball.y=H/2
      const dir=Math.random()>0.5?1:-1
      const sp=ball.baseSpeed*speedMul*(slowTimer>0?0.65:1)
      ball.vx=dir*(3+Math.random()*1.2)* (slowTimer>0?0.7:1)
      ball.vy=-sp
      if(withImpulse){ ball.vy*=1.05 }
      ballTrail=[]
    }
    resetBall()
    const emit=(x:number,y:number,c:string,n=8)=>{
      for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7-1,life:1,c,size:2.5+Math.random()*1.5})
    }
    const levelUp=()=>{
      level++
      speedMul=Math.min(1.9, 1 + level*0.11)
      ball.baseSpeed=Math.min(9,5.4+level*0.45)
      paddle.w=Math.max(68, 100 - level*4)
      buildBricks()
      resetBall(true)
      playTone(880,0.18,'sawtooth',0.18)
      emit(W/2, H/2,'#00ffff',12)
    }
    let last=performance.now()
    const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v))
    const update=()=>{
      const now=performance.now()
      const dt=Math.min(32, now-last)/16.666
      last=now
      // timers
      if(paddleExpandTimer>0){ paddleExpandTimer-=dt; if(paddleExpandTimer<=0) paddle.w=Math.max(68,100-level*4) }
      if(slowTimer>0) slowTimer-=dt
      if(comboTimer>0){ comboTimer-=dt; if(comboTimer<=0) combo=0 }
      // input paddle
      const keys=input.keys
      // mouse drives tx, keys override
      let targetFromMouse = input.mouse.x - paddle.w/2
      // if mouse not moved recently, keys take priority
      if(keys['a']||keys['arrowleft']) targetFromMouse -= 6*dt
      if(keys['d']||keys['arrowright']) targetFromMouse += 6*dt
      // magnet lerp when ball is near paddle
      const magnetDist = Math.hypot(ball.x - (paddle.x+paddle.w/2), ball.y - paddle.y)
      const magnet = magnetDist<90 ? 0.28 : 0.20
      paddle.tx = clamp(targetFromMouse, 0, W-paddle.w)
      paddle.x += (paddle.tx - paddle.x) * magnet * dt
      // space launch if stuck? not needed continuous
      // ball physics with delta
      const slowFactor = slowTimer>0?0.62:1
      ball.x += ball.vx*dt*slowFactor
      ball.y += ball.vy*dt*slowFactor
      ballTrail.push({x:ball.x,y:ball.y})
      if(ballTrail.length>10) ballTrail.shift()
      if(ball.x - ball.r <0){ ball.x=ball.r; ball.vx*=-1; playTone(320,0.08,'square',0.12); emit(ball.x,ball.y,'#00ffff',4)}
      if(ball.x + ball.r >W){ ball.x=W-ball.r; ball.vx*=-1; playTone(320,0.08,'square',0.12); emit(ball.x,ball.y,'#ff00ff',4)}
      if(ball.y - ball.r <0){ ball.y=ball.r; ball.vy*=-1; playTone(420,0.08,'square',0.12); emit(ball.x,ball.y,'#ffd900',4)}
      if(ball.y + ball.r >H){
        lives--
        combo=0; comboTimer=0
        playTone(160,0.28,'sawtooth',0.16)
        emit(ball.x, H-10,'#ff3366',10)
        if(lives<=0){
          gameOver=true
          if(scoreL>bestRef.current){ saveBest('neo_breakout_best',scoreL); setBest(scoreL); bestRef.current=scoreL }
          onScoreRef.current(scoreL)
          playTone(120,0.4,'triangle',0.2)
        } else {
          resetBall()
        }
        return
      }
      // paddle collision - angular perfect
      if(ball.vy>0 && ball.y+ball.r>paddle.y && ball.y -ball.r < paddle.y+paddle.h && ball.x> paddle.x-4 && ball.x< paddle.x+paddle.w+4){
        const hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2) // -1..1
        const angle = hit * (58 * Math.PI/180) // max 58deg
        const sp=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy) * (slowTimer>0?0.95:1)
        // add paddle velocity influence
        const paddleVel = (paddle.tx - paddle.x) *0.18
        ball.vx = Math.sin(angle)*sp + paddleVel
        ball.vy = -Math.abs(Math.cos(angle)*sp)
        // clamp speed
        const curSp=Math.sqrt(ball.vx*ball.vx+ball.vy*ball.vy)
        const targetSp= ball.baseSpeed*speedMul*(slowTimer>0?0.72:1)
        if(curSp>0){ ball.vx*=targetSp/curSp; ball.vy*=targetSp/curSp }
        ball.y=paddle.y - ball.r -1
        playTone(640,0.09,'square',0.14)
        emit(ball.x, paddle.y,'#00ffff',5)
        // small score for keep-up
        scoreL+=1; setScore(scoreL); scoreRef.current=scoreL
      }
      // multiballs update
      for(let i=multiBalls.length-1;i>=0;i--){
        const b=multiBalls[i]
        if(!b.alive) continue
        b.x+=b.vx*dt*slowFactor; b.y+=b.vy*dt*slowFactor
        if(b.x-b.r<0||b.x+b.r>W) b.vx*=-1
        if(b.y-b.r<0) b.vy*=-1
        if(b.y+b.r>H){ b.alive=false; continue }
        if(b.y+b.r>paddle.y && b.y-b.r<paddle.y+paddle.h && b.x>paddle.x && b.x<paddle.x+paddle.w){
          b.vy=-Math.abs(b.vy)
          const hit=(b.x-(paddle.x+paddle.w/2))/(paddle.w/2)
          b.vx= hit*5 + (paddle.tx-paddle.x)*0.12
        }
        // brick collision for multiball
        for(const br of bricks){
          if(!br.alive) continue
          if(b.x+b.r>br.x && b.x-b.r<br.x+br.w && b.y+b.r>br.y && b.y-b.r<br.y+br.h){
            br.hp--; if(br.hp<=0) br.alive=false
            b.vy*=-1
            combo++; comboTimer=72
            const pts=10*br.maxHp * (1+ Math.floor(combo/3)*0.5)
            scoreL+=Math.floor(pts); setScore(scoreL); onScoreRef.current(scoreL)
            emit(br.x+br.w/2, br.y+br.h/2, br.maxHp===3?'#ff00ff':br.maxHp===2?'#00ffff':'#ffdd00',6)
            if(Math.random()<0.12){
              const kind:Power['kind']= Math.random()<0.4?'expand': Math.random()<0.6?'slow':'multi'
              powers.push({x:br.x+br.w/2,y:br.y+br.h/2,vy:1.8,kind,alive:true})
            }
            playTone(br.maxHp===3?520:br.maxHp===2?620:740,0.09,'sine',0.13)
            break
          }
        }
      }
      multiBalls=multiBalls.filter(b=>b.alive)
      // bricks main ball
      let anyAlive=false
      for(const br of bricks){
        if(!br.alive) continue
        anyAlive=true
        if(ball.x+ball.r>br.x && ball.x-ball.r<br.x+br.w && ball.y+ball.r>br.y && ball.y-ball.r<br.y+br.h){
          // determine side
          const overlapL= ball.x+ball.r - br.x
          const overlapR= br.x+br.w - (ball.x-ball.r)
          const overlapT= ball.y+ball.r - br.y
          const overlapB= br.y+br.h - (ball.y-ball.r)
          const min=Math.min(overlapL,overlapR,overlapT,overlapB)
          if(min===overlapL||min===overlapR) ball.vx*=-1
          else ball.vy*=-1
          br.hp--
          if(br.hp<=0){
            br.alive=false
            // chance powerup
            if(Math.random()<0.14){
              const kind:Power['kind']= Math.random()<0.4?'expand': Math.random()<0.6?'slow':'multi'
              powers.push({x:br.x+br.w/2,y:br.y+br.h/2,vy:1.8,kind,alive:true})
            }
          }
          combo++; comboTimer=72
          const base=10*br.maxHp
          const mult=1+ Math.floor(combo/4)*0.35
          const pts=Math.floor(base*mult*level)
          scoreL+=pts; setScore(scoreL); scoreRef.current=scoreL; if(scoreL>bestRef.current) onScoreRef.current(scoreL)
          emit(br.x+br.w/2, br.y+br.h/2, br.maxHp===3?'#ff00ff':br.maxHp===2?'#00ffff':'#ffdd00', br.hp<=0?9:5)
          playTone(br.maxHp===3?520:br.maxHp===2?620:740,0.09,'sine',0.13)
          break
        }
      }
      if(!anyAlive){
        levelUp()
      }
      // powers update
      for(const p of powers){
        if(!p.alive) continue
        p.y+=p.vy*dt
        if(p.y+paddle.h > paddle.y && p.y < paddle.y+paddle.h && p.x>paddle.x && p.x<paddle.x+paddle.w){
          p.alive=false
          if(p.kind==='expand'){ paddle.w=Math.min(150,paddle.w+32); paddleExpandTimer=520; playTone(880,0.14,'sine',0.18); scoreL+=25; setScore(scoreL) }
          else if(p.kind==='slow'){ slowTimer=420; playTone(500,0.18,'triangle',0.16); scoreL+=25; setScore(scoreL)}
          else if(p.kind==='multi'){
            for(let i=0;i<2;i++){
              const ang=(Math.random()-0.5)*0.7
              const sp=ball.baseSpeed*0.95
              multiBalls.push({x:ball.x,y:ball.y,vx:Math.sin(ang)*sp + (Math.random()-0.5)*2, vy: -Math.abs(Math.cos(ang)*sp), r:6, alive:true})
            }
            playTone(740,0.2,'square',0.16); scoreL+=40; setScore(scoreL)
          }
          emit(p.x,p.y,p.kind==='expand'?'#00ffff':p.kind==='slow'?'#ffdd00':'#ff00ff',8)
        }
        if(p.y>H+20) p.alive=false
      }
      powers=powers.filter(p=>p.alive)
      particles.update()
    }
    const draw=(paused:boolean)=>{
      // fondo
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid sutil
      ctx.strokeStyle='rgba(0,255,255,0.05)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for(let y=0;y<H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      // glow vignette
      const vg=ctx.createRadialGradient(W/2,H/2, 120, W/2,H/2, 420)
      vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.4)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)
      // bricks
      for(const b of bricks){
        if(!b.alive) continue
        const colsPal = b.maxHp===3? ['#ff00ff','#7a00ff'] : b.maxHp===2? ['#00ffff','#0066ff'] : ['#ffdd00','#ff5e00']
        // hp dim
        const alpha = 0.55 + (b.hp/b.maxHp)*0.45
        ctx.globalAlpha=alpha
        const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h)
        g.addColorStop(0,colsPal[0]); g.addColorStop(1,colsPal[1])
        ctx.fillStyle=g
        ctx.shadowColor=colsPal[0]; ctx.shadowBlur=b.maxHp>1?12:8
        ctx.beginPath()
        if((ctx as any).roundRect) (ctx as any).roundRect(b.x,b.y,b.w,b.h,4)
        else { ctx.rect(b.x,b.y,b.w,b.h) }
        ctx.fill()
        ctx.shadowBlur=0
        // hp indicator / shine
        ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.fillRect(b.x,b.y,b.w,3)
        if(b.hp>1){
          ctx.fillStyle='#fff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'
          ctx.fillText(String(b.hp), b.x+b.w/2, b.y+b.h/2+3)
        }
        ctx.globalAlpha=1
      }
      // powers
      for(const p of powers){
        ctx.save(); ctx.translate(p.x,p.y)
        const col=p.kind==='expand'?'#00ffff':p.kind==='slow'?'#ffdd00':'#ff00ff'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=10
        ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'
        ctx.fillText(p.kind==='expand'?'↔':p.kind==='slow'?'◷':'◈',0,3)
        // glow tail
        ctx.strokeStyle=col; ctx.globalAlpha=0.35; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(0,10); ctx.stroke(); ctx.globalAlpha=1
        ctx.restore()
      }
      // paddle neón magnético
      ctx.save()
      const paddleGrad=ctx.createLinearGradient(paddle.x,paddle.y,paddle.x,paddle.y+paddle.h)
      paddleGrad.addColorStop(0,'#ffffff'); paddleGrad.addColorStop(1,'#00ffff')
      ctx.fillStyle=paddleGrad
      ctx.shadowColor= paddleExpandTimer>0?'#ff00ff':'#00ffff'
      ctx.shadowBlur=18
      ctx.beginPath()
      if((ctx as any).roundRect) (ctx as any).roundRect(paddle.x,paddle.y,paddle.w,paddle.h,7)
      else ctx.rect(paddle.x,paddle.y,paddle.w,paddle.h)
      ctx.fill()
      ctx.shadowBlur=0
      // magnetic shimmer when expanding
      if(paddleExpandTimer>0){
        ctx.fillStyle='rgba(255,0,255,0.18)'; ctx.fillRect(paddle.x, paddle.y, paddle.w, 2)
      }
      // center notch
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(paddle.x+paddle.w/2, paddle.y+paddle.h/2, 3,0,Math.PI*2); ctx.fill()
      ctx.restore()
      // ball trail
      for(let i=0;i<ballTrail.length;i++){
        const t=ballTrail[i]; const a=(i+1)/ballTrail.length*0.22
        ctx.globalAlpha=a; ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(t.x,t.y, ball.r*0.55,0,Math.PI*2); ctx.fill()
      }
      ctx.globalAlpha=1
      // ball
      ctx.fillStyle='#ffffff'; ctx.shadowColor='#ffffff'; ctx.shadowBlur=16
      ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill()
      ctx.shadowBlur=0
      ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(ball.x-1.8,ball.y-1.8,1.7,0,Math.PI*2); ctx.fill()
      // multiballs
      for(const b of multiBalls){
        ctx.fillStyle='#ff00ff'; ctx.shadowColor='#ff00ff'; ctx.shadowBlur=12
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      }
      // partículas
      particles.draw(ctx)
      // HUD subtle combo
      if(combo>2){
        ctx.fillStyle= combo>7?'#ff00ff':combo>4?'#00ffff':'#ffdd00'
        ctx.font='900 12px Orbitron'; ctx.textAlign='left'
        ctx.shadowColor=ctx.fillStyle as string; ctx.shadowBlur=10
        ctx.fillText(`COMBO x${combo}  +${Math.floor((1+Math.floor(combo/4)*0.35)*10)}`, 14, 20)
        ctx.shadowBlur=0
        // combo bar
        const pct=comboTimer/72
        ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(14,24,80,4)
        ctx.fillStyle='#00ffff'; ctx.fillRect(14,24,80*pct,4)
      }
      // level display faint
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='right'
      ctx.fillText(`NIVEL ${level}  VIDAS ${lives}`, W-14, 18)
      if(paused){
        ctx.fillStyle='rgba(8,10,20,0.72)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'
        ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.fillText('PAUSA',W/2,H/2-6); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Mueve mouse / A-D • Espacio = pausa',W/2,H/2+16)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 24px Orbitron'; ctx.textAlign='center'
        ctx.shadowColor='#ff3355'; ctx.shadowBlur=14; ctx.fillText('GAME OVER',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 12px JetBrains Mono'; ctx.fillText(`SCORE ${scoreL}  NIVEL ${level}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Click / Espacio / R para reiniciar',W/2,H/2+30)
      }
    }
    // input restart
    const onKeyRestart=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '||k==='r'||k==='enter'){
        if(gameOver){
          gameOver=false; lives=3; scoreL=0; level=1; speedMul=1; combo=0; comboTimer=0
          paddleExpandTimer=0; slowTimer=0; powers=[]; multiBalls=[]; particles.clear()
          paddle.w=100
          buildBricks(); resetBall(); setScore(0); scoreRef.current=0; playTone(640,0.12,'square',0.14)
        }
      }
      if(k==='p'){
        isPausedOverlay=!isPausedOverlay
      }
    }
    const onClickRestart=()=>{
      if(gameOver){
        gameOver=false; lives=3; scoreL=0; level=1; speedMul=1; combo=0; comboTimer=0
        paddleExpandTimer=0; slowTimer=0; powers=[]; multiBalls=[]; particles.clear()
        paddle.w=100
        buildBricks(); resetBall(); setScore(0); scoreRef.current=0; playTone(640,0.12,'square',0.14)
      }
    }
    window.addEventListener('keydown', onKeyRestart)
    c.addEventListener('mousedown', onClickRestart)
    c.addEventListener('touchstart', onClickRestart as any, {passive:true} as any)
    let rafId=0
    const loop=()=>{
      rafId=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(true); return }
      if(gameOver){ draw(false); return }
      update(); draw(false)
    }
    loop()
    return()=>{ cancelAnimationFrame(rafId); input.cleanup(); window.removeEventListener('keydown', onKeyRestart); c.removeEventListener('mousedown', onClickRestart); c.removeEventListener('touchstart', onClickRestart as any)}
  },[])
  return <div className="flex flex-col items-center gap-3 w-full max-w-[480px]"><canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-none"/><div className="flex gap-2 w-full"><div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div><div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div><div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Lv {Math.floor(score/400)+1}</div></div><p className="text-[11px] text-white/50 font-mono">Mouse / A-D mueve • Power-ups: ↔ expande ◷ slow ◈ multi • Física angular perfecta</p></div>
}
