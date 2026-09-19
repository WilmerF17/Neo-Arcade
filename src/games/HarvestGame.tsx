import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

type Crop = { x:number,y:number, ripe:boolean, t:number, growth:number, max:number, wobble:number }
export default function HarvestGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [time,setTime]=useState(40)
  const [best,setBest]=useState(()=> loadBest(bestKey('harvest'),0))
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,420,400)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, levelL=1, comboL=0, timeL=40
    let player={x:W/2,y:H-58}
    let crops:Crop[]=[]
    let over=false
    const BK=bestKey('harvest')

    const spawnCrop=(ripe=false)=>{
      crops.push({x: 34+Math.random()*(W-68), y: 44+Math.random()*200, ripe, t: Math.random()*20, growth: ripe?1:0.2, max: 1, wobble: Math.random()*Math.PI*2})
    }
    for(let i=0;i<6;i++) spawnCrop(Math.random()>0.5)

    const timer=setInterval(()=>{
      if(isStartedRef.current===false||over) return
      timeL-=1; if(timeL<=0){ timeL=0; over=true; if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; setBest(scoreL); onScoreRef.current(scoreL)} } setTime(timeL)
    },1000)

    const harvest=()=>{
      let hit=false
      for(let i=crops.length-1;i>=0;i--){
        const cr=crops[i]
        if(Math.hypot(player.x-cr.x, player.y-cr.y)<22){
          if(cr.ripe){
            hit=true
            const pts= 12 + comboL*4 + levelL*3
            scoreL+=pts; comboL++; playTone(740+Math.min(200,comboL*14),0.11,'square',0.12)
            for(let k=0;k<7;k++) pool.push({x:cr.x,y:cr.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4-1,life:1,c:'#ffdd00',size:3})
            crops.splice(i,1)
            if(Math.random()>0.2) spawnCrop(false)
            if(scoreL> levelL*90){ levelL++; setLevel(levelL); timeL=Math.min(60, timeL+7); setTime(timeL); playTone(880,0.18,'square',0.14) }
            if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)}
          } else {
            // penalizar cosecha prematura
            comboL=0; scoreL=Math.max(0,scoreL-6); playTone(180,0.16,'sawtooth',0.12)
            for(let k=0;k<4;k++) pool.push({x:cr.x,y:cr.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:1,c:'#ff3355',size:2})
            cr.t=0; cr.growth=0.1
          }
          break
        }
      }
      if(hit){ setScore(scoreL); setCombo(comboL) } else if(!hit){
        // miss timing
        // small combo decay if clicking empty space near
      }
      // if all ripe harvested, bonus
      if(crops.filter(c=>c.ripe).length===0 && crops.length>0){
        // keep
      }
    }

    const onKey=(e:KeyboardEvent)=>{
      if(e.code==='Space') harvest()
      if(e.key.toLowerCase()==='r' && over){ scoreL=0; levelL=1; comboL=0; timeL=40; crops=[]; for(let i=0;i<6;i++) spawnCrop(Math.random()>0.5); over=false; setScore(0); setLevel(1); setCombo(0); setTime(40) }
    }
    window.addEventListener('keydown',onKey)

    let wasDown=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused && !over){
        frame++
        // smooth follow mouse
        const tx=input.mouse.x, ty=input.mouse.y
        player.x += (tx - player.x)*0.18
        player.y += (ty - player.y)*0.18
        // WASD also
        if(input.keys['w']||input.keys['arrowup']) player.y-=2.2
        if(input.keys['s']||input.keys['arrowdown']) player.y+=2.2
        if(input.keys['a']||input.keys['arrowleft']) player.x-=2.2
        if(input.keys['d']||input.keys['arrowright']) player.x+=2.2
        player.x=Math.max(16,Math.min(W-16,player.x))
        player.y=Math.max(16,Math.min(H-16,player.y))
        if(input.mouse.down && !wasDown) harvest()
        wasDown=input.mouse.down

        const speed= 0.018 + levelL*0.004
        crops.forEach(cr=>{
          cr.t+= speed* (1+ cr.wobble*0.02)
          if(!cr.ripe){
            cr.growth+= 0.006 + levelL*0.0012
            if(cr.growth>=1){ cr.ripe=true; cr.growth=1; cr.t=0; playTone(520,0.06,'sine',0.06) }
          } else {
            // overripe decay if not harvested fast
            cr.t+= 0.008
            if(cr.t> 140 + (10-levelL)*8){
              // become rotten
              cr.ripe=false; cr.growth=0.35; cr.t=0; comboL=0; setCombo(0)
            }
          }
        })
        if(frame%(Math.max(60, 140 - levelL*10))===0 && crops.length<12){
          spawnCrop(false)
        }
        // combo decay if no harvest for long
        if(frame%90===0 && comboL>0){
          // gentle
        }
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,136,0.05)'; for(let i=0;i<W;i+=36){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke()}
      for(let y=0;y<H;y+=36){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()}
      // soil beds
      ctx.fillStyle='rgba(34,20,8,0.45)'; ctx.fillRect(0,H-22,W,22)
      ctx.fillStyle='rgba(0,255,136,0.08)'; ctx.fillRect(0,H-22,W,2)
      crops.forEach(cr=>{
        ctx.save(); ctx.translate(cr.x, cr.y + Math.sin(frame*0.04+cr.wobble)*1.2)
        // stem
        ctx.strokeStyle= cr.ripe?'#2a6b22':'#1e4d18'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,10); ctx.lineTo(0,0); ctx.stroke()
        // leaf
        ctx.fillStyle='rgba(0,255,136,0.22)'; ctx.beginPath(); ctx.ellipse(-5,4,6,3, -0.6,0,Math.PI*2); ctx.fill()
        const scale = cr.ripe? 1 : 0.5+ cr.growth*0.5
        ctx.scale(scale,scale)
        const col=cr.ripe? (cr.t>100?'#ff6b35':'#ffdd00') : `rgb(${Math.round(80+cr.growth*60)}, ${Math.round(180+cr.growth*30)}, 90)`
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=cr.ripe?14:6
        ctx.beginPath(); ctx.arc(0,0, cr.ripe?11:7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        if(cr.ripe){
          ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(-3,-3,2.2,0,Math.PI*2); ctx.fill()
          // timer ring for overripe
          const prog= Math.min(1, cr.t/140)
          ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(0,0,14, -Math.PI/2, -Math.PI/2+Math.PI*2*prog); ctx.stroke()
          if(prog>0.7){ ctx.fillStyle='rgba(255,51,85,0.9)'; ctx.font='700 7px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('¡YA!',0,4) }
        } else {
          // growth ring
          ctx.strokeStyle='rgba(0,255,136,0.55)'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(0,0,11, -Math.PI/2, -Math.PI/2+Math.PI*2*cr.growth); ctx.stroke()
        }
        ctx.restore()
      })
      // player basket
      ctx.save(); ctx.translate(player.x,player.y)
      const bob=Math.sin(frame*0.14)*1.2
      ctx.translate(0,bob)
      ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(0,0,13,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#003311'; ctx.beginPath(); ctx.arc(-3.2,-3,2.6,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(3.2,-3,2.6,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,4,4,0,Math.PI); ctx.stroke()
      // crosshair
      ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-18,0); ctx.lineTo(18,0); ctx.moveTo(0,-18); ctx.lineTo(0,18); ctx.stroke()
      ctx.restore()
      pool.draw(ctx)
      // HUD
      ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(6,6,W-12,18)
      ctx.fillStyle='#ffdd00'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`COSECHA x${comboL}  Lv${levelL}`,10,18)
      ctx.textAlign='right'; ctx.fillStyle= timeL<=10?'#ff3355':'#ffffff'; ctx.fillText(`${timeL}s`,W-10,18)
      if(comboL>3){ ctx.fillStyle='#ffdd00'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.fillText(`${comboL}x COMBO`,W/2, 30) }
      if(over){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ffdd00'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡COSECHA FIN!',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} • Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('R para reiniciar',W/2,H/2+30)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ff88'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); clearInterval(timer); window.removeEventListener('keydown',onKey); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[420px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[20/19] cursor-pointer" width={420} height={400}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-emerald-300 font-mono">COSECHA</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono" style={{color: combo>3?'#ffdd00':'#fff'}}>x{combo} Lv{level} {time}s</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Cosecha solo frutos maduros (amarillo) • Timing y combo • Niveles aceleran crecimiento</p>
    </div>
  )
}
