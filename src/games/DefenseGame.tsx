import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function DefenseGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_defense_best'))
  const [gold,setGold]=useState(110)
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,480,360)
    const GRID=30, COLS=16, ROWS=12
    const particles=createParticlePool(72)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let scoreL=0, levelL=1, goldL=110, lives=12, gameOver=false, paused=false, wave=1, waveTimer=0, spawning=false
    let selected:{kind:'laser'|'slow'|'splash', cost:number}|null=null
    type Tower={x:number,y:number,kind:'laser'|'slow'|'splash',lvl:number,cd:number}
    type Enemy={x:number,y:number, hp:number,maxHp:number, sp:number, pathIdx:number, slow:number, alive:boolean}
    type Proj={x:number,y:number, vx:number,vy:number, alive:boolean, kind:'laser'|'splash', dmg:number}
    let towers:Tower[]=[]
    let enemies:Enemy[]=[]
    let projs:Proj[]=[]
    // path is fixed corridor around edges then middle
    const path:{x:number,y:number}[]=[]
    // create path: start top-left, go right, down, left, down, right to exit
    for(let x=0;x<12;x++) path.push({x,y:1})
    for(let y=1;y<6;y++) path.push({x:11,y})
    for(let x=11;x>=3;x--) path.push({x,y:5})
    for(let y=5;y<9;y++) path.push({x:3,y})
    for(let x=3;x<16;x++) path.push({x,y:8})
    const pathSet=new Set(path.map(p=>`${p.x},${p.y}`))
    const isPath=(x:number,y:number)=> pathSet.has(`${x},${y}`)

    const spawnWave=()=>{
      spawning=true
      const count= 6 + wave*2 + levelL
      let spawned=0
      const iv=setInterval(()=>{
        if(gameOver || paused){ return }
        if(spawned>=count){ clearInterval(iv); spawning=false; return }
        const hp= 10 + wave*6 + levelL*4 + Math.floor(spawned/3)*4
        const sp= 0.55 + Math.random()*0.35 + levelL*0.06
        enemies.push({x:path[0].x*GRID+GRID/2, y:path[0].y*GRID+GRID/2, hp, maxHp:hp, sp, pathIdx:0, slow:0, alive:true})
        spawned++
      }, 520)
    }
    spawnWave()

    const reset=()=>{
      towers=[]; enemies=[]; projs=[]; particles.clear(); scoreL=0; levelL=1; goldL=110; lives=12; wave=1; spawning=false; gameOver=false; paused=false; waveTimer=0; setScore(0); setLevel(1); setGold(110); spawnWave()
    }
    resetRef.current=reset
    ;(resetRef as any).select=(k:any)=>{
      const costs={laser:45, slow:55, splash:70} as any
      selected={kind:k, cost: costs[k]}
    }

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p'||k===' '){ if(!gameOver) paused=!paused; return }
      if(k==='1') selected={kind:'laser',cost:45}
      if(k==='2') selected={kind:'slow',cost:55}
      if(k==='3') selected={kind:'splash',cost:70}
      if(k==='q'){ // sell last
        if(towers.length){ const t=towers.pop()!; goldL+= Math.floor((t.kind==='laser'?45:t.kind==='slow'?55:70)*0.6); setGold(goldL) }
      }
      if(k==='e'){ // upgrade nearest to mouse
        const mx=Math.floor(input.mouse.x/GRID), my=Math.floor(input.mouse.y/GRID)
        const t=towers.find(tt=>tt.x===mx&&tt.y===my)
        if(t && t.lvl<3 && goldL>= 38 + t.lvl*22){ goldL-= 38+t.lvl*22; t.lvl++; setGold(goldL); playTone(880,0.12,'square',0.12) }
      }
    }
    window.addEventListener('keydown', onKey)

    const onPointer=(e:MouseEvent)=>{
      const rect=c.getBoundingClientRect()
      const mx=Math.floor(((e.clientX-rect.left)*(W/rect.width))/GRID)
      const my=Math.floor(((e.clientY-rect.top)*(H/rect.height))/GRID)
      if(mx<0||mx>=COLS||my<0||my>=ROWS) return
      if(isPath(mx,my)) return
      if(towers.some(t=>t.x===mx&&t.y===my)){
        // click again upgrades
        const t=towers.find(tt=>tt.x===mx&&tt.y===my)!
        if(t.lvl<3 && goldL>=38+t.lvl*22){ goldL-=38+t.lvl*22; t.lvl++; setGold(goldL); emit(t.x*GRID+GRID/2,t.y*GRID+GRID/2,'#ffdd00',8); playTone(880,0.1,'sine',0.13) }
        return
      }
      if(selected && goldL>=selected.cost){
        goldL-=selected.cost; setGold(goldL)
        towers.push({x:mx,y:my,kind:selected.kind,lvl:1,cd:0})
        emit(mx*GRID+GRID/2,my*GRID+GRID/2, selected.kind==='laser'?'#00ffff': selected.kind==='slow'?'#00aaff':'#ff00ff',7)
        playTone(640,0.1,'square',0.12)
      }
    }
    c.addEventListener('mousedown', onPointer as any)

    const emit=(x:number,y:number,col:string,n=6)=>{ for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:col,size:2.2}) }

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid
      ctx.strokeStyle='rgba(0,255,255,0.05)'; ctx.lineWidth=1
      for(let x=0;x<=COLS;x++){ ctx.beginPath(); ctx.moveTo(x*GRID,0); ctx.lineTo(x*GRID,H); ctx.stroke() }
      for(let y=0;y<=ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*GRID); ctx.lineTo(W,y*GRID); ctx.stroke() }
      // path neon
      for(const p of path){
        ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(p.x*GRID, p.y*GRID, GRID, GRID)
        ctx.strokeStyle='rgba(0,255,255,0.12)'; ctx.strokeRect(p.x*GRID+1, p.y*GRID+1, GRID-2, GRID-2)
        // direction arrow
        const idx=path.indexOf(p)
        if(idx<path.length-1){
          const nxt=path[idx+1]; const dx=nxt.x-p.x, dy=nxt.y-p.y
          ctx.fillStyle='rgba(0,255,255,0.18)'; ctx.beginPath(); ctx.arc(p.x*GRID+GRID/2+dx*6 , p.y*GRID+GRID/2+dy*6,2,0,Math.PI*2); ctx.fill()
        }
      }
      // towers A* placement: glow range
      for(const t of towers){
        const cx=t.x*GRID+GRID/2, cy=t.y*GRID+GRID/2
        // range ring (pulse)
        const range= t.kind==='laser'? 86 : t.kind==='slow'? 74 : 92
        if(frame% 60 < 18){
          ctx.strokeStyle= t.kind==='laser'?'rgba(0,255,255,0.18)': t.kind==='slow'?'rgba(0,170,255,0.18)':'rgba(255,0,255,0.18)'
          ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cy, range,0,Math.PI*2); ctx.stroke()
        }
        const col= t.kind==='laser'?'#00ffff': t.kind==='slow'?'#00aaff':'#ff00ff'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=12
        ctx.beginPath(); (ctx as any).roundRect(t.x*GRID+4, t.y*GRID+4, GRID-8, GRID-8,6); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'; ctx.fillText(t.kind==='laser'?'≋': t.kind==='slow'?'◷':'◈', cx, cy+3)
        ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.font='700 7px JetBrains Mono'; ctx.fillText(`Lv${t.lvl}`, cx, cy+11)
      }
      // enemies pathfinding A* already follows fixed path
      for(const e of enemies){
        ctx.fillStyle='#ff3355'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=8
        ctx.beginPath(); ctx.arc(e.x,e.y, 8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(e.x-2,e.y-2,1.8,0,Math.PI*2); ctx.fill()
        // hp bar
        const pct=e.hp/e.maxHp
        ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(e.x-12,e.y-14,24,4)
        ctx.fillStyle= e.slow>0?'#00aaff':'#ff3355'; ctx.fillRect(e.x-12,e.y-14,24*pct,4)
        if(e.slow>0){ ctx.strokeStyle='#00aaff'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(e.x,e.y,11,0,Math.PI*2); ctx.stroke() }
      }
      for(const p of projs){
        ctx.fillStyle= p.kind==='splash'?'#ff00ff':'#00ffff'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=7
        ctx.beginPath(); ctx.arc(p.x,p.y,3.2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      }
      particles.draw(ctx)
      // HUD
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,20)
      ctx.fillStyle='#ffdd00'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`ORO ${goldL}`,8,14)
      ctx.fillStyle='#00ffff'; ctx.textAlign='center'; ctx.font='700 11px JetBrains Mono'; ctx.fillText(`OLA ${wave} NIVEL ${levelL}`,W/2,14)
      ctx.fillStyle='#ff3355'; ctx.textAlign='right'; ctx.fillText(`VIDAS ${lives}`,W-8,14)
      if(selected){
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(W/2-54,24,108,16)
        ctx.fillStyle='#fff'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`${selected.kind.toUpperCase()} $${selected.cost}`,W/2,34)
      }
      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.66)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('BASE CAÍDA',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Ola ${wave}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar',W/2,H/2+30)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      // towers attack: find nearest enemy within range
      for(const t of towers){
        if(t.cd>0){ t.cd--; continue }
        const cx=t.x*GRID+GRID/2, cy=t.y*GRID+GRID/2
        const range= t.kind==='laser'?86: t.kind==='slow'?74:86
        let target:Enemy|null=null, bestDist=Infinity
        for(const e of enemies){
          const d=Math.hypot(e.x-cx, e.y-cy)
          if(d<range && d<bestDist){ bestDist=d; target=e }
        }
        if(target){
          const dx=target.x-cx, dy=target.y-cy, dist=Math.hypot(dx,dy)||1
          const sp= t.kind==='splash'? 5.2 : 7.0
          const dmg= t.kind==='laser'? (6+t.lvl*3) : t.kind==='slow'? (4+t.lvl*2) : (9+t.lvl*4)
          projs.push({x:cx,y:cy, vx:dx/dist*sp, vy:dy/dist*sp, alive:true, kind: t.kind==='splash'?'splash':'laser', dmg})
          t.cd= t.kind==='laser'? 18 - t.lvl*2 : t.kind==='slow'? 26 - t.lvl*2 : 34 - t.lvl*3
          if(t.cd<8) t.cd=8
        }
      }

      // move enemies along path
      for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i]
        const target=path[e.pathIdx+1]
        if(!target){ // reached exit
          enemies.splice(i,1); lives--; emit(W-GRID/2, 8*GRID+GRID/2,'#ff3355',8); playTone(180,0.18,'sawtooth',0.13)
          if(lives<=0){ gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_defense_best',scoreL); onScoreRef.current(scoreL)} }
          continue
        }
        const tx=target.x*GRID+GRID/2, ty=target.y*GRID+GRID/2
        const dx=tx-e.x, dy=ty-e.y, dist=Math.hypot(dx,dy)
        if(dist<2){ e.pathIdx++; continue }
        const effSp= e.slow>0? e.sp*0.42 : e.sp
        e.x+= dx/dist*effSp; e.y+= dy/dist*effSp
        if(e.slow>0) e.slow--
      }

      // projectiles
      for(let i=projs.length-1;i>=0;i--){
        const p=projs[i]
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0||p.x>W||p.y<0||p.y>H){ projs.splice(i,1); continue }
        let hit=false
        for(let j=enemies.length-1;j>=0;j--){
          const e=enemies[j]
          if(Math.hypot(p.x-e.x,p.y-e.y)<12){
            if(p.kind==='splash'){
              // splash area
              for(let k=enemies.length-1;k>=0;k--){
                const oe=enemies[k]
                if(Math.hypot(p.x-oe.x,p.y-oe.y)<34){
                  oe.hp-=p.dmg
                  oe.slow=0
                  emit(oe.x,oe.y,'#ff00ff',4)
                  if(oe.hp<=0){ enemies.splice(k,1); scoreL+=14+levelL*2; goldL+=5; setGold(goldL); emit(oe.x,oe.y,'#ffdd00',7); playTone(520,0.08,'square',0.1) }
                }
              }
              emit(p.x,p.y,'#ff00ff',10)
            } else {
              e.hp-=p.dmg
              if(p.kind==='laser' && (p as any).kind!=='splash'){ /* slow type handles below */ }
              // slow effect if tower was slow: we need to know origin. Use dmg low as indicator
              const isSlowProj = p.dmg <= 8 // slow does less dmg
              if(isSlowProj) e.slow= 60
              emit(e.x,e.y,'#00ffff',4)
              if(e.hp<=0){ enemies.splice(j,1); scoreL+=14+levelL*2; goldL+=6; setGold(goldL); emit(e.x,e.y,'#00ffff',8); playTone(620,0.07,'sine',0.11) }
            }
            // laser beam visual
            projs.splice(i,1); hit=true; break
          }
        }
        if(hit) continue
      }

      // wave progression
      if(enemies.length===0 && !spawning){
        waveTimer++
        if(waveTimer> 90){
          waveTimer=0; wave++; levelL=Math.min(12, 1+Math.floor(wave/1.6)); setLevel(levelL)
          scoreL+= 30+wave*8; setScore(scoreL); setGold(goldL); goldL+= 18+wave*2; setGold(goldL)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_defense_best',scoreL); onScoreRef.current(scoreL) }
          spawnWave(); playTone(740,0.16,'square',0.13)
          setScore(scoreL)
        }
      } else {
        // continuous score tick
        if(frame%18===0){ setScore(scoreL); setGold(goldL) }
      }

      if(frame%12===0){ setScore(scoreL); }
      if(scoreL>bestRef.current) onScoreRef.current(scoreL)
      particles.update()
      draw(false)
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey)
      c.removeEventListener('mousedown', onPointer as any)
      input.cleanup()
    }
  },[])

  const selLaser=()=> (resetRef as any).select?.('laser')
  const selSlow=()=> (resetRef as any).select?.('slow')
  const selSplash=()=> (resetRef as any).select?.('splash')

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3]" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-amber-300">Oro {gold} Best {best}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        <button onClick={selLaser} className="py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs">≋ LASER $45 [1]</button>
        <button onClick={selSlow} className="py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black text-xs">◷ SLOW $55 [2]</button>
        <button onClick={selSplash} className="py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs">◈ SPLASH $70 [3]</button>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-xs">REINICIAR [R]</button>
        <span className="px-3 py-2 rounded-lg glass text-[11px] font-mono text-white/60">Click coloca • Click torre Lv up • [E] upgrade • [Q] vender</span>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">LaserGrid A* path • 3 torretas • Oleadas HP escalado • 12 vidas</p>
    </div>
  )
}
