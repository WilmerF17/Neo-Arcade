import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function SnakeDuelGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_snakeduel_best'))
  const [mode,setMode]=useState<'AI'|'2P'>( 'AI')
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted), modeRef=useRef(mode)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{modeRef.current=mode},[mode])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,400,400)
    const GRID=20, COLS=20, ROWS=20
    const particles=createParticlePool(72)
    const input=createInput(c,W,H)
    let raf=0, tick=0
    let scoreL=0, levelL=1, gameOver=false, paused=false, winner: 1|2|0=0
    let snake1:{x:number,y:number}[]=[{x:5,y:10},{x:4,y:10},{x:3,y:10}]
    let snake2:{x:number,y:number}[]=[{x:15,y:10},{x:16,y:10},{x:17,y:10}]
    let dir1={x:1,y:0}, next1={x:1,y:0}
    let dir2={x:-1,y:0}, next2={x:-1,y:0}
    let food={x:10,y:10}, power:{x:number,y:number,kind:'grow'|'slow'|'kill',t:number}|null=null
    let powerTimer=0
    let slowTimer=0
    let shrinkTimer=0, shrinkLevel=0
    let arenaMargin=0 // shrinking arena: walls inward
    let speed=6

    const placeFood=()=>{
      let p:{x:number,y:number}, tries=0
      do{ p={x:arenaMargin+Math.floor(Math.random()*Math.max(1,COLS-arenaMargin*2)), y:arenaMargin+Math.floor(Math.random()*Math.max(1,ROWS-arenaMargin*2))}; tries++ }while(([...snake1,...snake2].some(s=>s.x===p.x&&s.y===p.y) || (power&&power.x===p.x&&power.y===p.y)) && tries<120)
      food=p
    }
    const maybePower=()=>{
      if(power) return
      if(Math.random()<0.018){
        const kinds:('grow'|'slow'|'kill')[]=['grow','slow','kill']
        const kind=kinds[Math.floor(Math.random()*3)]
        let x=0,y=0,tries=0
        do{ x=arenaMargin+Math.floor(Math.random()*Math.max(1,COLS-arenaMargin*2)); y=arenaMargin+Math.floor(Math.random()*Math.max(1,ROWS-arenaMargin*2)); tries++ }while([...snake1,...snake2].some(s=>s.x===x&&s.y===y) && tries<60)
        power={x,y,kind,t:320}
      }
    }
    placeFood()

    const reset=()=>{
      snake1=[{x:5,y:10},{x:4,y:10},{x:3,y:10}]; snake2=[{x:15,y:10},{x:16,y:10},{x:17,y:10}]
      dir1={x:1,y:0}; next1={x:1,y:0}; dir2={x:-1,y:0}; next2={x:-1,y:0}
      scoreL=0; levelL=1; tick=0; winner=0; gameOver=false; paused=false; power=null; slowTimer=0; shrinkTimer=0; shrinkLevel=0; arenaMargin=0; speed=6; particles.clear(); placeFood()
      setScore(0)
    }
    resetRef.current=reset

    // controls: P1 WASD, P2 Arrows (or AI)
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p' || k===' '){ if(!gameOver) paused=!paused; return }
      if(k==='m'){ const nm=modeRef.current==='AI'?'2P':'AI' as any; (modeRef as any).current=nm; setMode(nm); playTone(680,0.12,'square',0.12); return }
      if((k==='w')&&dir1.y===0) next1={x:0,y:-1}
      if((k==='s')&&dir1.y===0) next1={x:0,y:1}
      if((k==='a')&&dir1.x===0) next1={x:-1,y:0}
      if((k==='d')&&dir1.x===0) next1={x:1,y:0}
      if(modeRef.current==='2P'){
        if(k==='arrowup'&&dir2.y===0) next2={x:0,y:-1}
        if(k==='arrowdown'&&dir2.y===0) next2={x:0,y:1}
        if(k==='arrowleft'&&dir2.x===0) next2={x:-1,y:0}
        if(k==='arrowright'&&dir2.x===0) next2={x:1,y:0}
      }
    }
    window.addEventListener('keydown', onKey)

    // touch: split screen left controls P1, right controls P2/AI
    let touchStart={x:0,y:0}
    const onTouchStart=(e:TouchEvent)=>{ touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY} }
    const onTouchEnd=(e:TouchEvent)=>{
      const dx=e.changedTouches[0].clientX-touchStart.x
      const dy=e.changedTouches[0].clientY-touchStart.y
      if(Math.abs(dx)<16&&Math.abs(dy)<16) return
      const isRightSide = touchStart.x > window.innerWidth/2
      const cur = isRightSide ? dir2 : dir1
      let nd=null
      if(Math.abs(dx)>Math.abs(dy)){ if(dx>0&&cur.x===0) nd={x:1,y:0}; else if(dx<0&&cur.x===0) nd={x:-1,y:0} }
      else { if(dy>0&&cur.y===0) nd={x:0,y:1}; else if(dy<0&&cur.y===0) nd={x:0,y:-1} }
      if(nd){ if(isRightSide && modeRef.current==='2P') next2=nd; else if(!isRightSide) next1=nd }
    }
    c.addEventListener('touchstart', onTouchStart as any, {passive:true} as any)
    c.addEventListener('touchend', onTouchEnd as any)

    const aiMove=()=>{
      // simple greedy + avoid collision, BFS-ish: choose dir that reduces dist to food and not into body/wall
      const head=snake2[0]
      const candidates=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].filter(d=> !(d.x===-dir2.x && d.y===-dir2.y))
      // filter out walls/self
      const occupied=new Set([...snake1,...snake2].map(s=>`${s.x},${s.y}`))
      const valid=candidates.filter(d=>{
        const nx=head.x+d.x, ny=head.y+d.y
        if(nx<arenaMargin||nx>=COLS-arenaMargin||ny<arenaMargin||ny>=ROWS-arenaMargin) return false
        if(occupied.has(`${nx},${ny}`)) return false
        return true
      })
      if(valid.length===0) return
      // score by distance to food + avoid trapping (count free neighbours)
      let best=valid[0], bestScore=Infinity
      for(const d of valid){
        const nx=head.x+d.x, ny=head.y+d.y
        const dist=Math.abs(nx-food.x)+Math.abs(ny-food.y)
        // lookahead: count free cells in 2 steps
        let free=0
        for(const dd of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
          const nnx=nx+dd.x, nny=ny+dd.y
          if(nnx>=arenaMargin&&nnx<COLS-arenaMargin&&nny>=arenaMargin&&nny<ROWS-arenaMargin && !occupied.has(`${nnx},${nny}`)) free++
        }
        const sc=dist - free*0.35
        if(sc<bestScore){ bestScore=sc; best=d }
      }
      // occasionally target power if close
      if(power && Math.hypot(head.x-power.x, head.y-power.y)<5 && Math.random()<0.7){
        const dx=Math.sign(power.x-head.x), dy=Math.sign(power.y-head.y)
        const pref= Math.abs(power.x-head.x)>Math.abs(power.y-head.y) ? {x:dx,y:0}:{x:0,y:dy}
        if(valid.some(v=>v.x===pref.x&&v.y===pref.y)) best=pref
      }
      next2=best
    }

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // shrinking arena walls
      ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.lineWidth=1
      for(let i=0;i<=COLS;i++){ ctx.beginPath(); ctx.moveTo(i*GRID,0); ctx.lineTo(i*GRID,H); ctx.stroke() }
      for(let i=0;i<=ROWS;i++){ ctx.beginPath(); ctx.moveTo(0,i*GRID); ctx.lineTo(W,i*GRID); ctx.stroke() }
      // arena border
      if(arenaMargin>0){
        ctx.fillStyle='rgba(255,60,120,0.16)'; ctx.strokeStyle='rgba(255,60,120,0.7)'; ctx.lineWidth=2
        const m=arenaMargin*GRID
        ctx.fillRect(0,0,W,m); ctx.fillRect(0,H-m,W,m); ctx.fillRect(0,0,m,H); ctx.fillRect(W-m,0,m,H)
        ctx.strokeRect(m+1,m+1,W-m*2-2,H-m*2-2)
        ctx.fillStyle='#ff3366'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`ARENA SE CIERRA LV${shrinkLevel}`,W/2, m/2+3)
      }
      // food
      const pul=0.86+Math.sin(Date.now()*0.009)*0.14
      ctx.globalAlpha=pul
      const g=ctx.createRadialGradient(food.x*GRID+GRID/2,food.y*GRID+GRID/2,2,food.x*GRID+GRID/2,food.y*GRID+GRID/2,GRID)
      g.addColorStop(0,'#ffdd00'); g.addColorStop(1,'rgba(255,221,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(food.x*GRID+GRID/2,food.y*GRID+GRID/2,GRID*0.9,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1
      ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=12; ctx.beginPath(); (ctx as any).roundRect(food.x*GRID+4,food.y*GRID+4,GRID-8,GRID-8,6); ctx.fill(); ctx.shadowBlur=0
      if(power){
        const col= power.kind==='grow'?'#00ff88': power.kind==='slow'?'#00aaff':'#ff00ff'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=12; ctx.beginPath(); (ctx as any).roundRect(power.x*GRID+2,power.y*GRID+2,GRID-4,GRID-4,7); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'; ctx.fillText(power.kind==='grow'?'+3': power.kind==='slow'?'◷':'☠', power.x*GRID+GRID/2, power.y*GRID+GRID/2+3)
        ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(power.x*GRID+GRID/2,power.y*GRID+GRID/2,10,-Math.PI/2,-Math.PI/2+Math.PI*2*(power.t/320)); ctx.stroke()
      }
      const drawSnake=(sn:{x:number,y:number}[], col:string, isHeadCol:string)=>{
        sn.forEach((s,i)=>{
          const x=s.x*GRID,y=s.y*GRID
          if(i===0){ ctx.fillStyle=isHeadCol; ctx.shadowColor=isHeadCol; ctx.shadowBlur=14; ctx.beginPath(); (ctx as any).roundRect(x+2,y+2,GRID-4,GRID-4,7); ctx.fill(); ctx.shadowBlur=0 }
          else { const a=1 - i/sn.length*0.55; ctx.fillStyle=col.replace('1)',`${a})`); ctx.beginPath(); (ctx as any).roundRect(x+3,y+3,GRID-6,GRID-6,5); ctx.fill() }
        })
      }
      drawSnake(snake1,'rgba(0,255,255,1)','#ffffff')
      drawSnake(snake2,'rgba(255,0,255,1)','#ff00ff')
      // trail glow between heads?
      particles.draw(ctx)
      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,20)
      ctx.fillStyle='#00ffff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`J1 ${snake1.length} pts`,8,14)
      ctx.fillStyle='#ff00ff'; ctx.textAlign='center'; ctx.fillText(`NIVEL ${levelL} ${slowTimer>0?'◷SLOW':''}`,W/2,14)
      ctx.fillStyle='#ff00ff'; ctx.textAlign='right'; ctx.fillText(`J2 ${snake2.length} pts`,W-8,14)
      if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.66)'; ctx.fillRect(0,0,W,H)
        const msg = winner===1?'¡J1 GANA!': winner===2?'¡J2 GANA!':'EMPATE'
        ctx.fillStyle= winner===1?'#00ffff':'#ff00ff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor=ctx.fillStyle as string; ctx.shadowBlur=12; ctx.fillText(msg,W/2,H/2-8); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`J1:${snake1.length} J2:${snake2.length} Score ${scoreL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='11px JetBrains Mono'; ctx.fillText('R reiniciar — M modo',W/2,H/2+30)
      } else if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }
      if(slowTimer>0) slowTimer--
      if(power){ power.t--; if(power.t<=0) power=null }
      else maybePower()
      shrinkTimer++
      if(shrinkTimer> 520){ shrinkTimer=0; if(arenaMargin<4){ arenaMargin++; shrinkLevel++; playTone(420,0.18,'sawtooth',0.14); for(let i=0;i<10;i++) particles.push({x:W/2,y:H/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff3355',size:2}) } }
      if(modeRef.current==='AI' && tick%3===0) aiMove()
      const effSpeed = slowTimer>0? 9 : Math.max(3, speed - Math.floor(levelL*0.3))
      tick++
      if(tick % effSpeed !==0){ draw(false); return }
      dir1={...next1}; dir2={...next2}
      const h1={x:snake1[0].x+dir1.x, y:snake1[0].y+dir1.y}
      const h2={x:snake2[0].x+dir2.x, y:snake2[0].y+dir2.y}
      // check wall/arena
      const out1 = h1.x<arenaMargin||h1.x>=COLS-arenaMargin||h1.y<arenaMargin||h1.y>=ROWS-arenaMargin
      const out2 = h2.x<arenaMargin||h2.x>=COLS-arenaMargin||h2.y<arenaMargin||h2.y>=ROWS-arenaMargin
      const hit1Self= snake1.some(s=>s.x===h1.x&&s.y===h1.y)
      const hit2Self= snake2.some(s=>s.x===h2.x&&s.y===h2.y)
      const hit1Other= snake2.some(s=>s.x===h1.x&&s.y===h1.y)
      const hit2Other= snake1.some(s=>s.x===h2.x&&s.y===h2.y)
      const headOn= h1.x===h2.x&&h1.y===h2.y
      if(out1||hit1Self||hit1Other||headOn){ gameOver=true; winner=2; playTone(140,0.4,'sawtooth',0.18) }
      else if(out2||hit2Self||hit2Other){ if(!gameOver){ gameOver=true; winner=1; playTone(180,0.4,'sawtooth',0.18) } }
      if(gameOver){
        // scoring: length diff + level
        const pts = snake1.length*8 + levelL*10
        scoreL+=pts; setScore(scoreL)
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_snakeduel_best',scoreL); onScoreRef.current(scoreL) }
        return
      }
      snake1.unshift(h1); snake2.unshift(h2)
      let ate1=false, ate2=false
      if(h1.x===food.x&&h1.y===food.y){ ate1=true }
      if(h2.x===food.x&&h2.y===food.y){ ate2=true }
      if(ate1||ate2){
        // if both eat same tick, give to both
        if(ate1){ for(let i=0;i<10;i++) particles.push({x:food.x*GRID+GRID/2,y:food.y*GRID+GRID/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ffdd00',size:2.4}) ; playTone(660,0.12,'square',0.14) }
        if(ate2){ for(let i=0;i<10;i++) particles.push({x:food.x*GRID+GRID/2,y:food.y*GRID+GRID/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ff00ff',size:2.4}) ; playTone(520,0.12,'square',0.14) }
        placeFood()
        scoreL+=10+levelL*2; setScore(scoreL)
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_snakeduel_best',scoreL); onScoreRef.current(scoreL) }
        const newLevel=Math.floor(scoreL/80)+1
        if(newLevel!==levelL){ levelL=newLevel; playTone(740,0.14,'triangle',0.14) }
      } else {
        snake1.pop(); snake2.pop()
      }
      // power pickup
      if(power){
        if(h1.x===power.x&&h1.y===power.y){
          if(power.kind==='grow'){ for(let i=0;i<3;i++) snake1.push({...snake1[snake1.length-1]}); playTone(880,0.16,'sine',0.15) }
          else if(power.kind==='slow'){ slowTimer=240; playTone(400,0.18,'triangle',0.14) }
          else if(power.kind==='kill'){ // kill opponent tail
            if(snake2.length>3) snake2.splice(-2,2); playTone(300,0.2,'square',0.18)
            for(let i=0;i<12;i++) particles.push({x:power.x*GRID+GRID/2,y:power.y*GRID+GRID/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff00ff',size:2.2})
          }
          power=null
        } else if(h2.x===power.x&&h2.y===power.y){
          if(power.kind==='grow'){ for(let i=0;i<3;i++) snake2.push({...snake2[snake2.length-1]}) }
          else if(power.kind==='slow'){ slowTimer=240 }
          else if(power.kind==='kill'){ if(snake1.length>3) snake1.splice(-2,2) }
          for(let i=0;i<8;i++) particles.push({x:power.x*GRID+GRID/2,y:power.y*GRID+GRID/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ff00ff',size:2})
          power=null; playTone(520,0.14,'square',0.13)
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
        <button onClick={()=>setMode(m=>m==='AI'?'2P':'AI')} className="px-3 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs">{mode==='AI'?'VS IA':'2 JUGADORES'} [M]</button>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">J1 WASD • J2 Flechas {mode==='AI'?'• IA pathfinding':''} • Arena se cierra cada ~8s • Power-ups grow/slow/kill</p>
    </div>
  )
}
