import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function RiderGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_rider_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,480,360)
    const particles=createParticlePool(64)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let scoreL=0, levelL=1, gameOver=false, paused=false, dist=0, fuel=100, airTime=0, flips=0, lastAng=0
    // trail points for track
    type Pt={x:number,y:number}
    let track:Pt[]=[]
    let trackOff=0
    const genTrack=()=>{
      track=[]
      let y=H-68
      for(let x=0;x<W+400;x+=18){
        // ramps every ~120px
        const phase=x*0.012
        let h=Math.sin(phase*0.7)*18 + Math.sin(phase*1.8)*10 + Math.cos(phase*0.33)*12
        // add ramp spike
        if(x%140>60 && x%140<94){ h-= Math.sin((x%140-60)/34*Math.PI)*36 }
        track.push({x, y: y + h})
      }
    }
    genTrack()
    const getHeight=(x:number)=>{
      const idx=Math.floor((x+trackOff)/18)
      const a=track[idx%track.length], b=track[(idx+1)%track.length]
      if(!a||!b) return H-68
      const t=((x+trackOff)%18)/18
      return a.y*(1-t)+b.y*t
    }
    const getSlope=(x:number)=>{
      const h1=getHeight(x-6), h2=getHeight(x+6)
      return Math.atan2(h2-h1,12)
    }
    let bike={x:96, y:getHeight(96)-12, vx:3.2, vy:0, ang:0, angV:0, onGround:true, suspension:0}

    const reset=()=>{
      trackOff=0; genTrack(); bike={x:96,y:getHeight(96)-12,vx:3.2,vy:0,ang:0,angV:0,onGround:true,suspension:0}
      scoreL=0; levelL=1; dist=0; fuel=100; airTime=0; flips=0; lastAng=0; gameOver=false; paused=false; particles.clear(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p'||k===' '){ if(!gameOver) paused=!paused; return }
    }
    window.addEventListener('keydown', onKey)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // sky gradient
      const sky=ctx.createLinearGradient(0,0,0,H)
      sky.addColorStop(0,'#0a1028'); sky.addColorStop(1,'#080a14'); ctx.fillStyle=sky; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.04)'; ctx.lineWidth=1
      for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo((i-frame*0.2)%W,0); ctx.lineTo((i-frame*0.2)%W,H); ctx.stroke() }
      // track neon
      ctx.beginPath()
      for(let x=0;x<W;x++){
        const y=getHeight(x)
        if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
      }
      ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath()
      const grad=ctx.createLinearGradient(0,H-120,0,H)
      grad.addColorStop(0,'#0a2a3a'); grad.addColorStop(1,'#040616')
      ctx.fillStyle=grad; ctx.fill()
      ctx.strokeStyle='#00ffff'; ctx.lineWidth=2.2; ctx.shadowColor='#00ffff'; ctx.shadowBlur=10
      ctx.beginPath()
      for(let x=0;x<W;x++){ const y=getHeight(x); if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) }
      ctx.stroke(); ctx.shadowBlur=0
      // ramps glow
      for(let x=0;x<W;x+=140){
        const rx=x - (trackOff%140)
        if(rx> -20 && rx<W+20){
          const y=getHeight(rx+16)
          ctx.fillStyle='rgba(255,221,0,0.12)'; ctx.fillRect(rx, y, 34, 4)
        }
      }
      // bike with suspension
      const bx=bike.x, by=bike.y
      ctx.save(); ctx.translate(bx,by); ctx.rotate(bike.ang)
      // suspension line
      ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-10, bike.suspension); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(10, bike.suspension); ctx.stroke()
      // body
      ctx.fillStyle='#ff3366'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=10
      ctx.beginPath(); (ctx as any).roundRect(-14,-6,28,10,4); ctx.fill(); ctx.shadowBlur=0
      // rider
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(6,-10,5,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#00ffff'; ctx.fillRect(-2,-10,10,10)
      // wheels
      const wheelOff=bike.suspension
      ctx.fillStyle='#111'; ctx.strokeStyle='#00ffff'; ctx.lineWidth=1.2
      ctx.beginPath(); ctx.arc(-10,wheelOff,7,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.arc(10,wheelOff,7,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(-10,wheelOff,2,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(10,wheelOff,2,0,Math.PI*2); ctx.fill()
      // lean indicator
      ctx.restore()

      // air flip arc
      if(!bike.onGround){
        ctx.strokeStyle='rgba(255,221,0,0.7)'; ctx.lineWidth=1.4; ctx.setLineDash([4,4])
        ctx.beginPath(); ctx.arc(bx, by, 22, -Math.PI/2, -Math.PI/2 + (Math.abs(bike.ang-lastAng))*1.2); ctx.stroke(); ctx.setLineDash([])
      }

      particles.draw(ctx)
      // HUD fuel
      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,22)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}`,8,15)
      ctx.textAlign='center'; ctx.fillStyle='#ffdd00'; ctx.font='900 11px Orbitron'; ctx.fillText(`${scoreL}`,W/2,15)
      const fuelPct=fuel/100
      ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(W-108,6,100,10)
      ctx.fillStyle= fuelPct>0.3?'#00ff88':'#ff3366'; ctx.fillRect(W-108,6,100*fuelPct,10)
      ctx.fillStyle='#fff'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`FUEL ${Math.floor(fuel)}%`,W-58,14)
      if(!bike.onGround && airTime>6){
        ctx.fillStyle='#ffdd00'; ctx.font='900 11px Orbitron'; ctx.textAlign='left'; ctx.fillText(`AIR x${(airTime/20).toFixed(1)}`,8,36)
      }
      if(flips>0){
        ctx.fillStyle='#ff00ff'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff00ff'; ctx.shadowBlur=8; ctx.fillText(`FLIP +${flips*40}`,W/2,36); ctx.shadowBlur=0
      }
      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡CAÍDA!',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Dist ${Math.floor(dist)}m`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar',W/2,H/2+30)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      const keys=input.keys
      // throttle
      let throttle=0.12 + levelL*0.02
      if(keys['w']||keys['arrowup']||keys['d']||keys['arrowright']) throttle+=0.14
      if(keys['s']||keys['arrowdown']||keys['a']||keys['arrowleft']) throttle-=0.08
      bike.vx+=throttle*0.06
      bike.vx=Math.max(1.2, Math.min(7.2, bike.vx))
      // lean controls in air
      if(!bike.onGround){
        if(keys['a']||keys['arrowleft']) bike.angV-=0.008
        if(keys['d']||keys['arrowright']) bike.angV+=0.008
      } else {
        // align to slope
        const slope=getSlope(bike.x)
        bike.ang += (slope - bike.ang)*0.18
        bike.angV*=0.88
      }
      // space = bunny hop / boost
      if((keys[' ']||input.mouse.down) && bike.onGround && frame%10===0){
        bike.vy=-4.2; bike.onGround=false; playTone(520,0.08,'square',0.11)
      }

      trackOff+= bike.vx
      if(trackOff> 400){ trackOff-=400; genTrack() } // regenerate chunk

      // physics
      const groundY=getHeight(bike.x)
      const wasOnGround=bike.onGround
      bike.vy+=0.42 // gravity
      bike.y+=bike.vy
      bike.ang+=bike.angV
      bike.angV*=0.995
      // suspension spring
      const targetSusp= bike.onGround? 2+ Math.sin(frame*0.18)*1 : 0
      bike.suspension += (targetSusp - bike.suspension)*0.22

      if(bike.y+8 >= groundY){
        if(!wasOnGround){
          // landing: check angle
          const landAngDiff=Math.abs(bike.ang - getSlope(bike.x))
          if(landAngDiff>1.0){
            // crash if too rotated
            gameOver=true; playTone(140,0.38,'sawtooth',0.16)
            for(let i=0;i<16;i++) particles.push({x:bike.x,y:bike.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff3366',size:2.6})
            if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_rider_best',scoreL); onScoreRef.current(scoreL) }
          } else {
            // landing bonus from air time & flips
            if(airTime>18){
              const airBonus=Math.floor(airTime*0.6)
              const flipBonus=flips*40
              scoreL+= airBonus+flipBonus; setScore(scoreL)
              if(flips>0) playTone(880,0.16,'triangle',0.14)
              else playTone(640,0.1,'square',0.11)
              for(let i=0;i<8;i++) particles.push({x:bike.x,y:groundY,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*3-1,life:1,c:'#ffdd00',size:2.2})
              if(scoreL>bestRef.current) onScoreRef.current(scoreL)
            }
          }
          // reset flips
          flips=0; lastAng=bike.ang
        }
        bike.y=groundY-8; bike.vy=0; bike.onGround=true; airTime=0
        // friction on slope
        const slope=getSlope(bike.x)
        bike.vx+= Math.sin(slope)*0.14
      } else {
        bike.onGround=false
        airTime++
        // detect flips: accumulate rotation
        const delta=Math.abs(bike.ang-lastAng)
        if(delta> Math.PI*1.85){
          flips++; lastAng=bike.ang; playTone(740+flips*40,0.09,'sine',0.11)
          for(let i=0;i<6;i++) particles.push({x:bike.x,y:bike.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ff00ff',size:2})
        }
      }

      // edges crash? fall below?
      if(bike.y>H+20){ gameOver=true; playTone(120,0.4,'sawtooth',0.15); if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_rider_best',scoreL); onScoreRef.current(scoreL)} }

      dist+=bike.vx*0.12; fuel-=0.04 + bike.vx*0.002
      if(fuel<=0){ fuel=0; bike.vx*=0.985; if(bike.vx<1.4) { gameOver=true; playTone(180,0.3,'triangle',0.12); if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_rider_best',scoreL); onScoreRef.current(scoreL)} } }
      // fuel pickup every 600 dist
      if(dist% 120 <1 && dist>10){ fuel=Math.min(100,fuel+ 18); emit(bike.x, getHeight(bike.x)-18,'#00ff88',6) }

      // scoring distance + level
      if(frame%6===0){
        scoreL+= Math.floor(bike.vx*0.6)
        setScore(scoreL)
        const newLevel=Math.floor(dist/240)+1
        if(newLevel!==levelL){ levelL=newLevel; setLevel(levelL); playTone(660,0.14,'square',0.12) }
        if(scoreL>bestRef.current){ bestRef.current=scoreL; saveBest('neo_rider_best',scoreL); onScoreRef.current(scoreL) }
      }

      function emit(x:number,y:number,col:string,n:number){ for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4-0.5,life:1,c:col,size:2}) }
      particles.update()
      draw(false)
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); input.cleanup()
    }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3]" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">W/D acelera • A/D gira en aire • Espacio salto • Rampas + backflip bonus • Combustible</p>
    </div>
  )
}
