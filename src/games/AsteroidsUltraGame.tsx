import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function AsteroidsUltraGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_asteroidsultra_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,480,360)
    const particles=createParticlePool(72)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let scoreL=0, levelL=1, lives=3, gameOver=false, paused=false
    let ship={x:W/2,y:H/2,vx:0,vy:0,ang:-Math.PI/2, shield:0, cd:0, thrust:false}
    type Ast={x:number,y:number,r:number,vx:number,vy:number, rot:number, rv:number}
    let asteroids:Ast[]=[]
    let bullets:{x:number,y:number,vx:number,vy:number,life:number}[]=[]
    let stars:{x:number,y:number,s:number,sp:number}[][]=[]
    // parallax 3 layers
    for(let l=0;l<3;l++){
      const arr=[]
      for(let i=0;i<18;i++) arr.push({x:Math.random()*W,y:Math.random()*H,s: 0.6+l*0.6, sp: 0.3+l*0.5})
      stars.push(arr)
    }
    const spawnWave=()=>{
      const count= 4 + levelL*1.4
      for(let i=0;i<count;i++){
        const edge=Math.floor(Math.random()*4)
        let x=0,y=0
        if(edge===0){ x=Math.random()*W; y=-20 }
        if(edge===1){ x=W+20; y=Math.random()*H }
        if(edge===2){ x=Math.random()*W; y=H+20 }
        if(edge===3){ x=-20; y=Math.random()*H }
        const r= 18+Math.random()*16 + levelL*0.8
        const ang=Math.atan2(H/2 - y, W/2 - x) + (Math.random()-0.5)*0.9
        const sp= 0.7 + Math.random()*1.0 + levelL*0.14
        asteroids.push({x,y,r,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp, rot:Math.random()*Math.PI*2, rv:(Math.random()-0.5)*0.05})
      }
    }
    spawnWave()

    const reset=()=>{
      ship={x:W/2,y:H/2,vx:0,vy:0,ang:-Math.PI/2,shield:0,cd:0,thrust:false}
      asteroids=[]; bullets=[]; particles.clear(); scoreL=0; levelL=1; lives=3; gameOver=false; paused=false; spawnWave(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const shoot=()=>{
      if(gameOver) return
      if(ship.cd>0) return
      const sp=7.4
      bullets.push({x:ship.x+Math.cos(ship.ang)*12,y:ship.y+Math.sin(ship.ang)*12,vx:Math.cos(ship.ang)*sp+ship.vx*0.2,vy:Math.sin(ship.ang)*sp+ship.vy*0.2,life:52})
      ship.cd=12
      playTone(880,0.07,'square',0.12)
    }

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '){ e.preventDefault(); shoot() }
      if(k==='r'){ reset(); return }
      if(k==='p'){ if(!gameOver) paused=!paused; return }
    }
    window.addEventListener('keydown', onKey)
    const onPointer=()=> shoot()
    c.addEventListener('mousedown', onPointer as any)
    c.addEventListener('touchstart', onPointer as any, {passive:true} as any)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#040616'; ctx.fillRect(0,0,W,H)
      // stars parallax
      for(let l=0;l<stars.length;l++){
        const alpha= 0.25 + l*0.22
        ctx.fillStyle=`rgba(255,255,255,${alpha})`
        for(const s of stars[l]){
          ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,Math.PI*2); ctx.fill()
        }
      }
      // asteroids neón rocosos
      for(const a of asteroids){
        ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.rot)
        ctx.fillStyle='#3a2f1a'; ctx.strokeStyle='#ffdd99'; ctx.lineWidth=1.2
        ctx.beginPath()
        for(let k=0;k<7;k++){ const ang=k/7*Math.PI*2, r=a.r + Math.sin(k*1.9 + frame*0.01)*3; const x=Math.cos(ang)*r, y=Math.sin(ang)*r; if(k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) }
        ctx.closePath(); ctx.fill(); ctx.stroke()
        // crater
        ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.arc(a.r*0.2, -a.r*0.15, a.r*0.22,0,Math.PI*2); ctx.fill()
        ctx.restore()
      }
      // bullets neón
      for(const b of bullets){
        ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=8
        ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        // trail
        ctx.fillStyle='rgba(0,255,255,0.22)'; ctx.beginPath(); ctx.arc(b.x - b.vx*0.2, b.y - b.vy*0.2, 1.8,0,Math.PI*2); ctx.fill()
      }
      // ship 360°
      ctx.save(); ctx.translate(ship.x,ship.y); ctx.rotate(ship.ang)
      if(ship.shield>0){
        ctx.strokeStyle='rgba(0,255,255,0.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.stroke()
        ctx.fillStyle='rgba(0,255,255,0.08)'; ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill()
      }
      ctx.fillStyle= gameOver?'#555':'#ffffff'; ctx.shadowColor= gameOver?'transparent':'#00ffff'; ctx.shadowBlur= ship.shield>0?16:10
      ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(-9,-7); ctx.lineTo(-5,0); ctx.lineTo(-9,7); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0
      if(ship.thrust){
        ctx.fillStyle='#ff3366'; ctx.beginPath(); ctx.moveTo(-9,0); ctx.lineTo(-15,-4); ctx.lineTo(-15,4); ctx.closePath(); ctx.fill()
        ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.moveTo(-9,0); ctx.lineTo(-13,-2); ctx.lineTo(-13,2); ctx.closePath(); ctx.fill()
      }
      ctx.restore()
      particles.draw(ctx)
      // HUD
      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,20)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}`,8,14)
      ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='900 11px Orbitron'; ctx.fillText(`${scoreL}`,W/2,14)
      ctx.textAlign='right'; ctx.fillStyle='#ff3366'; ctx.font='700 11px JetBrains Mono'; ctx.fillText('♥'.repeat(lives)+'♡'.repeat(Math.max(0,3-lives)),W-8,14)
      if(ship.shield>0){
        ctx.fillStyle='rgba(0,255,255,0.18)'; ctx.fillRect(0,20,W*(ship.shield/90),3)
      }
      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('P para continuar',W/2,H/2+18)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar • Espacio dispara',W/2,H/2+30)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      // input
      const keys=input.keys
      if(keys['a']||keys['arrowleft']) ship.ang-=0.075
      if(keys['d']||keys['arrowright']) ship.ang+=0.075
      ship.thrust=false
      if(keys['w']||keys['arrowup']){ ship.vx+=Math.cos(ship.ang)*0.16; ship.vy+=Math.sin(ship.ang)*0.16; ship.thrust=true }
      if(keys['s']||keys['arrowdown']){ ship.vx*=0.98; ship.vy*=0.98 }
      // also auto follow mouse angle subtle?
      if(input.mouse.down && frame%8===0) shoot()

      ship.x+=ship.vx; ship.y+=ship.vy; ship.vx*=0.992; ship.vy*=0.992
      if(ship.x< -14) ship.x=W+14; if(ship.x>W+14) ship.x=-14; if(ship.y< -14) ship.y=H+14; if(ship.y>H+14) ship.y=-14
      if(ship.cd>0) ship.cd--
      if(ship.shield>0) ship.shield--

      // stars parallax drift
      for(let l=0;l<stars.length;l++){
        for(const s of stars[l]){
          s.y+= s.sp*0.6
          s.x+= Math.sin(frame*0.01 + l)*0.12
          if(s.y>H) { s.y=-4; s.x=Math.random()*W }
        }
      }

      bullets.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.life-- })
      bullets=bullets.filter(b=> b.life>0 && b.x>-16&&b.x<W+16&&b.y>-16&&b.y<H+16)
      asteroids.forEach(a=>{ a.x+=a.vx; a.y+=a.vy; a.rot+=a.rv; if(a.x< -a.r-20) a.x=W+a.r+20; if(a.x>W+a.r+20) a.x=-a.r-20; if(a.y< -a.r-20) a.y=H+a.r+20; if(a.y>H+a.r+20) a.y=-a.r-20 })

      // bullet vs asteroid with split
      for(let i=asteroids.length-1;i>=0;i--){
        const a=asteroids[i]
        for(let j=bullets.length-1;j>=0;j--){
          const b=bullets[j]
          if(Math.hypot(a.x-b.x,a.y-b.y) < a.r){
            for(let k=0;k<9;k++) particles.push({x:a.x,y:a.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ffdd00',size:2.6})
            if(a.r>16){
              for(let k=0;k<2;k++){
                const nr=a.r*0.56
                const ang=Math.random()*Math.PI*2
                asteroids.push({x:a.x+Math.cos(ang)*6,y:a.y+Math.sin(ang)*6,r:nr,vx:(Math.random()-0.5)*1.8+ a.vx*0.3,vy:(Math.random()-0.5)*1.8+ a.vy*0.3, rot:Math.random()*Math.PI, rv:(Math.random()-0.5)*0.08})
              }
            }
            asteroids.splice(i,1); bullets.splice(j,1)
            scoreL+= Math.max(10, Math.floor(26 - a.r*0.2)) + levelL*2; setScore(scoreL)
            if(scoreL>bestRef.current) onScoreRef.current(scoreL)
            playTone(520,0.08,'square',0.11)
            if(asteroids.length===0){
              levelL++; setLevel(levelL); scoreL+=70+levelL*12; setScore(scoreL)
              if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_asteroidsultra_best',scoreL); onScoreRef.current(scoreL) }
              spawnWave(); playTone(740,0.18,'square',0.14)
            }
            break
          }
        }
      }
      // ship vs asteroid
      if(ship.shield<=0){
        for(const a of asteroids){
          if(Math.hypot(ship.x-a.x, ship.y-a.y) < a.r+9){
            for(let k=0;k<16;k++) particles.push({x:ship.x,y:ship.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff3366',size:2.8})
            lives--; ship.shield=90; playTone(180,0.28,'sawtooth',0.16) // 1.5s at 60fps
            ship.x=W/2; ship.y=H/2; ship.vx=0; ship.vy=0
            if(lives<=0){
              gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_asteroidsultra_best',scoreL); onScoreRef.current(scoreL) } playTone(90,0.5,'sawtooth',0.18)
            }
            break
          }
        }
      }
      particles.update()
      draw(false)
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey)
      c.removeEventListener('mousedown', onPointer as any); c.removeEventListener('touchstart', onPointer as any)
      input.cleanup()
    }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-crosshair" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">A/D gira • W thrust • Click/Espacio dispara • Escudo 1.5s tras hit • Split asteroides • Parallax</p>
    </div>
  )
}
