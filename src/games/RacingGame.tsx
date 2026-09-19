import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function RacingGame({onScore, isStarted}:{onScore:(s:number)=>void,isStarted?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_racing_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{
    const c=canvasRef.current!; const {ctx,W,H}=setupCanvas(c,360,420)
    const particles=createParticlePool(48)
    const input=createInput(c,W,H)
    let raf=0, scoreL=0, level=1, gameOver=false
    let carX=W/2, carY=H-70, carLane=1, targetLane=1, laneLerp=0
    const lanes=[74, W/2, W-74] // 3 carriles centers
    let roadOffset=0, speed=4.7, nitro=100, nitroActive=false, invuln=0
    let traffic:{x:number,y:number,w:number,h:number,c:string,lane:number,vy:number,changing:boolean, targetLane:number}[]=[]
    let coins:{x:number,y:number,alive:boolean}[]=[]
    let frame=0, spawnTimer=0, last=performance.now(), shake=0
    const emit=(x:number,y:number,cstr:string,n=7)=>{
      for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6-0.8,life:1,c:cstr,size:2.6})
    }
    const reset=()=>{
      traffic=[]; coins=[]; scoreL=0; level=1; speed=4.7; nitro=100; nitroActive=false; invuln=0; gameOver=false; carLane=1; targetLane=1; carX=lanes[1]; setScore(0); particles.clear(); playTone(620,0.1,'square',0.14)
    }
    const snapToLane=(lane:number)=>{
      targetLane=Math.max(0,Math.min(2,lane))
      if(targetLane!==carLane) playTone(560,0.06,'sine',0.11)
    }
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='a'||k==='arrowleft'){ snapToLane(targetLane-1)}
      if(k==='d'||k==='arrowright'){ snapToLane(targetLane+1)}
      if(k==='w'||k==='arrowup'||k===' '){ nitroActive=true }
      if((k==='r'||k==='enter') && gameOver) reset()
    }
    const onKeyUp=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='w'||k==='arrowup'||k===' ' ) nitroActive=false
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    const onCanvasMove=(e:MouseEvent)=>{
      // direct carX not used - map mouse to nearest lane
    }
    // touch/mouse lane tap
    const onTap=(e:MouseEvent|TouchEvent)=>{
      const rect=c.getBoundingClientRect()
      const clientX= (e as TouchEvent).touches? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
      const x=(clientX-rect.left)*(W/rect.width)
      if(x < W*0.33) snapToLane(0)
      else if(x> W*0.66) snapToLane(2)
      else snapToLane(1)
      if(gameOver) reset()
    }
    c.addEventListener('mousedown', onTap as any)
    c.addEventListener('touchstart', onTap as any, {passive:false} as any)
    const update=()=>{
      const now=performance.now()
      const dt=Math.min(32, now-last)/16.66
      last=now
      if(isStartedRef.current===false) return
      if(gameOver) return
      frame++; roadOffset=(roadOffset+speed*dt)%42; if(shake>0) shake-=0.16*dt
      if(invuln>0) invuln-=dt
      // nitro
      if(nitroActive && nitro>0){ nitro=Math.max(0, nitro-0.52*dt); speed=Math.min(12, speed+0.22*dt) } else { nitroActive=false; speed=Math.max(4.7, speed-0.08*dt) }
      if(!nitroActive && nitro<100) nitro=Math.min(100, nitro+0.12*dt)
      // lane smooth
      if(carLane!==targetLane){
        laneLerp+=0.14*dt
        if(laneLerp>=1){ laneLerp=0; carLane=targetLane; carX=lanes[carLane] }
        else {
          carX = lanes[carLane] + (lanes[targetLane]-lanes[carLane]) * (laneLerp<0.5? 4*laneLerp*laneLerp*laneLerp : 1 - Math.pow(-2*laneLerp+2,3)/2) // easeInOutCubic
        }
      } else carX=lanes[carLane]
      // also keys hold nitro check via input
      if(input.keys[' ']||input.keys['w']||input.keys['arrowup']){ nitroActive = nitro>0 }
      // difficulty
      scoreL+= (0.18 + speed*0.02)*dt
      const newLevel=Math.floor(scoreL/68)+1
      if(newLevel!==level){ level=newLevel; playTone(880,0.12,'triangle',0.14) }
      // drift particles when changing lane with nitro
      if(carLane!==targetLane && nitroActive){
        if(frame%2===0) particles.push({x:carX + (Math.random()-0.5)*18,y:carY+16,vx:(Math.random()-0.5)*2,vy:2+Math.random()*2,life:1,c:'#ffdd00',size:2.2})
      }
      // spawn traffic IA
      spawnTimer+=dt
      const interval=Math.max(28, 52 - level*2.2 - speed*0.9)
      if(spawnTimer>interval){
        spawnTimer=0
        // 85% single, 20% double lane block
        const roll=Math.random()
        const lanesFree=[0,1,2].filter(li=> !traffic.some(t=> t.y<48 && t.lane===li))
        if(lanesFree.length>0){
          if(roll<0.16 && lanesFree.length>=2){
            // two lanes block for challenge
            const pick=lanesFree.sort(()=>Math.random()-0.5).slice(0,2)
            for(const li of pick){
              traffic.push({x:lanes[li],y:-40,w:36,h:26,c: ['#ff3355','#00ffff','#ffdd00','#8a2be2'][Math.floor(Math.random()*4)], lane:li, vy:0, changing:false, targetLane:li})
            }
          } else {
            const li=lanesFree[Math.floor(Math.random()*lanesFree.length)]
            traffic.push({x:lanes[li],y:-40,w:36,h:26,c: ['#ff3355','#00ffff','#ffdd00','#8a2be2'][Math.floor(Math.random()*4)], lane:li, vy:0, changing:false, targetLane:li})
          }
        }
        // coin on free lane
        if(Math.random()<0.55){
          const free2=[0,1,2].filter(li=> !traffic.some(t=> Math.abs(t.y+40)<44 && t.lane===li))
          if(free2.length){
            const li=free2[Math.floor(Math.random()*free2.length)]
            coins.push({x:lanes[li],y:-26, alive:true})
          }
        }
      }
      // move traffic
      for(const t of traffic){
        // IA: if another car ahead in same lane, change lane
        const ahead=traffic.find(o=> o!==t && o.lane===t.lane && o.y>t.y && o.y - t.y < 58 && o.y>t.y)
        if(ahead && !t.changing && Math.random()<0.04){
          const options=[0,1,2].filter(li=> li!==t.lane && !traffic.some(o=> Math.abs(o.y - t.y)<38 && o.lane===li))
          if(options.length){
            t.targetLane=options[Math.floor(Math.random()*options.length)]
            t.changing=true
          }
        }
        let vy = speed*0.88 + (t.changing?0.2:0)
        // slower traffic than player, but with slight variance
        t.y+=vy*dt
        if(t.changing){
          const dest=lanes[t.targetLane]
          const dir=Math.sign(dest - t.x)
          t.x+= dir*2.2*dt
          if(Math.abs(t.x - dest)<2){ t.x=dest; t.lane=t.targetLane; t.changing=false }
        }
      }
      for(const co of coins){ co.y+=speed*dt }
      traffic=traffic.filter(t=>t.y<H+44)
      coins=coins.filter(co=> co.y<H+40 && co.alive)
      // collision with traffic
      if(invuln<=0){
        for(const t of traffic){
          if(Math.abs(carX - t.x)< 30 && Math.abs(carY - t.y)< 22){
            if(nitroActive && nitro>18){
              // nitro smash destroys traffic
              emit(t.x,t.y,t.c,10); t.y=H+100; scoreL+=18; setScore(Math.floor(scoreL)); shake=3; playTone(300,0.12,'square',0.14)
            } else {
              gameOver=true; shake=6; emit(carX,carY,'#ff3355',14); playTone(120,0.38,'sawtooth',0.18)
              if(Math.floor(scoreL)>bestRef.current){ saveBest('neo_racing_best',Math.floor(scoreL)); setBest(Math.floor(scoreL)); bestRef.current=Math.floor(scoreL) }
              onScoreRef.current(Math.floor(scoreL))
              break
            }
          }
        }
      }
      // coins
      for(const co of coins){
        if(Math.abs(carX - co.x)<18 && Math.abs(carY - co.y)<18 && co.alive){
          co.alive=false; scoreL+=12; nitro=Math.min(100, nitro+9); setScore(Math.floor(scoreL)); if(Math.floor(scoreL)>bestRef.current) onScoreRef.current(Math.floor(scoreL))
          emit(co.x,co.y,'#ffdd00',6); playTone(820,0.08,'sine',0.12)
        }
      }
      coins=coins.filter(co=>co.alive)
      setScore(Math.floor(scoreL)); if(Math.floor(scoreL)>bestRef.current) onScoreRef.current(Math.floor(scoreL))
      particles.update()
    }
    const draw=(paused:boolean)=>{
      ctx.save()
      if(shake>0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake)
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid subtle background sky
      ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fillRect(0,0,W,54)
      // road
      ctx.fillStyle='#0a0e1a'; ctx.fillRect(0,0,W,H)
      // grass
      ctx.fillStyle='#0a1a0a'; ctx.fillRect(0,0,34,H); ctx.fillRect(W-34,0,34,H)
      ctx.fillStyle='#1a1a1e'; ctx.fillRect(34,0,W-68,H)
      // road border
      ctx.strokeStyle='rgba(255,221,0,0.9)'; ctx.lineWidth=2; ctx.strokeRect(34,0,W-68,H)
      // lane lines with offset
      ctx.strokeStyle='rgba(255,255,255,0.88)'; ctx.lineWidth=3; ctx.setLineDash([18,18])
      ctx.lineDashOffset= -roadOffset
      ctx.beginPath(); ctx.moveTo(W/2-36,0); ctx.lineTo(W/2-36,H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(W/2+36,0); ctx.lineTo(W/2+36,H); ctx.stroke()
      ctx.setLineDash([]); ctx.lineDashOffset=0
      // side dashes
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.setLineDash([8,8])
      ctx.beginPath(); ctx.moveTo(34, -roadOffset); ctx.lineTo(34, H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(W-34, -roadOffset); ctx.lineTo(W-34, H); ctx.stroke()
      ctx.setLineDash([])
      // traffic
      for(const t of traffic){
        ctx.fillStyle=t.c; ctx.shadowColor=t.c; ctx.shadowBlur=8
        ctx.beginPath(); (ctx as any).roundRect(t.x-18, t.y-13, t.w, t.h,6); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillRect(t.x-11, t.y-7,22,4)
        ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(t.x-14, t.y+6,28,3)
      }
      // coins
      for(const co of coins){
        ctx.save(); ctx.translate(co.x, co.y); ctx.rotate(frame*0.08)
        ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=10
        ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='800 7px Orbitron'; ctx.textAlign='center'; ctx.fillText('◈',0,2)
        ctx.restore()
      }
      // car with nitro drift glow
      ctx.save(); ctx.translate(carX, carY)
      const isBlinking = invuln>0 && Math.floor(invuln/6)%2===0
      if(!isBlinking){
        if(nitroActive){ ctx.fillStyle='rgba(255,221,0,0.28)'; ctx.beginPath(); ctx.ellipse(0,18,18,9,0,0,Math.PI*2); ctx.fill() }
        ctx.fillStyle='#00ffff'; ctx.shadowColor= nitroActive?'#ffdd00':'#00ffff'; ctx.shadowBlur= nitroActive?16:10
        ctx.beginPath(); (ctx as any).roundRect(-18,-16,36,32,8); ctx.fill(); ctx.shadowBlur=0
        // cockpit
        ctx.fillStyle='#0a0a14'; ctx.beginPath(); (ctx as any).roundRect(-12,-8,24,14,4); ctx.fill()
        ctx.fillStyle= nitroActive?'#ffdd00':'#00ffff'; ctx.fillRect(-8,-3,16,2)
        // wheels
        ctx.fillStyle='#021a1a'; ctx.fillRect(-18,-12,7,6); ctx.fillRect(11,-12,7,6)
        ctx.fillStyle='#ffdd00'; ctx.fillRect(-14,12,8,4); ctx.fillRect(6,12,8,4)
        // nitro bar on car
        if(nitroActive){ ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.arc(0,16,3,0,Math.PI*2); ctx.fill() }
      }
      ctx.restore()
      particles.draw(ctx)
      // HUD
      ctx.fillStyle='rgba(255,255,255,0.54)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='left'
      ctx.fillText(`NIVEL ${level}  KM/H ${(speed*18).toFixed(0)}`, 10, 18)
      // nitro bar
      ctx.fillStyle='rgba(255,255,255,0.13)'; ctx.fillRect(10,22,80,5)
      ctx.fillStyle=nitroActive?'#ffdd00':'#00ffff'; ctx.fillRect(10,22,80*(nitro/100),5)
      ctx.fillStyle='rgba(255,255,255,0.62)'; ctx.font='9px JetBrains Mono'; ctx.fillText(`NITRO ${Math.floor(nitro)}%`, 10, 36)
      ctx.textAlign='right'; ctx.fillText(`LANE ${carLane+1}/3`, W-10, 18)
      if(paused){
        ctx.fillStyle='rgba(8,10,20,0.74)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.fillText('PAUSA',W/2,H/2-6); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.78)'; ctx.font='11px JetBrains Mono'; ctx.fillText('A/D o tap carril • W/Espacio = NITRO',W/2,H/2+14)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=12; ctx.fillText('¡CHOQUE!',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 12px JetBrains Mono'; ctx.fillText(`SCORE ${Math.floor(scoreL)}  NIVEL ${level}`,W/2,H/2+10)
        ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='11px JetBrains Mono'; ctx.fillText('R / Click carril para reiniciar — Nitro destruye',W/2,H/2+26)
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
    return()=>{ cancelAnimationFrame(raf); input.cleanup(); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); c.removeEventListener('mousedown', onTap as any)}
  },[])
  return <div className="flex flex-col items-center gap-3 w-full max-w-[360px]"><canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[6/7] cursor-pointer"/><div className="flex gap-2 w-full"><div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">DISTANCIA</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score} m</span></div><div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best} m</div></div><p className="text-[11px] text-white/50 font-mono">A/D o tap 3 carriles • Mantén Espacio/W nitro + drift partículas</p></div>
}
