import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function RacingEliteGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_racingelite_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,360,560)
    const lanes=[52,130,208,286] // 4? spec says 3 carriles elite -> use 3 center but allow 4 for traffic
    const LANE3=[W/2-72, W/2, W/2+72] // true elite 3 lanes
    const particles=createParticlePool(64)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let scoreL=0, levelL=1, speed=4.2, gameOver=false, paused=false
    let laneIdx=1 // 0..2
    let targetX=LANE3[laneIdx], carX=LANE3[laneIdx], carY=H-84, drift=0, nitro=0, nitroCharge=100, coins=0
    let shake=0
    type Car={lane:number,y:number,w:number,h:number,sp:number, color:string}
    let traffic:Car[]=[]
    type Coin={x:number,y:number,alive:boolean}
    let coinList:Coin[]=[]
    let boss: {y:number, lane:number, hp:number} |null=null
    let bossTimer=0

    const spawnTraffic=()=>{
      // spawn with evade behaviour: traffic that avoids player lane 30%
      const lane=Math.floor(Math.random()*3)
      const sp= 2.2 + Math.random()*1.6 + levelL*0.35
      const colors=['#ff3366','#ff00ff','#00aaff','#ffdd00']
      traffic.push({lane, y:-42, w:48,h:72, sp, color: colors[Math.floor(Math.random()*4)]})
    }
    const spawnCoin=()=>{
      const lane=Math.floor(Math.random()*3)
      coinList.push({x:LANE3[lane],y:-18,alive:true})
    }

    const reset=()=>{
      laneIdx=1; targetX=LANE3[1]; carX=LANE3[1]; scoreL=0; levelL=1; speed=4.2; traffic=[]; coinList=[]; boss=null; bossTimer=0; nitro=0; nitroCharge=100; coins=0; drift=0; gameOver=false; paused=false; particles.clear(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const moveLane=(dir:number)=>{
      if(gameOver) return
      laneIdx=Math.max(0,Math.min(2,laneIdx+dir))
      targetX=LANE3[laneIdx]
      drift= dir* 8
      playTone(520,0.07,'square',0.11)
    }
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='arrowleft'||k==='a'){ moveLane(-1) }
      if(k==='arrowright'||k==='d'){ moveLane(1) }
      if(k===' '||k==='w'||k==='arrowup'){
        if(nitroCharge>18){ nitro=90; playTone(880,0.14,'square',0.14) }
      }
      if(k==='r'){ reset(); return }
      if(k==='p'){ if(!gameOver) paused=!paused; return }
    }
    window.addEventListener('keydown', onKey)
    let touchStart=0
    const onTouchStart=(e:TouchEvent)=> touchStart=e.touches[0].clientX
    const onTouchEnd=(e:TouchEvent)=>{
      const dx=e.changedTouches[0].clientX - touchStart
      if(Math.abs(dx)>22){ moveLane(dx>0?1:-1) }
      else { if(nitroCharge>18) nitro=90 }
    }
    c.addEventListener('touchstart', onTouchStart as any, {passive:true} as any)
    c.addEventListener('touchend', onTouchEnd as any)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // road perspective neon
      const roadLeft=W/2-118, roadW=236
      // asphalt
      ctx.fillStyle='#0f1120'; ctx.fillRect(roadLeft,0,roadW,H)
      // lane markers dashed with scroll
      ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=2; ctx.setLineDash([18,18])
      const off= (frame* speed*1.4)%36
      for(let i=1;i<3;i++){
        const x= LANE3[i] -36 // line between lanes
        // draw segmented
        ctx.beginPath(); ctx.moveTo(x, -off); ctx.lineTo(x, H+36); ctx.stroke()
      }
      ctx.setLineDash([])
      // side barriers neon
      ctx.fillStyle='rgba(0,255,255,0.08)'; ctx.fillRect(roadLeft-8,0,8,H); ctx.fillRect(roadLeft+roadW,0,8,H)
      ctx.strokeStyle='#00ffff'; ctx.lineWidth=1.5; ctx.strokeRect(roadLeft,0,roadW,H)
      // coins
      for(const co of coinList){
        if(!co.alive) continue
        ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=10
        ctx.beginPath(); ctx.arc(co.x, co.y, 10,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#ffaa00'; ctx.beginPath(); ctx.arc(co.x-3, co.y-3,3,0,Math.PI*2); ctx.fill()
      }
      // boss car (big)
      if(boss){
        ctx.fillStyle='#ff3366'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=14
        ctx.beginPath(); (ctx as any).roundRect(LANE3[boss.lane]-32, boss.y,64,86,8); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 9px Orbitron'; ctx.textAlign='center'; ctx.fillText('BOSS', LANE3[boss.lane], boss.y+20)
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(LANE3[boss.lane]-24,boss.y+54,48,6)
        ctx.fillStyle='#ffdd00'; ctx.fillRect(LANE3[boss.lane]-24,boss.y+54,48*(boss.hp/4),6)
      }
      // traffic cars elite with evade
      for(const t of traffic){
        const x=LANE3[t.lane]-24, y=t.y
        ctx.fillStyle=t.color; ctx.shadowColor=t.color; ctx.shadowBlur=8
        ctx.beginPath(); (ctx as any).roundRect(x,y,t.w,t.h,7); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(x+6,y+12,36,10)
        ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(x+4,y+4,40,3)
        // headlights
        ctx.fillStyle='#ffdd88'; ctx.fillRect(x+8,y+t.h-6,10,4); ctx.fillRect(x+30,y+t.h-6,10,4)
      }
      // player car with drift lean & nitro
      const lean= (targetX - carX)*0.12 + drift*0.06
      ctx.save(); ctx.translate(carX+ (shake? (Math.random()-0.5)*shake:0), carY); ctx.rotate(lean*0.06)
      if(nitro>0){ ctx.shadowColor='#ff00ff'; ctx.shadowBlur=18 }
      else { ctx.shadowColor='#00ffff'; ctx.shadowBlur=12 }
      ctx.fillStyle= nitro>0?'#ff00ff':'#00ffff'
      ctx.beginPath(); (ctx as any).roundRect(-24,-36,48,72,8); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#003333'; ctx.fillRect(-18,-18,36,22)
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(-18,18,36,3)
      if(nitro>0){
        ctx.fillStyle='#ff00ff'; ctx.beginPath(); ctx.moveTo(-14,36); ctx.lineTo(-8,52); ctx.lineTo(8,52); ctx.lineTo(14,36); ctx.closePath(); ctx.fill()
        ctx.fillStyle='#fff'; ctx.globalAlpha=0.7; ctx.fillRect(-10,38,20,10); ctx.globalAlpha=1
      }
      ctx.fillStyle='#111'; ctx.fillRect(-22,22,10,8); ctx.fillRect(12,22,10,8)
      ctx.restore()

      // drift sparks
      if(Math.abs(drift)>4){
        for(let i=0;i<2;i++) particles.push({x:carX + (Math.random()-0.5)*12, y:carY+30, vx:(Math.random()-0.5)*4, vy:Math.random()*2+1, life:1,c:'#00ffff',size:2})
      }

      particles.draw(ctx)
      // road vignette
      const vg=ctx.createLinearGradient(0,0,0,H)
      vg.addColorStop(0,'rgba(0,0,0,0.22)'); vg.addColorStop(0.5,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.42)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)

      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,22)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}`,8,15)
      ctx.textAlign='center'; ctx.fillStyle='#ffdd00'; ctx.font='900 11px Orbitron'; ctx.fillText(`${scoreL}`,W/2,15)
      ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='10px JetBrains Mono'; ctx.fillText(`COINS ${coins}`,W-8,15)
      // nitro bar
      ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(8,H-14,120,8)
      ctx.fillStyle= nitro>0?'#ff00ff':'#00ffff'; ctx.fillRect(8,H-14,120*(nitroCharge/100),8)
      ctx.fillStyle='#fff'; ctx.font='700 8px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NITRO ${nitro>0?'BOOST':''}`,10,H-8)

      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡CHOQUE!',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar • Espacio nitro',W/2,H/2+30)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      const effSpeed= nitro>0? speed*1.7 : speed
      // smooth lane lerp
      carX += (targetX - carX)*0.26
      drift*=0.86
      if(Math.abs(drift)<0.1) drift=0
      if(nitro>0){ nitro--; nitroCharge-=0.42; if(nitroCharge<0) nitroCharge=0 }
      else {
        nitroCharge=Math.min(100, nitroCharge+0.18 + levelL*0.02)
      }
      if(shake>0) shake*=0.86

      // spawn logic with evade: occasionally traffic in player lane will change lane to avoid?
      if(frame% Math.max(18, 38 - levelL*2)===0) spawnTraffic()
      if(frame% 44===0 && Math.random()<0.6) spawnCoin()
      bossTimer++
      if(bossTimer> 520 && levelL>=2 && !boss && Math.random()<0.009){
        boss={y:-90, lane:1, hp:4}; bossTimer=0; playTone(320,0.18,'sawtooth',0.13)
      }

      // move traffic with simple evade AI: if traffic is ahead of player within 120px and same lane, 40% chance to dodge to adjacent lane
      for(const t of traffic){
        // evade
        if(Math.abs(t.y - carY)<132 && t.lane===laneIdx && Math.random()<0.012){
          // try adjacent lane that is free
          const candidates=[t.lane-1,t.lane+1].filter(l=>l>=0&&l<3)
          const free=candidates.filter(l=> !traffic.some(o=> o!==t && o.lane===l && Math.abs(o.y - t.y)< 80))
          if(free.length){ t.lane=free[0]; playTone(400,0.06,'triangle',0.07) }
        }
        t.y+= t.sp * (effSpeed/4.2)
      }
      for(const co of coinList) co.y+= effSpeed
      if(boss){
        boss.y+= effSpeed*0.95
        // boss occasionally changes lane to ram player
        if(frame% 38===0 && Math.random()<0.45){
          boss.lane=laneIdx
        }
        if(boss.y>H+20) boss=null
      }
      traffic=traffic.filter(t=> t.y < H+100)
      coinList=coinList.filter(co=> co.y < H+20 && co.alive)

      // collisions
      for(const t of traffic){
        if(Math.abs(t.y - carY)< 54 && t.lane===laneIdx){
          // hit
          if(nitro>0){
            // smash through
            traffic.splice(traffic.indexOf(t),1); scoreL+=25; coins+=2; shake=8
            for(let i=0;i<10;i++) particles.push({x:t.lane===laneIdx? carX: LANE3[t.lane], y:t.y+36, vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:t.color,size:2.6})
            playTone(520,0.12,'square',0.13)
          } else {
            gameOver=true; playTone(120,0.42,'sawtooth',0.16)
            for(let i=0;i<16;i++) particles.push({x:carX,y:carY,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff3366',size:2.8})
            if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_racingelite_best',scoreL); onScoreRef.current(scoreL) }
          }
          break
        }
      }
      if(boss && boss.y+30 > carY-30 && boss.y-30 < carY+30 && boss.lane===laneIdx){
        if(nitro>0){
          boss.hp--; shake=10; scoreL+=40; playTone(740,0.1,'square',0.14)
          for(let i=0;i<12;i++) particles.push({x:LANE3[boss.lane],y:boss.y+40,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ffdd00',size:2.6})
          if(boss.hp<=0){ boss=null; scoreL+=120; coins+=5; playTone(880,0.18,'square',0.15) }
          // push boss back
          if(boss) boss.y-=28
        } else {
          gameOver=true; playTone(100,0.45,'sawtooth',0.16)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_racingelite_best',scoreL); onScoreRef.current(scoreL) }
        }
      }
      // coins
      for(const co of coinList){
        if(Math.abs(co.y - carY)<28 && Math.abs(co.x - carX)<24){
          co.alive=false; coins++; scoreL+=12+levelL*2; nitroCharge=Math.min(100,nitroCharge+7); playTone(880,0.08,'sine',0.11)
          for(let i=0;i<6;i++) particles.push({x:co.x,y:co.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ffdd00',size:2})
        }
      }
      coinList=coinList.filter(c=>c.alive)

      // scoring & level
      if(frame%6===0){
        scoreL+=1 + Math.floor(effSpeed*0.2)
        setScore(scoreL)
        const newLevel=Math.floor(scoreL/260)+1
        if(newLevel!==levelL){ levelL=newLevel; setLevel(levelL); speed=Math.min(8.2, 4.2+levelL*0.48); playTone(660,0.14,'triangle',0.12) }
        if(scoreL>bestRef.current) onScoreRef.current(scoreL)
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
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full" style={{aspectRatio:'360/560'}} width={360} height={560}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">A/D o Swipe cambia carril • Espacio/Click nitro (carga) • 3 carriles • Tráfico esquiva • Boss car</p>
    </div>
  )
}
