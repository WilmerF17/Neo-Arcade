import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function LaserGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=> loadBest(bestKey('laser'),0))
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,360)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, levelL=1
    let mirrors:{x:number,y:number,ang:number, moving?:boolean, dir?:number}[]=[
      {x:130,y:118,ang:0.42},{x:290,y:104,ang:-0.58},{x:188,y:228,ang:0.92},{x:330,y:242,ang:-0.28}
    ]
    let target={x:340,y:42,r:14}
    let hitCooldown=0, puzzleSolved=0
    const BK=bestKey('laser')
    let dragIdx=-1
    let over=false

    const randomTarget=()=>{
      target.x= 60+Math.random()*(W-120); target.y= 32+Math.random()*110
    }
    const levelSetup=(lvl:number)=>{
      const cnt=Math.min(6, 3+Math.floor(lvl/2))
      mirrors=[]
      for(let i=0;i<cnt;i++){
        mirrors.push({x: 70+Math.random()*(W-140), y: 80+Math.random()*(H-140), ang: Math.random()*Math.PI, moving: lvl>3 && i%2===0, dir: Math.random()>0.5?1:-1})
      }
      randomTarget()
    }

    const onDown=(e:MouseEvent)=>{
      const r=canvas.getBoundingClientRect()
      const x=(e.clientX-r.left)*(W/r.width), y=(e.clientY-r.top)*(H/r.height)
      mirrors.forEach((m,i)=>{ if(Math.hypot(x-m.x,y-m.y)<22) dragIdx=i })
    }
    const onMove=(e:MouseEvent)=>{
      if(dragIdx===-1) return
      const r=canvas.getBoundingClientRect()
      const x=(e.clientX-r.left)*(W/r.width), y=(e.clientY-r.top)*(H/r.height)
      mirrors[dragIdx].x=Math.max(18,Math.min(W-18,x))
      mirrors[dragIdx].y=Math.max(32,Math.min(H-18,y))
    }
    const onUp=()=> dragIdx=-1
    const onWheel=(e:WheelEvent)=>{
      // rotate nearest or dragged
      let idx=dragIdx
      if(idx===-1){
        const r=canvas.getBoundingClientRect()
        const x=(e.clientX-r.left)*(W/r.width), y=(e.clientY-r.top)*(H/r.height)
        let best=-1, bd=1e9
        mirrors.forEach((m,i)=>{ const d=Math.hypot(x-m.x,y-m.y); if(d<26 && d<bd){ bd=d; best=i } })
        idx=best
      }
      if(idx!==-1){ mirrors[idx].ang+= e.deltaY>0?0.13:-0.13; e.preventDefault() }
    }
    canvas.addEventListener('mousedown',onDown)
    window.addEventListener('mousemove',onMove as any)
    window.addEventListener('mouseup',onUp)
    canvas.addEventListener('wheel',onWheel as any, {passive:false} as any)
    canvas.addEventListener('touchstart', (e:TouchEvent)=>{ const r=canvas.getBoundingClientRect(); const x=(e.touches[0].clientX-r.left)*(W/r.width), y=(e.touches[0].clientY-r.top)*(H/r.height); mirrors.forEach((m,i)=>{ if(Math.hypot(x-m.x,y-m.y)<28) dragIdx=i }); if(dragIdx!==-1) e.preventDefault() }, {passive:false} as any)
    canvas.addEventListener('touchmove', (e:TouchEvent)=>{ if(dragIdx===-1) return; const r=canvas.getBoundingClientRect(); mirrors[dragIdx].x=(e.touches[0].clientX-r.left)*(W/r.width); mirrors[dragIdx].y=(e.touches[0].clientY-r.top)*(H/r.height); e.preventDefault() }, {passive:false} as any)
    window.addEventListener('touchend',onUp)
    // keys for rotate selected with A/D
    window.addEventListener('keydown',(e:KeyboardEvent)=>{
      if(dragIdx!==-1){
        if(e.key.toLowerCase()==='a') mirrors[dragIdx].ang-=0.14
        if(e.key.toLowerCase()==='d') mirrors[dragIdx].ang+=0.14
        if(e.key.toLowerCase()==='r' && over){ scoreL=0; levelL=1; over=false; levelSetup(1); setScore(0); setLevel(1) }
      }
      if(e.key.toLowerCase()==='r' && over){ scoreL=0; levelL=1; over=false; levelSetup(1); setScore(0); setLevel(1) }
    })

    const rayTrace=()=>{
      let x=18, y=H-18, ang=-0.72
      const points:{x:number,y:number}[]=[{x,y}]
      for(let bounce=0; bounce<10; bounce++){
        let hit:any=null, hitDist=1e9
        let hitPt={x:0,y:0}
        // find closest mirror intersection as ray vs line segment
        for(const m of mirrors){
          const len=46
          const x1=m.x - Math.cos(m.ang)*len/2, y1=m.y - Math.sin(m.ang)*len/2
          const x2=m.x + Math.cos(m.ang)*len/2, y2=m.y + Math.sin(m.ang)*len/2
          // ray-line intersection
          const rdx=Math.cos(ang), rdy=Math.sin(ang)
          const sdx=x2-x1, sdy=y2-y1
          const rxs= rdx*sdy - rdy*sdx
          if(Math.abs(rxs)<1e-6) continue
          const t= ((x1 - x)*sdy - (y1 - y)*sdx)/rxs
          const u= ((x1 - x)*rdy - (y1 - y)*rdx)/rxs
          if(t>10 && u>=0 && u<=1){
            const ix=x+rdx*t, iy=y+rdy*t
            const dist=Math.hypot(ix-x,iy-y)
            if(dist<hitDist){ hitDist=dist; hit=m; hitPt={x:ix,y:iy} }
          }
        }
        const tdx=target.x-x, tdy=target.y-y, tdist=Math.hypot(tdx,tdy)
        const tang=Math.atan2(tdy,tdx)
        let tdiff=Math.abs(((tang-ang+Math.PI)%(2*Math.PI))-Math.PI)
        const targetHit = tdiff<0.34 && tdist<hitDist && tdist>8
        if(targetHit){
          points.push({x:target.x,y:target.y})
          if(hitCooldown===0){
            scoreL+= 10 + levelL*3; setScore(scoreL)
            puzzleSolved++
            for(let i=0;i<12;i++) pool.push({x:target.x,y:target.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ffdd00',size:3})
            playTone(880,0.18,'square',0.14)
            if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL)}
            if(puzzleSolved>= 4+levelL){ levelL++; setLevel(levelL); puzzleSolved=0; levelSetup(levelL); playTone(660,0.22,'sine',0.13) } else randomTarget()
            hitCooldown=24
          }
          break
        }
        if(hit){
          points.push(hitPt)
          // reflect: ang = 2*mirrorAng - ang + PI? Actually mirror normal is ang+90deg
          const mAng=hit.ang
          // reflection across line with angle mAng: ang' = 2*mAng - ang + PI? For line angle, reflection formula: ang' = 2*mAng - ang
          // test and adjust
          ang = 2*mAng - ang
          // add PI correction if needed via normal
          // optional fix: ensure not stuck
          x=hitPt.x + Math.cos(ang)*6; y=hitPt.y + Math.sin(ang)*6
        } else {
          const ex=x+Math.cos(ang)*700, ey=y+Math.sin(ang)*700
          points.push({x:ex,y:ey})
          break
        }
      }
      return points
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){
        // still draw
      } else {
        frame++
        if(hitCooldown>0) hitCooldown--
        mirrors.forEach(m=>{ if(m.moving){ m.x+= (m.dir||1)* (0.55+levelL*0.06); if(m.x<40||m.x>W-40) m.dir!*=-1 } })
        // hover via input mouse
        if(input.keys[' '] && dragIdx===-1){
          // brute ray help? no
        }
      }
      pool.update()
      const pts=rayTrace()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.05)'; for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke()}
      for(let y=0;y<H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke()}
      // target with pulse when close
      const glowInt = hitCooldown>0? 18: 10
      ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=glowInt
      ctx.beginPath(); ctx.arc(target.x,target.y,target.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#ff6b35'; ctx.beginPath(); ctx.arc(target.x,target.y,6,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(target.x-2,target.y-2,2,0,Math.PI*2); ctx.fill()
      // mirrors with glow when hit by ray
      mirrors.forEach((m,idx)=>{
        const isDrag=idx===dragIdx
        ctx.save(); ctx.translate(m.x,m.y); ctx.rotate(m.ang)
        ctx.fillStyle= isDrag?'#ffffff': '#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur= isDrag?16:10
        ctx.fillRect(-23,-3,46,6); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.fillRect(-23,-3,46,2)
        // moving indicator
        if(m.moving){ ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.arc(18,0,2,0,Math.PI*2); ctx.fill() }
        ctx.restore()
        ctx.fillStyle= isDrag?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.arc(m.x,m.y, isDrag?22:16,0,Math.PI*2); ctx.fill()
        if(isDrag){ ctx.strokeStyle='#ffffff'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(m.x,m.y,22,0,Math.PI*2); ctx.stroke() }
      })
      // laser with gradient
      const grad=ctx.createLinearGradient(pts[0].x,pts[0].y, target.x,target.y); grad.addColorStop(0,'#ff0080'); grad.addColorStop(1,'#00ffff')
      ctx.strokeStyle=grad; ctx.shadowColor='#ff0080'; ctx.shadowBlur=12; ctx.lineWidth=2.6; ctx.lineCap='round'; ctx.lineJoin='round'
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y)
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y)
      ctx.stroke(); ctx.shadowBlur=0
      // source
      ctx.fillStyle='#ffffff'; ctx.shadowColor='#ffffff'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(18,H-18,8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#ff0080'; ctx.beginPath(); ctx.arc(18,H-18,4,0,Math.PI*2); ctx.fill()
      // bounce dots
      pts.slice(1,-1).forEach(p=>{
        ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      })
      pool.draw(ctx)
      // HUD
      ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(6,6, 180,18)
      ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL} • ${puzzleSolved}/${4+levelL}`,10,18)
      ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.fillText(`HITS ${scoreL}`,W-10,18)
      ctx.fillStyle='rgba(255,255,255,0.42)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText('Arrastra espejos • Rueda/A-D rotar • Niveles con espejos móviles',10,34)
      if(isStartedRef.current===false){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); canvas.removeEventListener('mousedown',onDown); window.removeEventListener('mousemove',onMove as any); window.removeEventListener('mouseup',onUp); canvas.removeEventListener('wheel',onWheel as any); window.removeEventListener('touchend',onUp); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-move" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-fuchsia-300 font-mono">HITS</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Lv{level} • Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Reflexión real • 10 rebotes • Espejos móviles por nivel • Puzzle progresivo</p>
    </div>
  )
}
