import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function JetpackGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=> loadBest(bestKey('jetpack'),0))
  const [fuel,setFuel]=useState(100)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,320)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let y=H/2, vy=0, scoreL=0, levelL=1, fuelL=100, over=false
    let obstacles:{x:number,y:number,w:number,h:number}[]=[]
    let coins:{x:number,y:number,taken:boolean,phase:number}[]=[]
    let bgX=0
    const BK=bestKey('jetpack')
    let thrust=false

    const reset=()=>{
      y=H/2; vy=0; scoreL=0; levelL=1; fuelL=100; obstacles=[]; coins=[]; over=false; setScore(0); setLevel(1); setFuel(100)
    }

    const inputDown=()=> thrust=true
    const inputUp=()=> thrust=false
    window.addEventListener('keydown', (e:KeyboardEvent)=>{ if(e.code==='Space'||e.key.toLowerCase()==='w') thrust=true })
    window.addEventListener('keyup', (e:KeyboardEvent)=>{ if(e.code==='Space'||e.key.toLowerCase()==='w') thrust=false })
    const onMouseDown=()=> thrust=true
    const onMouseUp=()=> thrust=false
    canvas.addEventListener('mousedown',onMouseDown); window.addEventListener('mouseup',onMouseUp)
    canvas.addEventListener('touchstart', (e:TouchEvent)=>{ e.preventDefault(); thrust=true }, {passive:false} as any)
    window.addEventListener('touchend', ()=> thrust=false)

    const onKeyR=(e:KeyboardEvent)=>{ if(e.key.toLowerCase()==='r' && over) reset() }
    window.addEventListener('keydown',onKeyR)

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused && !over){
        frame++
        bgX+= 0.6 + levelL*0.08
        // controls with WASD/Space/mouse/touch
        const hold = thrust || input.keys[' '] || input.keys['w'] || input.mouse.down
        if(hold){ vy-=0.58; fuelL=Math.max(0, fuelL-0.045); if(frame%2===0) pool.push({x:62,y:y+6,vx: (Math.random()-0.5)*1.2 -1.2, vy:(Math.random()-0.5)*2, life:1, c: Math.random()>0.5?'#ff6b35':'#ffdd00', size:2.6}) }
        else vy+=0.38
        vy=Math.max(-6.2,Math.min(6.2,vy))
        y+=vy
        if(y<14){ y=14; vy=0 }
        if(y>H-14){ y=H-14; vy=0; fuelL=Math.max(0,fuelL-0.3) }
        const speed= 3.7 + levelL*0.35
        if(frame%(Math.max(48, 78 - levelL*3))===0){
          const gap = Math.max(78, 92 - levelL*2 + Math.random()*22)
          const gy = 42+Math.random()*(H-100)
          obstacles.push({x:W+12,y:0,w:30,h:gy})
          obstacles.push({x:W+12,y:gy+gap,w:30,h:H-(gy+gap)})
          if(Math.random()>0.32) coins.push({x:W+42,y:gy+gap/2 + (Math.random()-0.5)*24,taken:false,phase:Math.random()*6})
        }
        obstacles.forEach(o=> o.x-=speed)
        coins.forEach(c=> c.x-=speed)
        obstacles=obstacles.filter(o=> o.x+o.w>-14)
        coins=coins.filter(c=> !c.taken && c.x>-24)
        scoreL+=0.18 + levelL*0.02; if(frame%4===0) setScore(Math.floor(scoreL))
        if(Math.floor(scoreL) > levelL*180){ levelL++; setLevel(levelL); playTone(740,0.12,'square',0.12) }
        // collisions
        for(const o of obstacles){
          if(60+9>o.x && 60-9<o.x+o.w && y+8>o.y && y-8<o.y+o.h){
            for(let i=0;i<12;i++) pool.push({x:60,y, vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6, life:1, c:'#ff3355', size:3})
            fuelL=Math.max(0, fuelL-22); setFuel(Math.floor(fuelL)); vy= -2
            playTone(160,0.22,'sawtooth',0.16)
            // push obstacle away
            o.x+=18
            if(fuelL<=0){ over=true; if(scoreL>bestRef.current){ const sc=Math.floor(scoreL); try{ saveBest(BK,sc)}catch{}; setBest(sc); onScoreRef.current(sc)} }
            break
          }
        }
        for(const c of coins){
          if(!c.taken && Math.hypot(60-c.x, y-c.y)<15){
            c.taken=true; scoreL+=26+levelL*2; fuelL=Math.min(100,fuelL+4); setScore(Math.floor(scoreL)); setFuel(Math.floor(fuelL))
            playTone(880,0.12,'sine',0.15)
            for(let i=0;i<7;i++) pool.push({x:c.x,y:c.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ffdd00',size:2.8})
          }
        }
        setFuel(Math.floor(fuelL))
        if(fuelL<=0 && !over){ over=true; if(scoreL>bestRef.current){ const sc=Math.floor(scoreL); try{ saveBest(BK,sc)}catch{}; setBest(sc); onScoreRef.current(sc)} }
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // parallax stars + grid
      ctx.fillStyle='rgba(255,255,255,0.08)'
      for(let i=0;i<32;i++){ const x=(i*97 - bgX* (0.2 + (i%3)*0.18))%W; const y2=(i*53)%H; ctx.beginPath(); ctx.arc((x+W)%W,y2, (i%3===0?1.2:0.7),0,Math.PI*2); ctx.fill() }
      ctx.strokeStyle='rgba(0,255,255,0.05)'; ctx.lineWidth=1; for(let i=0;i<W;i+=40){ const x=(i - bgX*0.5)%W; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke()}
      // neon speed lines
      ctx.fillStyle='rgba(0,255,255,0.06)'; for(let i=0;i<5;i++){ const x=(frame* (2.2+ i*0.4))% (W+60) -20; ctx.fillRect(W - x, 0, 1.2, H) }
      obstacles.forEach(o=>{
        ctx.fillStyle='#121a2e'; ctx.fillRect(o.x,o.y,o.w,o.h)
        // neon cap
        ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=8; ctx.fillRect(o.x-1,o.y, o.w+2,4); ctx.fillRect(o.x-1,o.y+o.h-4, o.w+2,4); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(o.x+6,o.y+8,4,o.h-16)
      })
      coins.forEach(c=>{
        if(c.taken) return
        const bob=Math.sin(frame*0.12 + c.phase)*3
        ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(c.x,c.y+bob,8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#ff6b35'; ctx.beginPath(); ctx.arc(c.x,c.y+bob,4,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(c.x-2,c.y+bob-2,1.7,0,Math.PI*2); ctx.fill()
      })
      // jetpack hero
      ctx.save(); ctx.translate(60,y)
      if(!over){
        const ang= vy*0.06
        ctx.rotate(ang)
      }
      if(thrust && !over){
        ctx.fillStyle='rgba(255,100,0,0.78)'; ctx.beginPath(); ctx.ellipse(-11,7,10,7,0,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='rgba(255,221,0,0.92)'; ctx.beginPath(); ctx.ellipse(-13,7,6,3.5,0,0,Math.PI*2); ctx.fill()
      }
      ctx.fillStyle= over?'#555':'#00ffff'; ctx.shadowColor= over?'transparent':'#00ffff'; ctx.shadowBlur= over?0:12
      ctx.beginPath(); (ctx as any).roundRect(-10,-10,20,20,4); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle= over?'#222':'#003333'; ctx.beginPath(); ctx.arc(0,-4,3,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='700 6px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('JET',0,6)
      ctx.restore()
      pool.draw(ctx)
      // HUD fuel
      ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(10,10, 96,8)
      ctx.fillStyle= fuelL>34?'#00ff88': fuelL>16?'#ffdd00':'#ff3355'; ctx.fillRect(10,10, 96*(fuelL/100),8)
      ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.strokeRect(10,10,96,8)
      ctx.fillStyle='#fff'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`FUEL ${Math.floor(fuelL)}%`,10,28)
      ctx.textAlign='right'; ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.fillText(`LVL ${levelL}`,W-10,20)
      if(over){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=12; ctx.fillText('¡SIN COMBUSTIBLE!',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Distancia ${Math.floor(scoreL)}m • Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('R para reiniciar',W/2,H/2+30)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKeyR); canvas.removeEventListener('mousedown',onMouseDown); window.removeEventListener('mouseup',onMouseUp); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[3/2] cursor-pointer" width={480} height={320}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">DISTANCIA</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score} m</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono" style={{color: fuel<24?'#ff3355':'#00ff88'}}>{fuel}% FUEL Lv{level}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best} m</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">W/Espacio/Click vuelo • Gravedad + monedas • Niveles con velocidad • R reinicia</p>
    </div>
  )
}
