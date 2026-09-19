import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function PlinkoGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=> loadBest(bestKey('plinko'),0))
  const [balls,setBalls]=useState(12)
  const [mult,setMult]=useState(0)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,360,440)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0
    let scoreL=0, levelL=1, ballsL=12
    let ball:{x:number,y:number,vx:number,vy:number,active:boolean,trail:{x:number,y:number}[]} | null=null
    const BK=bestKey('plinko')
    const pegR=5
    const startY=68
    const spacing=30
    let rows=9
    const buckets=[ {mult:8},{mult:4},{mult:2},{mult:1},{mult:0.6},{mult:1},{mult:2},{mult:4},{mult:8}]
    // pegs hexagonal offset pattern
    const buildPegs=(r:number)=>{
      const pegs:{x:number,y:number}[]=[]
      for(let row=0;row<r;row++){
        const cols= 6 + (row%2)
        const offset= row%2? spacing/2:0
        const y=startY + row*spacing
        for(let c=0;c<cols;c++){
          const x= 28 + offset + c*spacing
          // hexagonal jitter none
          pegs.push({x,y})
        }
      }
      return pegs
    }
    let pegs=buildPegs(rows)
    const bucketW=W/buckets.length

    const drop=(x:number)=>{
      if(isStartedRef.current===false) return
      if(ballsL<=0 || ball) return
      ball={x: Math.max(16,Math.min(W-16,x)), y:18, vx:(Math.random()-0.5)*1.0, vy:0, active:true, trail:[]}
      ballsL--; setBalls(ballsL)
      playTone(520,0.08,'sine',0.11)
    }
    const resetLevel=()=>{
      rows= Math.min(12, 9+Math.floor(levelL/2))
      pegs=buildPegs(rows)
    }
    const onDown=()=>{
      if(ball && ball.y>H-44){ /* landed handled */ }
      if(!ball) drop(input.mouse.x)
      else if(ballsL<=0 && !ball){
        // refill?
      }
    }
    let wasDown=false
    const onKey=(e:KeyboardEvent)=>{
      if(e.code==='Space') drop(W/2 + (Math.random()-0.5)*80)
      if(e.key.toLowerCase()==='r'){ scoreL=0; levelL=1; ballsL=12; setScore(0); setLevel(1); setBalls(12); ball=null; resetLevel() }
    }
    window.addEventListener('keydown',onKey)

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){
        // draw paused but not physics
      } else {
        // input
        if(input.mouse.down && !wasDown) onDown()
        wasDown=input.mouse.down
        if(ball && ball.active){
          ball.vy+=0.26 + levelL*0.012
          ball.x+=ball.vx; ball.y+=ball.vy
          ball.vx*=0.997
          ball.trail.push({x:ball.x,y:ball.y})
          if(ball.trail.length>18) ball.trail.shift()
          // peg collisions hexagonal-ish (circle)
          for(const p of pegs){
            const dx=ball.x-p.x, dy=ball.y-p.y
            const d=Math.hypot(dx,dy)
            if(d< pegR+6.2){
              const nx=dx/d, ny=dy/d
              const dot= ball.vx*nx + ball.vy*ny
              ball.vx -= 2*dot*nx*0.76
              ball.vy -= 2*dot*ny*0.76
              ball.x = p.x + nx*(pegR+6.2+0.6)
              ball.y = p.y + ny*(pegR+6.2+0.6)
              ball.vx+= (Math.random()-0.5)*0.7
              pool.push({x:p.x,y:p.y,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2,life:1,c:'#00ffff',size:1.8})
              playTone(420+Math.random()*120,0.05,'square',0.07)
              break
            }
          }
          if(ball.x<10){ ball.x=10; ball.vx*=-0.72 }
          if(ball.x>W-10){ ball.x=W-10; ball.vx*=-0.72 }
          if(ball.y > H-36){
            const idx=Math.min(buckets.length-1, Math.max(0, Math.floor(ball.x/bucketW)))
            const m=buckets[idx].mult
            const pts=Math.floor(m*12 + levelL*2)
            scoreL+=pts; setScore(scoreL); setMult(m)
            setTimeout(()=> setMult(0), 700)
            if(m>=8) { playTone(880,0.3,'square',0.18); for(let k=0;k<16;k++) pool.push({x:ball!.x,y:H-36,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6-1,life:1,c:'#ffdd00',size:3}) }
            else if(m>=2) { playTone(640,0.14,'sine',0.13); for(let k=0;k<8;k++) pool.push({x:ball!.x,y:H-36,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*4-1,life:1,c:'#00ff88',size:2.4}) }
            else { playTone(320,0.12,'triangle',0.1); for(let k=0;k<6;k++) pool.push({x:ball!.x,y:H-36,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ff5566',size:2}) }
            if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL) }
            // level progression every 6 balls dropped
            if((12-ballsL)%5===0 && ballsL!==12){ levelL=Math.min(9, levelL+1); setLevel(levelL); resetLevel() }
            ball=null
            if(ballsL<=0){
              // auto refill after short delay for elite loop
              setTimeout(()=>{ if(!ball){ ballsL=12+Math.floor(levelL/1.5); setBalls(ballsL) } }, 900)
            }
          }
        }
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid
      ctx.strokeStyle='rgba(0,255,255,0.04)'; for(let i=0;i<W;i+=30){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke()}
      // top drop zone
      ctx.fillStyle='rgba(0,255,255,0.06)'; ctx.fillRect(0,0,W,42)
      ctx.fillStyle='rgba(255,255,255,0.42)'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('CLICK / ESPACIO PARA SOLTAR • R RESET',W/2,18)
      ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.font='10px JetBrains Mono'; ctx.fillText(`NIVEL ${levelL} • FILAS ${rows} • x8 JACKPOT BORDES`,W/2,30)
      // pegs hexagonal visual
      pegs.forEach(p=>{
        // hexagon peg
        ctx.fillStyle='#0a1a2a'; ctx.beginPath(); for(let k=0;k<6;k++){ const a=k*Math.PI/3; const x=p.x+Math.cos(a)*pegR, y=p.y+Math.sin(a)*pegR; if(k===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)} ctx.closePath(); ctx.fill()
        const grad=ctx.createRadialGradient(p.x-1,p.y-1,1,p.x,p.y,pegR+2)
        grad.addColorStop(0,'#ffffff'); grad.addColorStop(1,'#00aaff')
        ctx.fillStyle=grad; ctx.shadowColor='#00ffff'; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(p.x,p.y,pegR-1,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      })
      // trail
      if(ball){
        ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.beginPath()
        ball.trail.forEach((pt,i)=>{ if(i===0) ctx.moveTo(pt.x,pt.y); else ctx.lineTo(pt.x,pt.y)}); ctx.stroke()
        ctx.fillStyle='#ffffff'; ctx.shadowColor='#ffffff'; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(ball.x,ball.y,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(ball.x-1,ball.y-1,2,0,Math.PI*2); ctx.fill()
      }
      // buckets
      buckets.forEach((b,i)=>{
        const x=i*bucketW
        const isHot=i===0||i===buckets.length-1
        ctx.fillStyle= b.mult>=4? 'rgba(255,215,0,0.22)' : b.mult>=1? 'rgba(0,255,136,0.16)': 'rgba(255,51,85,0.14)'
        ctx.fillRect(x+2, H-36, bucketW-4, 36)
        ctx.strokeStyle= b.mult>=4? '#ffdd00' : b.mult>=1? '#00ff88':'#ff3355'
        ctx.lineWidth= isHot?2:1; ctx.strokeRect(x+2, H-36, bucketW-4,36)
        ctx.fillStyle= b.mult>=4?'#ffdd00': b.mult>=1?'#00ff88':'#ff99aa'
        ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.fillText(`x${b.mult}`, x+bucketW/2, H-14)
        if(isHot){ ctx.fillStyle='rgba(255,221,0,0.6)'; ctx.font='8px JetBrains Mono'; ctx.fillText('JACKPOT',x+bucketW/2,H-24) }
      })
      pool.draw(ctx)
      if(mult){ ctx.fillStyle= mult>=4?'#ffdd00':'#ff5588'; ctx.font='900 16px Orbitron'; ctx.textAlign='center'; ctx.shadowColor=mult>=4?'#ffdd00':'#ff3355'; ctx.shadowBlur=10; ctx.fillText(`x${mult}!`,W/2,H-48); ctx.shadowBlur=0 }
      if(isStartedRef.current===false){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[6/7] cursor-pointer" width={360} height={440}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-amber-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-cyan-300">Lv{level} {mult?`x${mult}`:''}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-cyan-300">{balls} bolas</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Clavijas hexagonales • Trayectoria trazada • Multiplicadores x2-x8 jackpot</p>
    </div>
  )
}
