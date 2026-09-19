import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function MinerGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=> loadBest(bestKey('miner'),0))
  const [fuel,setFuel]=useState(100)
  const [cargo,setCargo]=useState(0)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,360)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, levelL=1, fuelL=100, cargoL=0
    let ship={x:W/2,y:H/2,vx:0,vy:0,ang:0}
    let asteroids:{x:number,y:number,r:number,vx:number,vy:number,hp:number,maxHp:number, col:string}[]=[]
    let bullets:{x:number,y:number,vx:number,vy:number,life:number}[]=[]
    let over=false
    const BK=bestKey('miner')
    const cargoMax= 12

    const hardnessCol=(hp:number)=> hp>=4?'#ff3355': hp===3?'#ff6b35': hp===2?'#ffdd00':'#8a7a5a'
    const spawnAst=()=>{
      const ang=Math.random()*Math.PI*2
      const dist= Math.max(W,H)*0.62
      const x=W/2 + Math.cos(ang)*dist + (Math.random()-0.5)*42
      const y=H/2 + Math.sin(ang)*dist + (Math.random()-0.5)*42
      const sp= 0.55+Math.random()*0.9 + levelL*0.07
      const a2=Math.atan2(H/2 - y, W/2 - x) + (Math.random()-0.5)*0.52
      const hp= Math.min(4, 1+Math.floor(Math.random()* (1+levelL*0.5)))
      asteroids.push({x,y,r:16+Math.random()*14 + hp*2 ,vx: Math.cos(a2)*sp, vy: Math.sin(a2)*sp, hp, maxHp:hp, col: hardnessCol(hp)})
    }
    for(let i=0;i<5;i++) spawnAst()

    const fire=()=>{
      if(over) return
      if(fuelL<=1) return
      bullets.push({x:ship.x+Math.cos(ship.ang)*12,y:ship.y+Math.sin(ship.ang)*12,vx: Math.cos(ship.ang)*7.2, vy: Math.sin(ship.ang)*7.2, life:52})
      fuelL=Math.max(0, fuelL-0.6); setFuel(Math.floor(fuelL))
      playTone(720,0.07,'square',0.11)
    }
    let autoFire=false
    const onKeyD=(e:KeyboardEvent)=>{
      if(e.key.toLowerCase()==='r' && over){ scoreL=0; levelL=1; fuelL=100; cargoL=0; asteroids=[]; for(let i=0;i<5;i++) spawnAst(); ship={x:W/2,y:H/2,vx:0,vy:0,ang:0}; over=false; setScore(0); setLevel(1); setFuel(100); setCargo(0) }
      if(e.code==='Space') autoFire=true
    }
    const onKeyU=(e:KeyboardEvent)=>{ if(e.code==='Space') autoFire=false }
    window.addEventListener('keydown',onKeyD); window.addEventListener('keyup',onKeyU)
    canvas.addEventListener('mousedown',fire)
    let wasMouseDown=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused && !over){
        frame++
        if(frame% Math.max(48, 90 - levelL*6)===0) spawnAst()
        // controls WASD/Flechas
        if(input.keys['a']||input.keys['arrowleft']) ship.ang-=0.068
        if(input.keys['d']||input.keys['arrowright']) ship.ang+=0.068
        const thrusting= input.keys['w']||input.keys['arrowup']
        if(thrusting){ ship.vx+= Math.cos(ship.ang)*0.2; ship.vy+= Math.sin(ship.ang)*0.2; fuelL=Math.max(0,fuelL-0.075); setFuel(Math.floor(fuelL)); if(Math.random()>0.45) pool.push({x:ship.x - Math.cos(ship.ang)*12, y:ship.y - Math.sin(ship.ang)*12, vx: -Math.cos(ship.ang)*2.2+(Math.random()-0.5), vy: -Math.sin(ship.ang)*2.2+(Math.random()-0.5), life:0.8,c: Math.random()>0.5?'#ff6b35':'#ffdd00',size:2.2}) }
        if(input.keys['s']||input.keys['arrowdown']){ ship.vx*=0.97; ship.vy*=0.97 }
        if(input.mouse.down){
          // mouse steer: rotate towards mouse
          const angTo=Math.atan2(input.mouse.y-ship.y, input.mouse.x-ship.x)
          let diff= angTo - ship.ang; diff= ((diff+Math.PI)%(2*Math.PI))-Math.PI
          ship.ang+= diff*0.08
          if(!wasMouseDown) fire()
          if(frame%8===0) fire()
        }
        wasMouseDown=input.mouse.down
        if(autoFire && frame%8===0) fire()

        ship.x+=ship.vx; ship.y+=ship.vy
        ship.vx*=0.992; ship.vy*=0.992
        if(ship.x< -12) ship.x=W+12; if(ship.x>W+12) ship.x=-12
        if(ship.y< -12) ship.y=H+12; if(ship.y>H+12) ship.y=-12

        bullets.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.life-- })
        bullets=bullets.filter(b=>b.life>0 && b.x>-20 && b.x<W+20 && b.y>-20 && b.y<H+20)
        asteroids.forEach(a=>{ a.x+=a.vx; a.y+=a.vy; if(a.x<-30) a.x=W+30; if(a.x>W+30) a.x=-30; if(a.y<-30) a.y=H+30; if(a.y>H+30) a.y=-30 })

        for(let i=asteroids.length-1;i>=0;i--){
          const a=asteroids[i]
          for(let j=bullets.length-1;j>=0;j--){
            const b=bullets[j]
            if(Math.hypot(b.x-a.x,b.y-a.y)< a.r){
              bullets.splice(j,1)
              a.hp--
              playTone( 300 + (a.maxHp-a.hp)*90,0.06,'square',0.07)
              for(let k=0;k<3;k++) pool.push({x:b.x,y:b.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:1,c:a.col,size:2})
              if(a.hp<=0){
                scoreL+= 18 + a.maxHp*8 + levelL*2; cargoL=Math.min(cargoMax, cargoL+ a.maxHp); setScore(scoreL); setCargo(cargoL)
                for(let k=0;k<10;k++) pool.push({x:a.x,y:a.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ffdd00',size:2.8})
                playTone(520,0.12,'square',0.12)
                if(a.r>16){
                  for(let s=0;s<2;s++) asteroids.push({x:a.x+ (Math.random()-0.5)*12,y:a.y+ (Math.random()-0.5)*12,r:a.r*0.56,vx:(Math.random()-0.5)*2.2,vy:(Math.random()-0.5)*2.2,hp: Math.max(1, Math.floor(a.maxHp*0.6)), maxHp: Math.max(1, Math.floor(a.maxHp*0.6)), col: hardnessCol(Math.max(1, Math.floor(a.maxHp*0.6)))})
                }
                asteroids.splice(i,1)
                fuelL=Math.min(100,fuelL+5); setFuel(Math.floor(fuelL))
                // deliver cargo when full
                if(cargoL>=cargoMax){
                  const bonus= cargoL*14 + levelL*14
                  scoreL+=bonus; setScore(scoreL); cargoL=0; setCargo(0)
                  for(let k=0;k<14;k++) pool.push({x:W/2,y:H/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#00ff88',size:3})
                  playTone(880,0.22,'square',0.14)
                }
                if(scoreL> levelL*180){ levelL++; setLevel(levelL) }
                if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)}
              }
              break
            }
          }
        }
        for(let i=asteroids.length-1;i>=0;i--){
          const a=asteroids[i]
          if(Math.hypot(ship.x-a.x, ship.y-a.y)< a.r+11){
            for(let k=0;k<12;k++) pool.push({x:ship.x,y:ship.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff3355',size:2.8})
            ship.vx+= (Math.random()-0.5)*4; ship.vy+= (Math.random()-0.5)*4
            asteroids.splice(i,1)
            fuelL=Math.max(0,fuelL-20); setFuel(Math.floor(fuelL))
            cargoL=Math.max(0, cargoL-1); setCargo(cargoL)
            playTone(140,0.18,'sawtooth',0.14)
            if(fuelL<=0){ over=true; if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; setBest(scoreL); onScoreRef.current(scoreL)} }
          }
        }
        // passive fuel regen very slow if idle
        if(!thrusting && frame%40===0 && fuelL<100){ fuelL=Math.min(100, fuelL+0.3); setFuel(Math.floor(fuelL)) }
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // starfield parallax
      ctx.fillStyle='rgba(255,255,255,0.10)'
      for(let i=0;i<42;i++){ const x=(i*97+ frame*0.08)%W, y=(i*53)%H; const s= (i%3===0?1.1:0.6); ctx.beginPath(); ctx.arc((x+W)%W,y,s,0,Math.PI*2); ctx.fill() }
      // nebula
      const neb=ctx.createRadialGradient(W*0.3,H*0.28, 20, W*0.3,H*0.28, 160); neb.addColorStop(0,'rgba(0,255,255,0.06)'); neb.addColorStop(1,'transparent'); ctx.fillStyle=neb; ctx.fillRect(0,0,W,H)
      asteroids.forEach(a=>{
        ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.x*0.009)
        ctx.fillStyle='#5b4a2e'; ctx.strokeStyle=a.col; ctx.lineWidth=1.3
        ctx.shadowColor=a.col; ctx.shadowBlur=6
        ctx.beginPath()
        for(let k=0;k<7;k++){ const ang=k/7*Math.PI*2; const r=a.r + Math.sin(k*1.9)*3 + (a.maxHp>2?2:0); const x=Math.cos(ang)*r, y=Math.sin(ang)*r; if(k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)} ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0
        // hp indicator cracks
        ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1; for(let k=0;k<a.maxHp;k++){ ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(k*1.2)*a.r*0.5, Math.sin(k*1.2)*a.r*0.5); ctx.stroke() }
        ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(-4,-4,4,0,Math.PI*2); ctx.fill()
        // hardness text
        if(a.maxHp>1){ ctx.fillStyle='#fff'; ctx.font='700 8px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`x${a.hp}`,0,3) }
        ctx.restore()
      })
      bullets.forEach(b=>{ ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(b.x,b.y,2.6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0 })
      // ship with thrust
      ctx.save(); ctx.translate(ship.x,ship.y); ctx.rotate(ship.ang)
      const thrustingNow= input.keys['w']||input.keys['arrowup']||input.mouse.down
      if(thrustingNow && !over){
        ctx.fillStyle='rgba(0,255,255,0.28)'; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-17,-5); ctx.lineTo(-17,5); ctx.closePath(); ctx.fill()
      }
      const grad=ctx.createLinearGradient(-10,-8,10,8); grad.addColorStop(0,'#fff'); grad.addColorStop(1,'#9aa0ff')
      ctx.fillStyle= grad; ctx.shadowColor='#00ffff'; ctx.shadowBlur= over?0:8
      ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(-10,-8); ctx.lineTo(-6,0); ctx.lineTo(-10,8); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#0a0a2a'; ctx.beginPath(); ctx.arc(2,0,4,0,Math.PI*2); ctx.fill()
      if(cargoL>0){ ctx.fillStyle='#ffdd00'; ctx.font='700 7px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`${cargoL}/${cargoMax}`,0,14) }
      ctx.restore()
      pool.draw(ctx)
      // HUD bars
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(10,10, 96,8); ctx.fillStyle= fuelL>30?'#ffdd00':'#ff3355'; ctx.fillRect(10,10, 96*(fuelL/100),8); ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.strokeRect(10,10,96,8)
      ctx.fillStyle='#fff'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`FUEL ${Math.floor(fuelL)}%`,10,28)
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(10,32, 96,6); ctx.fillStyle='#00ff88'; ctx.fillRect(10,32, 96*(cargoL/cargoMax),6); ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.strokeRect(10,32,96,6)
      ctx.fillStyle='#00ff88'; ctx.font='700 8px JetBrains Mono'; ctx.fillText(`CARGO ${cargoL}/${cargoMax}`,10,48)
      ctx.textAlign='right'; ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.fillText(`Lv ${levelL}`,W-10,18)
      const vg=ctx.createRadialGradient(W/2,H/2, 120, W/2,H/2, 340); vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.32)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)
      if(over){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡SIN COMBUSTIBLE!',W/2,H/2-12)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Minerales ${scoreL} • Nivel ${levelL}`,W/2,H/2+10)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('R para reiniciar',W/2,H/2+30)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKeyD); window.removeEventListener('keyup',onKeyU); canvas.removeEventListener('mousedown',fire); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-crosshair" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">MINERALES</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="flex-1 glass rounded-lg px-3 py-2 flex items-center gap-2"><span className="text-xs font-mono text-amber-300">FUEL</span><div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-red-400" style={{width:`${fuel}%`}}/></div><span className="text-xs font-mono text-white">{fuel}%</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-emerald-300">{cargo} cargo Lv{level}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">WAD thrust/rot • Mouse dispara/dirige • Asteroides con HP y carga llena = bonus</p>
    </div>
  )
}
