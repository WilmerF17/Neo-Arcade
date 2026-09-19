import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function BubbleGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [best,setBest]=useState(()=> loadBest(bestKey('bubble'),0))
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,360,440)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, levelL=1, comboL=0
    const COLORS=['#ff3355','#00ffff','#ffdd00','#00ff88','#8a2be2','#ff6b35']
    let bubbles:{x:number,y:number,r:number,c:string,vy:number,amp:number,phase:number}[]=[]
    let shooter={x:W/2, ang:-Math.PI/2, color: COLORS[Math.floor(Math.random()*COLORS.length)]}
    let nextColor=COLORS[Math.floor(Math.random()*COLORS.length)]
    let bullet:{x:number,y:number,vx:number,vy:number,c:string,active:boolean,trail:{x:number,y:number}[]} | null=null
    let aimX=W/2
    const BK=bestKey('bubble')
    let over=false

    const spawnRow=(y:number)=>{
      const perRow= Math.min(9, 7+Math.floor(levelL/2))
      const gap= W/(perRow+1)
      for(let i=0;i<perRow;i++){
        bubbles.push({x: gap*(i+1) + (Math.random()-0.5)*6, y: y + (Math.random()-0.5)*8, r:15+ levelL*0.2, c: COLORS[Math.floor(Math.random()*COLORS.length)], vy: 0.11 + levelL*0.02 + Math.random()*0.12, amp: 0.6+Math.random()*1.0, phase: Math.random()*Math.PI*2})
      }
    }
    for(let i=0;i<3;i++) spawnRow(36+i*30)

    const shoot=()=>{
      if(isStartedRef.current===false) return
      if(bullet||over) return
      const speed=7.2 + levelL*0.12
      bullet={x:shooter.x,y:H-58,vx: Math.cos(shooter.ang)*speed, vy: Math.sin(shooter.ang)*speed, c:shooter.color, active:true, trail:[]}
      shooter.color=nextColor; nextColor=COLORS[Math.floor(Math.random()*COLORS.length)]
      playTone(560,0.08,'square',0.11)
    }

    const onKey=(e:KeyboardEvent)=>{
      if(e.code==='Space'){ shoot(); e.preventDefault() }
      if(e.key.toLowerCase()==='r' && over){ bubbles=[]; for(let i=0;i<3;i++) spawnRow(36+i*30); scoreL=0; levelL=1; comboL=0; over=false; setScore(0); setLevel(1); setCombo(0) }
    }
    window.addEventListener('keydown',onKey)

    // mouse aim
    let wasDown=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused && !over){
        frame++
        aimX += (input.mouse.x - aimX)*0.18
        const dx=aimX-shooter.x
        shooter.ang = Math.atan2(-58, dx)
        // clamp
        shooter.ang=Math.max(-Math.PI+0.22, Math.min(-0.22, shooter.ang))
        if(input.mouse.down && !wasDown) shoot()
        wasDown=input.mouse.down

        // bubbles drift
        bubbles.forEach(b=>{
          b.y+=b.vy
          b.x+= Math.sin(frame*0.02 + b.phase)*b.amp*0.22
          if(b.x< b.r) b.x=b.r
          if(b.x> W-b.r) b.x=W-b.r
          if(b.y>H-72){ over=true; if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)} playTone(120,0.4,'sawtooth',0.16) }
        })
        if(bubbles.length===0){
          levelL++; setLevel(levelL); comboL=0; setCombo(0)
          for(let i=0;i<3+Math.floor(levelL/2);i++) spawnRow(36+i*28)
          playTone(880,0.18,'square',0.14)
        }

        if(bullet){
          bullet.x+=bullet.vx; bullet.y+=bullet.vy
          bullet.trail.push({x:bullet.x,y:bullet.y}); if(bullet.trail.length>10) bullet.trail.shift()
          bullet.vy+=0.06 // slight gravity
          if(bullet.x<14||bullet.x>W-14){ bullet.vx*=-1; bullet.x=Math.max(14,Math.min(W-14,bullet.x)); playTone(300,0.05,'square',0.07)}
          if(bullet.y<14) { bullet.vy*=-1; bullet.y=14 }
          let hit=false
          for(let i=bubbles.length-1;i>=0;i--){
            const b=bubbles[i]
            if(Math.hypot(bullet.x-b.x, bullet.y-b.y)< b.r+9){
              hit=true
              if(b.c===bullet.c){
                // flood cluster
                const stack=[i]
                const visited=new Set<number>([i])
                const cluster=[i]
                while(stack.length){
                  const idx=stack.pop()!
                  const cur=bubbles[idx]
                  for(let j=0;j<bubbles.length;j++) if(!visited.has(j) && bubbles[j].c===bullet.c && Math.hypot(bubbles[j].x-cur.x, bubbles[j].y-cur.y)< 32){
                    visited.add(j); stack.push(j); cluster.push(j)
                  }
                }
                cluster.sort((a,b)=>b-a)
                const cnt=cluster.length
                const pts= cnt>=3? cnt*16 + comboL*8 + levelL*4 : cnt*10
                if(cnt>=3){ comboL++; playTone(740+comboL*22,0.13,'square',0.13) } else { comboL=0; playTone(420,0.09,'sine',0.1) }
                scoreL+=pts; setScore(scoreL); setCombo(comboL)
                cluster.forEach(idx=>{
                  const bb=bubbles[idx]
                  for(let k=0;k<6;k++) pool.push({x:bb.x,y:bb.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:bb.c,size:3})
                })
                cluster.forEach(idx=> bubbles.splice(idx,1))
                // gravity drop: make bubbles above fall a bit
                bubbles.forEach(bb=>{ if(Math.random()>0.6) bb.vy+=0.14 })
                if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)}
              } else {
                // stick near
                bubbles.push({x:b.x, y:b.y+18, r:b.r, c:bullet.c, vy:0.11+levelL*0.02, amp:0.8, phase:Math.random()*Math.PI*2})
                comboL=0; setCombo(0); playTone(220,0.09,'triangle',0.09)
              }
              bullet=null; break
            }
          }
          if(hit) {}
          else if(bullet && (bullet.y>H+16 || bullet.y<-20)) { bullet=null; comboL=0; setCombo(0) }
        }
        // periodic new row pressure
        if(frame% (Math.max(160, 260 - levelL*12))===0 && bubbles.length<42){
          spawnRow(26)
        }
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(255,255,255,0.04)'; for(let i=0;i<W;i+=32){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke()}
      for(let y=0;y<H;y+=32){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()}
      // danger line
      ctx.strokeStyle='rgba(255,51,85,0.28)'; ctx.setLineDash([6,6]); ctx.beginPath(); ctx.moveTo(0,H-72); ctx.lineTo(W,H-72); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle='rgba(255,51,85,0.08)'; ctx.fillRect(0,H-72,W,2)
      // bubbles with glow and inner highlight
      bubbles.forEach(b=>{
        ctx.fillStyle=b.c; ctx.shadowColor=b.c; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.78)'; ctx.beginPath(); ctx.arc(b.x-4,b.y-4,b.r*0.28,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.92,0,Math.PI*2); ctx.stroke()
      })
      // aiming line
      if(!over){
        ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.setLineDash([4,6]); ctx.lineWidth=1.2
        ctx.beginPath(); ctx.moveTo(shooter.x, H-58)
        const len= 86
        ctx.lineTo(shooter.x + Math.cos(shooter.ang)*len, H-58 + Math.sin(shooter.ang)*len); ctx.stroke(); ctx.setLineDash([])
        // cross
        const tx=shooter.x + Math.cos(shooter.ang)*len, ty=H-58 + Math.sin(shooter.ang)*len
        ctx.strokeStyle='rgba(0,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(tx-8,ty); ctx.lineTo(tx+8,ty); ctx.moveTo(tx,ty-8); ctx.lineTo(tx,ty+8); ctx.stroke()
        ctx.fillStyle='rgba(0,255,255,0.12)'; ctx.beginPath(); ctx.arc(tx,ty,10,0,Math.PI*2); ctx.fill()
      }
      if(bullet){
        ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=2; ctx.beginPath(); bullet.trail.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y)}); ctx.stroke()
        ctx.fillStyle=bullet.c; ctx.shadowColor=bullet.c; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(bullet.x,bullet.y,9,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(bullet.x-2,bullet.y-2,3,0,Math.PI*2); ctx.fill()
      }
      // shooter cannon
      ctx.save(); ctx.translate(shooter.x,H-38)
      ctx.rotate(shooter.ang+Math.PI/2)
      ctx.fillStyle='#12162e'; ctx.strokeStyle='rgba(0,255,255,0.24)'; ctx.lineWidth=1.2
      ctx.beginPath(); (ctx as any).roundRect(-14,-8,28,36,7); ctx.fill(); ctx.stroke()
      ctx.fillStyle=shooter.color; ctx.shadowColor=shooter.color; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(0,-8,12,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,-8,4,0,Math.PI*2); ctx.fill()
      ctx.restore()
      // next preview
      ctx.fillStyle='rgba(255,255,255,0.42)'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('SIGUIENTE',W-34, H-12)
      ctx.fillStyle=nextColor; ctx.shadowColor=nextColor; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(W-34,H-26,9,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      pool.draw(ctx)
      if(comboL>2){ ctx.fillStyle='#ffdd00'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.fillText(`${comboL}x COMBO`,W/2, 18) }
      if(over){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡INVASIÓN!',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} • Lv ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('R para reiniciar',W/2,H/2+30)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[6/7] cursor-crosshair" width={360} height={440}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono" style={{color: combo>3?'#ffdd00':'#fff'}}>x{combo} Lv{level}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Física rebote • Agrupa ≥3 mismo color • Puntero con mira • Niveles más densos</p>
    </div>
  )
}
