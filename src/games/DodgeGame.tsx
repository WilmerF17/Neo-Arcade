import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function DodgeGame({onScore, isStarted}:{onScore:(s:number)=>void,isStarted?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_dodge_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{
    const c=canvasRef.current!; const {ctx,W,H}=setupCanvas(c,400,360)
    const particles=createParticlePool(48)
    const input=createInput(c,W,H)
    let raf=0, scoreL=0, level=1, gameOver=false
    let playerX=W/2, playerY=H-28
    let shards:{x:number,y:number,w:number,h:number,vy:number,rot:number,vr:number,kind:0|1}[]=[]
    let stars:{x:number,y:number,s:number}[] = Array.from({length:26},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.3+0.5}))
    let frame=0, speed=2.25, spawn=0, invuln=0, wave=0, waveTimer=0
    let last=performance.now(), shake=0
    const reset=()=>{
      shards=[]; scoreL=0; level=1; speed=2.25; spawn=0; invuln=85; wave=0; waveTimer=0; gameOver=false; setScore(0); particles.clear(); playTone(640,0.1,'square',0.14)
    }
    const emit=(x:number,y:number,c:string,n=9)=>{
      for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7-0.8,life:1,c,size:2.7})
    }
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r' && gameOver){ reset() }
      if(k===' ' && gameOver){ reset() }
    }
    window.addEventListener('keydown', onKey)
    const onClick=()=>{ if(gameOver) reset() }
    c.addEventListener('mousedown', onClick)
    c.addEventListener('touchstart', onClick as any, {passive:true} as any)
    const update=()=>{
      const now=performance.now()
      const dt=Math.min(32, now-last)/16.66
      last=now
      if(isStartedRef.current===false) return
      if(gameOver) return
      frame++
      if(shake>0) shake-=0.15*dt
      if(invuln>0) invuln-=dt
      // score and level
      scoreL+= 0.14*dt + level*0.02*dt
      const newLevel=Math.floor(scoreL/72)+1
      if(newLevel!==level){ level=newLevel; playTone(880,0.12,'sine',0.14) }
      speed+=0.0017*dt
      const curSpeed=speed + level*0.18
      // input: mouse via createInput + keys
      const keys=input.keys
      if(keys['arrowleft']||keys['a']) playerX-=7.2*dt
      if(keys['arrowright']||keys['d']) playerX+=7.2*dt
      if(!keys['arrowleft']&&!keys['a']&&!keys['arrowright']&&!keys['d']){
        // mouse follow with slight lerp
        playerX += (input.mouse.x - playerX)*0.20*dt
      }
      playerX=Math.max(16,Math.min(W-16,playerX))
      // wave spawning: oleadas con burst
      waveTimer+=dt
      spawn+=dt
      const interval=Math.max(8, 28 - curSpeed*2.2 - level*0.6)
      if(waveTimer> 180){
        waveTimer=0; wave=(wave+1)%3
        // burst extra
        for(let i=0;i< 4+level;i++){
          const w=13+Math.random()*18, h=12+Math.random()*13
          const x= Math.random()*(W-w)
          const vy= curSpeed + Math.random()*2.2
          shards.push({x,y:-20-Math.random()*40,w,h,vy,rot:Math.random()*Math.PI,vr:(Math.random()-0.5)*0.20, kind: wave===1?1:0})
        }
        playTone(440+wave*60,0.07,'square',0.09)
      }
      if(spawn>interval){
        spawn=0
        const w=14+Math.random()*17
        const x=Math.random()*(W-w)
        const h=11+Math.random()*13
        // 30% are invuln piercing red
        const kind:0|1 = Math.random()<0.18?1:0
        shards.push({x,y:-18,w,h,vy: curSpeed + Math.random()*2.0, rot:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.18, kind})
      }
      // move shards
      for(const s of shards){ s.y+=s.vy*dt; s.rot+=s.vr*dt }
      // collision with invencibilidad parpadeo
      const px=playerX, py=playerY
      const canHit= invuln<=0 || Math.floor(invuln/4)%2===0 // blink, but still need check? invuln blocks
      if(invuln<=0){
        for(const s of shards){
          if(px+12 > s.x && px-12 < s.x+s.w && py+12 > s.y && py-12 < s.y+s.h){
            gameOver=true
            emit(px,py,'#00ffff',12)
            shake=5
            playTone(120,0.38,'sawtooth',0.18)
            if(Math.floor(scoreL)>bestRef.current){ saveBest('neo_dodge_best',Math.floor(scoreL)); setBest(Math.floor(scoreL)); bestRef.current=Math.floor(scoreL) }
            onScoreRef.current(Math.floor(scoreL))
            break
          }
          // piercing red can bypass invuln after spawn (just visual distinction)
          if(s.kind===1 && s.vy>curSpeed+1.2){
            // keep same collision - no bypass yet, but more dangerous
          }
        }
      } else {
        // during invuln, absorb near shards for bonus
        for(let i=shards.length-1;i>=0;i--){
          const s=shards[i]
          if(Math.abs(s.x+s.w/2 - px)<18 && Math.abs(s.y+s.h/2 - py)<18){
            shards.splice(i,1)
            scoreL+=3; setScore(Math.floor(scoreL))
            emit(s.x+s.w/2,s.y+s.h/2,'#00ff88',4)
          }
        }
      }
      shards=shards.filter(s=>s.y < H+34)
      // level also removes slowest? not needed
      setScore(Math.floor(scoreL))
      if(Math.floor(scoreL)>bestRef.current) onScoreRef.current(Math.floor(scoreL))
      particles.update()
    }
    const draw=(paused:boolean)=>{
      ctx.save()
      if(shake>0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake)
      const hue=(frame*1.18)%360
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // subtle stars
      for(const s of stars){ ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc((s.x+frame*0.08)%W, s.y, s.s,0,Math.PI*2); ctx.fill() }
      // RGB wash
      ctx.fillStyle=`hsla(${hue},100%,60%,0.035)`; ctx.fillRect(0,0,W,H)
      // grid drift
      ctx.strokeStyle='rgba(0,255,255,0.05)'; ctx.lineWidth=1
      for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo((i+ frame*0.55)%W,0); ctx.lineTo(i, H); ctx.stroke() }
      // horizontal scan
      ctx.strokeStyle='rgba(255,0,255,0.04)'; for(let y=0;y<H;y+=36){ ctx.beginPath(); ctx.moveTo(0,y+ (frame*0.3%36)); ctx.lineTo(W, y+(frame*0.3%36)); ctx.stroke() }
      // shards RGB
      for(const s of shards){
        ctx.save(); ctx.translate(s.x+s.w/2, s.y+s.h/2); ctx.rotate(s.rot)
        const baseHue= s.kind===1? 0 : (hue + s.x*0.6)%360
        const col= s.kind===1? `hsl(${baseHue},100%,58%)` : `hsl(${baseHue},100%,60%)`
        const grad=ctx.createLinearGradient(-s.w/2,-s.h/2,s.w/2,s.h/2); grad.addColorStop(0,col); grad.addColorStop(1,'#ffffff')
        ctx.fillStyle=grad; ctx.shadowColor=col; ctx.shadowBlur= s.kind===1?12:8
        // fragment shape: slightly irregular
        ctx.beginPath()
        ctx.moveTo(-s.w/2, -s.h/2); ctx.lineTo(s.w/2-2, -s.h/2+3); ctx.lineTo(s.w/2, s.h/2-2); ctx.lineTo(-s.w/2+3, s.h/2); ctx.closePath(); ctx.fill()
        ctx.shadowBlur=0
        // inner shine
        ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(-s.w/2, -s.h/2, s.w,2)
        ctx.restore()
      }
      // player RGB orb with invuln blink
      const blinkOn = invuln>0 ? Math.floor(invuln/5)%2===0 : true
      if(blinkOn){
        ctx.save(); ctx.translate(playerX, playerY)
        // outer glow
        ctx.fillStyle=`hsl(${hue},100%,60%)`; ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur= invuln>0?24:16
        ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.96)'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill()
        // inner core blink during invuln
        if(invuln>0){
          ctx.strokeStyle='rgba(0,255,136,0.95)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.stroke()
        }
        ctx.strokeStyle=`hsla(${hue},100%,60%,0.22)`; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(14,0); ctx.stroke()
        ctx.restore()
      }
      particles.draw(ctx)
      // wave indicator
      ctx.fillStyle='rgba(255,255,255,0.46)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='left'
      ctx.fillText(`OLEADA ${wave+1}  NIVEL ${level}  VEL ${(speed+level*0.18).toFixed(2)}`, 10, 18)
      if(invuln>0){
        ctx.fillStyle='#00ff88'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='right'
        ctx.fillText(`ESCUDO ${(invuln/60).toFixed(1)}s`, W-10, 18)
      }
      if(paused){
        ctx.fillStyle='rgba(8,10,20,0.74)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.fillText('PAUSA',W/2,H/2-6); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Mouse / ←→ mueve • Sobrevive a la tormenta RGB',W/2,H/2+16)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.60)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=12; ctx.fillText('¡IMPACTO!',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 12px JetBrains Mono'; ctx.fillText(`TIEMPO ${Math.floor(scoreL)}  NIVEL ${level}`,W/2,H/2+10)
        ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='11px JetBrains Mono'; ctx.fillText('R / Espacio / Click para reiniciar — inicio invencible',W/2,H/2+26)
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
    return()=>{ cancelAnimationFrame(raf); input.cleanup(); window.removeEventListener('keydown', onKey); c.removeEventListener('mousedown', onClick)}
  },[])
  return <div className="flex flex-col items-center gap-3 w-full max-w-[400px]"><canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[10/9] cursor-none"/><div className="flex gap-2 w-full"><div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">TIEMPO</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div><div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div></div><p className="text-[11px] text-white/50 font-mono">Mouse / ←→ / A-D • Invencible parpadea al inicio • Oleadas RGB</p></div>
}
