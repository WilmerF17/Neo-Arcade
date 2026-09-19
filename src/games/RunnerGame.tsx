import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function RunnerGame({onScore, isStarted}:{onScore:(s:number)=>void,isStarted?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_runner_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{
    const c=canvasRef.current!; const {ctx,W,H}=setupCanvas(c,480,280)
    const particles=createParticlePool(48)
    const input=createInput(c,W,H)
    let raf=0, scoreL=0, level=1, gameOver=false
    let vy=0, onGround=true, jumps=0, maxJumps=2, speed=4.8, gravity=0.70, frame=0, spawnTimer=0, coinTimer=0, combo=0
    let groundY=H-38
    let playerY=groundY-22
    let obstacles:{x:number,w:number,h:number,kind:0|1|2}[]=[] // 0 block,1 spike,2 high
    let coins:{x:number,y:number,r:number,alive:boolean,vy:number}[]=[]
    let stars:{x:number,y:number,s:number}[] = Array.from({length:34},()=>({x:Math.random()*W,y:Math.random()*H*0.55,s:Math.random()*1.4+0.6}))
    let hills:{x:number,w:number,h:number,par:number}[] = Array.from({length:5},(_,i)=>({x:i*110, w:120+Math.random()*60, h:18+Math.random()*18, par:0.12+ i*0.04}))
    let last=performance.now()
    let flash=0
    const jump=()=>{
      if(gameOver){
        obstacles=[]; coins=[]; scoreL=0; level=1; speed=4.8; combo=0; gameOver=false; setScore(0); playerY=groundY-22; vy=0; jumps=0; onGround=true; particles.clear(); playTone(620,0.1,'square',0.14); return
      }
      if(jumps<maxJumps){
        vy = jumps===0 ? -11.2 : -9.6
        jumps++; onGround=false
        playTone(jumps===1?720:860,0.09,'sine',0.13)
        for(let i=0;i<4;i++) particles.push({x:70+11,y:playerY+22,vx:(Math.random()-0.5)*2,vy:Math.random()*2+0.8,life:1,c:'#00ffff',size:2.2})
      }
    }
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '||k==='w'||k==='arrowup') jump()
    }
    window.addEventListener('keydown', onKey)
    const onPress=()=> jump()
    c.addEventListener('mousedown', onPress)
    c.addEventListener('touchstart', (e)=>{ e.preventDefault(); jump()}, {passive:false} as any)
    const update=()=>{
      const now=performance.now()
      const dt=Math.min(32, now-last)/16.66
      last=now
      if(flash>0) flash-=0.08*dt
      if(isStartedRef.current===false) return
      if(gameOver) return
      frame++
      // input also via createInput space
      if(input.keys[' ']||input.keys['w']||input.keys['arrowup']){
        // debounce: only jump on keydown edge? simple throttle
        // handled by keydown already so ignore
      }
      if(input.mouse.down){
        // also jump handled via mousedown, but allow hold? throttle
      }
      scoreL+= speed*0.19*dt
      // level every 450 pts
      const newLevel=Math.floor(scoreL/520)+1
      if(newLevel!==level){ level=newLevel; speed=Math.min(11, 4.8 + level*0.68); playTone(880,0.14,'square',0.16); flash=1 }
      // physics
      vy+=gravity*dt; playerY+=vy*dt
      if(playerY>=groundY-22){
        playerY=groundY-22; vy=0; onGround=true; jumps=0
      } else {
        onGround=false
      }
      // spawn obstacles with variety
      spawnTimer+=dt
      const interval=Math.max(44, 92 - speed*4.2 - level*1.2)
      if(spawnTimer>interval){
        spawnTimer=0
        const r=Math.random()
        let kind:0|1|2 =0
        if(r>0.82) kind=2
        else if(r>0.52) kind=1
        else kind=0
        const h = kind===2? 34+Math.random()*8 : kind===1? 22+Math.random()*10 : 18+Math.random()*18
        const w = kind===2? 18: 14+Math.random()*16
        obstacles.push({x:W+12,w,h,kind})
        // coins between obstacles
        if(Math.random()<0.62){
          const cy = groundY - h - 22 - (kind===2? 30:12) - Math.random()*18
          coins.push({x:W+12+ w/2, y:Math.max(24, cy), r:7, alive:true, vy:0})
        }
      }
      obstacles.forEach(o=> o.x-=speed*dt)
      obstacles=obstacles.filter(o=>o.x+o.w>-22)
      coins.forEach(co=>{ co.x-=speed*dt; co.vy+=0.06*dt; co.y+=Math.sin(frame*0.08+co.x*0.01)*0.6*dt })
      // collision obstacles
      const px=70, pw=22, ph=22
      for(const o of obstacles){
        if(px+pw>o.x+2 && px<o.x+o.w-2 && playerY+ph> groundY-o.h && playerY<groundY){
          // precise: spike has narrower hitbox
          let hit=true
          if(o.kind===1){
            // spike triangle - check tip
            const tipX=o.x+o.w/2, tipW=10
            if(px+pw < tipX-tipW || px > tipX+tipW) hit=false
          }
          if(hit){
            gameOver=true
            playTone(140,0.34,'sawtooth',0.18)
            for(let i=0;i<14;i++) particles.push({x:px+pw/2,y:playerY+ph/2,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7-1,life:1,c:'#ff3355',size:3})
            if(scoreL>bestRef.current){ saveBest('neo_runner_best',Math.floor(scoreL)); setBest(Math.floor(scoreL)); bestRef.current=Math.floor(scoreL) }
            onScoreRef.current(Math.floor(scoreL))
            break
          }
        }
      }
      // coins collection
      for(const co of coins){
        if(!co.alive) continue
        const dx=(px+pw/2)-co.x, dy=(playerY+ph/2)-co.y
        if(Math.sqrt(dx*dx+dy*dy)< 16){
          co.alive=false
          combo++; const bonus=10 + Math.min(30, combo*2)
          scoreL+= bonus; setScore(Math.floor(scoreL)); if(scoreL>bestRef.current) onScoreRef.current(Math.floor(scoreL))
          playTone(860 + combo*14,0.08,'sine',0.12)
          for(let i=0;i<5;i++) particles.push({x:co.x,y:co.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3-0.6,life:1,c:'#ffdd00',size:2.4})
        }
      }
      coins=coins.filter(co=>co.alive && co.x>-20)
      // parallax
      hills.forEach(h=>{ h.x-=speed*h.par*dt; if(h.x+h.w< -20){ h.x=W+20; h.h=18+Math.random()*18; h.w=120+Math.random()*60 } })
      stars.forEach(s=>{ s.x-=speed*0.14*dt; if(s.x<0){ s.x=W; s.y=Math.random()*H*0.55 } })
      particles.update()
    }
    const draw=(paused:boolean)=>{
      // fondo
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // subtle grid
      ctx.strokeStyle='rgba(0,255,255,0.03)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=48){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      // stars
      for(const s of stars){ ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,Math.PI*2); ctx.fill() }
      // moon + level flash
      ctx.fillStyle= flash>0? `rgba(255,240,180,${0.14+flash*0.12})`:'rgba(255,255,210,0.11)'; ctx.beginPath(); ctx.arc(W-68,52,26,0,Math.PI*2); ctx.fill()
      if(flash>0){ ctx.strokeStyle=`rgba(255,255,255,${flash*0.18})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(W-68,52,26+flash*10,0,Math.PI*2); ctx.stroke() }
      // distant hills/neon
      for(const h of hills){
        ctx.fillStyle='rgba(0,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(h.x, groundY); ctx.lineTo(h.x+h.w/2, groundY - h.h); ctx.lineTo(h.x+h.w, groundY); ctx.closePath(); ctx.fill()
      }
      // ground
      ctx.fillStyle='#0f1a2e'; ctx.fillRect(0,groundY,W,H-groundY)
      ctx.fillStyle='rgba(0,255,255,0.14)'; ctx.fillRect(0,groundY,W,2)
      ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let x= -(frame*speed)%40; x<W; x+=40){ ctx.beginPath(); ctx.moveTo(x,groundY); ctx.lineTo(x+18,H); ctx.stroke() }
      // obstacles with kind
      for(const o of obstacles){
        const y0=groundY - o.h
        let col='#00ffff'
        if(o.kind===1) col='#ff00ff'
        if(o.kind===2) col='#ffdd00'
        const grad=ctx.createLinearGradient(o.x,y0,o.x+o.w,y0+o.h)
        grad.addColorStop(0,col); grad.addColorStop(1,'#0a0a1a')
        ctx.fillStyle=grad; ctx.shadowColor=col; ctx.shadowBlur=9
        ctx.beginPath(); (ctx as any).roundRect(o.x,y0,o.w,o.h,4); ctx.fill(); ctx.shadowBlur=0
        if(o.kind===1){
          ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.moveTo(o.x+o.w/2,y0-6); ctx.lineTo(o.x+3,y0); ctx.lineTo(o.x+o.w-3,y0); ctx.closePath(); ctx.fill()
          // glow line interior
          ctx.strokeStyle='rgba(255,0,255,0.35)'; ctx.lineWidth=1; ctx.strokeRect(o.x+2,y0+4, o.w-4, o.h-8)
        }
        if(o.kind===2){
          // high barrier with hole to double-jump over
          ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(o.x+2,y0+10,o.w-4,4)
        } else {
          ctx.fillStyle='rgba(255,255,255,0.16)'; ctx.fillRect(o.x,y0,o.w,2)
        }
      }
      // coins neon
      for(const co of coins){
        const t=frame*0.12 + co.x*0.02
        const scale=Math.abs(Math.cos(t))
        ctx.save(); ctx.translate(co.x,co.y); ctx.scale(scale,1)
        ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=10
        ctx.beginPath(); ctx.arc(0,0,co.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.font='900 8px Orbitron'; ctx.textAlign='center'; ctx.fillText('$',0,2.5)
        ctx.restore()
        // orbit glow
        ctx.strokeStyle='rgba(255,221,0,0.18)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(co.x,co.y, co.r+4, 0, Math.PI*2); ctx.stroke()
      }
      // player with double-jump shadow
      ctx.save(); ctx.translate(70, playerY)
      const ttilt = gameOver? 0.24: vy*0.018
      ctx.rotate(ttilt)
      // shadow on ground
      const shadowDist= groundY - (playerY+22)
      const shadowAlpha=Math.max(0, 0.35 - shadowDist*0.008)
      ctx.fillStyle=`rgba(0,0,0,${shadowAlpha})`; ctx.beginPath(); ctx.ellipse(11, 22+shadowDist, 13,4,0,0,Math.PI*2); ctx.fill()
      const bodyGrad=ctx.createLinearGradient(0,0,22,22); bodyGrad.addColorStop(0,'#ffffff'); bodyGrad.addColorStop(1,'#00ffff')
      ctx.fillStyle=bodyGrad; ctx.shadowColor='#00ffff'; ctx.shadowBlur=13
      ctx.beginPath(); (ctx as any).roundRect(0,0,22,22,6); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#0a0a2a'; ctx.fillRect(4,5,14,6)
      ctx.fillStyle='#00ffff'; ctx.fillRect(6,7,8,2)
      // jet trail if jumping
      if(!onGround){
        ctx.fillStyle='rgba(0,255,255,0.45)'; ctx.beginPath(); ctx.arc(6,18, 3+ Math.abs(vy)*0.1,0,Math.PI*2); ctx.fill()
      }
      const legOffset = onGround? Math.sin(frame*0.62)*3.2 : 0
      ctx.fillStyle='#ffffff'; ctx.fillRect(3,22,6,4+legOffset*0.28); ctx.fillRect(13,22,6,4-legOffset*0.28)
      // double jump indicator ring
      if(jumps===1){ ctx.strokeStyle='rgba(0,255,255,0.45)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(11,11,16,0,Math.PI*2); ctx.stroke() }
      ctx.restore()
      particles.draw(ctx)
      // combo coin
      if(combo>2){
        ctx.fillStyle='#ffdd00'; ctx.font='900 12px Orbitron'; ctx.textAlign='left'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=8
        ctx.fillText(`COMBO x${combo}`, 12, 18); ctx.shadowBlur=0
      }
      // speed lines
      if(speed>6.5){
        ctx.strokeStyle='rgba(0,255,255,0.12)'; ctx.lineWidth=2
        for(let i=0;i<3;i++){ const x=(frame*speed*0.82 + i*88)%W; ctx.beginPath(); ctx.moveTo(x,58+i*12); ctx.lineTo(x-28,58+i*12); ctx.stroke() }
      }
      // HUD level
      ctx.fillStyle='rgba(255,255,255,0.52)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='right'
      ctx.fillText(`NIVEL ${level}  VEL ${speed.toFixed(1)}`, W-12, 18)
      if(paused){
        ctx.fillStyle='rgba(8,10,20,0.72)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.fillText('PAUSA',W/2,H/2-6); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.78)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Espacio / Click / Touch para saltar • Doble salto disponible',W/2,H/2+16)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.58)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=12; ctx.fillText('CAÍDA',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 12px JetBrains Mono'; ctx.fillText(`DIST ${Math.floor(scoreL)} m  NIVEL ${level}`,W/2,H/2+10)
        ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Click / Espacio / Touch para reiniciar',W/2,H/2+26)
      }
    }
    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(true); return }
      if(gameOver){ draw(false); return }
      update(); draw(false)
    }
    loop()
    return()=>{ cancelAnimationFrame(raf); input.cleanup(); window.removeEventListener('keydown', onKey); c.removeEventListener('mousedown', onPress)}
  },[])
  return <div className="flex flex-col items-center gap-3 w-full max-w-[480px]"><canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[12/7]"/><div className="flex gap-2 w-full"><div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">DISTANCIA</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score} m</span></div><div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best} m</div></div><p className="text-[11px] text-white/50 font-mono">Espacio / Click / Touch doble salto • Monedas $ combo • Obstáculos ↑</p></div>
}
