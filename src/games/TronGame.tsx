import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function TronGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_tron_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,400,400)
    const GRID=10, COLS=40, ROWS=40, TRAIL_MAX=180
    const particles=createParticlePool(64)
    const input=createInput(c,W,H)
    let raf=0, tick=0, frame=0
    let scoreL=0, levelL=1, gameOver=false, paused=false
    let p1={x:8,y:20,dir:{x:1,y:0}, next:{x:1,y:0}, trail:[] as {x:number,y:number}[], alive:true}
    let p2={x:32,y:20,dir:{x:-1,y:0}, next:{x:-1,y:0}, trail:[] as {x:number,y:number}[], alive:true}
    let wallTimer=0, wallMargin=0
    let speedTicks=4 // ticks per move

    const reset=()=>{
      p1={x:8,y:20,dir:{x:1,y:0},next:{x:1,y:0},trail:[],alive:true}
      p2={x:32,y:20,dir:{x:-1,y:0},next:{x:-1,y:0},trail:[],alive:true}
      scoreL=0; levelL=1; tick=0; frame=0; wallTimer=0; wallMargin=0; speedTicks=4; gameOver=false; paused=false; particles.clear(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const isOccupied=(x:number,y:number)=>{
      if(x<wallMargin||x>=COLS-wallMargin||y<wallMargin||y>=ROWS-wallMargin) return true
      if(p1.trail.some(p=>p.x===x&&p.y===y)) return true
      if(p2.trail.some(p=>p.x===x&&p.y===y)) return true
      if(p1.x===x&&p1.y===y) return true
      if(p2.x===x&&p2.y===y) return true
      return false
    }

    // IA pathfinding simple + flood fill to avoid traps
    const aiChoose=()=>{
      const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].filter(d=> !(d.x===-p2.dir.x && d.y===-p2.dir.y))
      // filter not occupied immediate
      const valid=dirs.filter(d=> !isOccupied(p2.x+d.x,p2.y+d.y))
      if(valid.length===0) return
      // score by flood fill area + distance to center / to p1
      let best=valid[0], bestScore=-Infinity
      for(const d of valid){
        const nx=p2.x+d.x, ny=p2.y+d.y
        // flood fill count reachable cells up to 40 steps
        let count=0
        const seen=new Set<string>()
        const q:{x:number,y:number}[]=[{x:nx,y:ny}]
        seen.add(`${nx},${ny}`)
        while(q.length && count<80){
          const cur=q.shift()!
          count++
          for(const dd of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
            const nnx=cur.x+dd.x, nny=cur.y+dd.y
            const key=`${nnx},${nny}`
            if(seen.has(key)) continue
            if(nnx<wallMargin||nnx>=COLS-wallMargin||nny<wallMargin||nny>=ROWS-wallMargin) continue
            if(p1.trail.some(p=>p.x===nnx&&p.y===nny)) continue
            if(p2.trail.some(p=>p.x===nnx&&p.y===nny)) continue
            // also avoid p1 head adjacency? not needed
            seen.add(key); q.push({x:nnx,y:nny})
          }
        }
        // also want to chase p1 if close
        const distToP1= Math.abs(nx-p1.x)+Math.abs(ny-p1.y)
        const sc= count - distToP1*0.08 + (d.x===p2.dir.x&&d.y===p2.dir.y? 2:0)
        if(sc>bestScore){ bestScore=sc; best=d }
      }
      p2.next=best
    }

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p'||k===' '){ if(!gameOver) paused=!paused; return }
      if((k==='w')&&p1.dir.y===0) p1.next={x:0,y:-1}
      if((k==='s')&&p1.dir.y===0) p1.next={x:0,y:1}
      if((k==='a')&&p1.dir.x===0) p1.next={x:-1,y:0}
      if((k==='d')&&p1.dir.x===0) p1.next={x:1,y:0}
      if(k==='arrowup'&&p2.dir.y===0) p2.next={x:0,y:-1}
      if(k==='arrowdown'&&p2.dir.y===0) p2.next={x:0,y:1}
      if(k==='arrowleft'&&p2.dir.x===0) p2.next={x:-1,y:0}
      if(k==='arrowright'&&p2.dir.x===0) p2.next={x:1,y:0}
    }
    window.addEventListener('keydown', onKey)

    let touchStart={x:0,y:0}
    const onTouchStart=(e:TouchEvent)=>{ touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY} }
    const onTouchEnd=(e:TouchEvent)=>{
      const dx=e.changedTouches[0].clientX-touchStart.x, dy=e.changedTouches[0].clientY-touchStart.y
      if(Math.abs(dx)<16&&Math.abs(dy)<16) return
      const isRight=touchStart.x>window.innerWidth/2
      const cur= isRight? p2.dir : p1.dir
      let nd=null as any
      if(Math.abs(dx)>Math.abs(dy)){ if(dx>0&&cur.x===0) nd={x:1,y:0}; else if(dx<0&&cur.x===0) nd={x:-1,y:0} }
      else { if(dy>0&&cur.y===0) nd={x:0,y:1}; else if(dy<0&&cur.y===0) nd={x:0,y:-1} }
      if(nd){ if(isRight) p2.next=nd; else p1.next=nd }
    }
    c.addEventListener('touchstart', onTouchStart as any, {passive:true} as any)
    c.addEventListener('touchend', onTouchEnd as any)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let i=0;i<=COLS;i++){ ctx.beginPath(); ctx.moveTo(i*GRID,0); ctx.lineTo(i*GRID,H); ctx.stroke() }
      for(let i=0;i<=ROWS;i++){ ctx.beginPath(); ctx.moveTo(0,i*GRID); ctx.lineTo(W,i*GRID); ctx.stroke() }
      // wall margin
      if(wallMargin>0){
        ctx.fillStyle='rgba(255,60,120,0.14)'; ctx.strokeStyle='rgba(255,60,120,0.6)'; ctx.lineWidth=2
        const m=wallMargin*GRID
        ctx.fillRect(0,0,W,m); ctx.fillRect(0,H-m,W,m); ctx.fillRect(0,0,m,H); ctx.fillRect(W-m,0,m,H)
        ctx.strokeRect(m+0.5,m+0.5,W-m*2-1,H-m*2-1)
        ctx.fillStyle='#ff3366'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`MUROS CIERRAN LV${levelL}`,W/2,m/2+3)
      }
      // trails
      const drawTrail=(trail:{x:number,y:number}[], col:string)=>{
        for(let i=0;i<trail.length;i++){
          const p=trail[i]
          const alpha= 0.22 + (i/trail.length)*0.78
          ctx.globalAlpha=alpha
          ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur= i>trail.length-8?8:0
          ctx.fillRect(p.x*GRID+1,p.y*GRID+1,GRID-2,GRID-2)
          ctx.shadowBlur=0
        }
        ctx.globalAlpha=1
      }
      drawTrail(p1.trail,'#00ffff')
      drawTrail(p2.trail,'#ff00ff')
      // heads
      ctx.fillStyle='#ffffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=14
      ctx.beginPath(); (ctx as any).roundRect(p1.x*GRID+1,p1.y*GRID+1,GRID-2,GRID-2,3); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#ff00ff'; ctx.shadowColor='#ff00ff'; ctx.shadowBlur=14
      ctx.beginPath(); (ctx as any).roundRect(p2.x*GRID+1,p2.y*GRID+1,GRID-2,GRID-2,3); ctx.fill(); ctx.shadowBlur=0

      particles.draw(ctx)
      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,20)
      ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`J1 ${p1.trail.length}`,8,14)
      ctx.fillStyle='#ff00ff'; ctx.textAlign='center'; ctx.font='900 11px Orbitron'; ctx.fillText(`NIVEL ${levelL}`,W/2,14)
      ctx.textAlign='right'; ctx.fillStyle='#ff00ff'; ctx.font='700 10px JetBrains Mono'; ctx.fillText(`J2 ${p2.trail.length}`,W-8,14)

      if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        const win= !p1.alive && !p2.alive ? 'EMPATE' : !p1.alive ? '¡J2 GANA!' : '¡J1 GANA!'
        const col= win.includes('J1')?'#00ffff':'#ff00ff'
        ctx.fillStyle=col; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor=col; ctx.shadowBlur=12; ctx.fillText(win,W/2,H/2-8); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL}`,W/2,H/2+14)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar',W/2,H/2+30)
      } else if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.48)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      wallTimer++
      if(wallTimer> 1200){ wallTimer=0; wallMargin=Math.min(6, wallMargin+1); playTone(420,0.14,'sawtooth',0.12) } // ~20s

      tick++
      if(tick % speedTicks !==0){ draw(false); return }

      // AI periodically
      if(frame%2===0) aiChoose()

      p1.dir={...p1.next}; p2.dir={...p2.next}
      // push trails
      p1.trail.push({x:p1.x,y:p1.y}); p2.trail.push({x:p2.x,y:p2.y})
      if(p1.trail.length>TRAIL_MAX) p1.trail.shift()
      if(p2.trail.length>TRAIL_MAX) p2.trail.shift()

      const n1={x:p1.x+p1.dir.x, y:p1.y+p1.dir.y}
      const n2={x:p2.x+p2.dir.x, y:p2.y+p2.dir.y}

      const dead1= isOccupied(n1.x,n1.y)
      const dead2= isOccupied(n2.x,n2.y)
      // head-to-head special: both die if same cell
      const headOn= n1.x===n2.x && n1.y===n2.y
      if(dead1||dead2||headOn){
        if(dead1||headOn) p1.alive=false
        if(dead2||headOn) p2.alive=false
        gameOver=true
        if(!p1.alive&&!p2.alive){ scoreL+=5 }
        else if(!p1.alive){ // p2 wins
          // p2 score not tracked but global
        } else { scoreL+= 20 + levelL*6; setScore(scoreL); if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_tron_best',scoreL); onScoreRef.current(scoreL)} }
        for(let i=0;i<14;i++){
          const who= !p1.alive? p1: p2
          particles.push({x:who.x*GRID+GRID/2,y:who.y*GRID+GRID/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:!p1.alive?'#00ffff':'#ff00ff',size:2.4})
        }
        playTone(140,0.35,'sawtooth',0.16)
        // level progression even on loss? no, only on win via survival ticks
      } else {
        p1.x=n1.x; p1.y=n1.y; p2.x=n2.x; p2.y=n2.y
        // scoring: survival
        scoreL+=1
        if(frame%8===0) setScore(scoreL)
        if(scoreL>bestRef.current) onScoreRef.current(scoreL)
        // level up each survival threshold
        const newLevel=Math.floor(scoreL/80)+1
        if(newLevel!==levelL){
          levelL=newLevel; setLevel(levelL); speedTicks=Math.max(2, 4 - Math.floor(levelL/2)); playTone(660,0.14,'square',0.13)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_tron_best',scoreL); onScoreRef.current(scoreL) }
        }
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
    <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-square" width={400} height={400}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">WASD J1 • Flechas J2 • Estela 40×40 • IA flood-fill • Vel 4→2 ticks • Muros cierran cada 20s</p>
    </div>
  )
}
