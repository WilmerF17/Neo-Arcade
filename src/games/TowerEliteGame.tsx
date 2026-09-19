import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function TowerEliteGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_towerelite_best'))
  const [gold,setGold]=useState(130)
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,480,360)
    const GRID=32, COLS=15, ROWS=11
    const particles=createParticlePool(72)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let scoreL=0, levelL=1, goldL=130, lives=15, gameOver=false, paused=false, wave=1, waveTimer=0, spawning=false
    let selected:{kind:'laser'|'slow'|'splash',cost:number}|null={kind:'laser',cost:50}
    type Tower={x:number,y:number,kind:'laser'|'slow'|'splash',lvl:number,cd:number}
    type Enemy={x:number,y:number,hp:number,maxHp:number,sp:number,idx:number,slow:number,alive:boolean}
    let towers:Tower[]=[]
    let enemies:Enemy[]=[]
    let projs:{x:number,y:number,vx:number,vy:number,alive:boolean,kind:string,dmg:number}[]=[]
    // Elite map: maze-like path with 2 branches
    const path:{x:number,y:number}[]=[]
    for(let x=0;x<6;x++) path.push({x,y:2})
    for(let y=2;y<10;y++) path.push({x:5,y})
    for(let x=5;x<12;x++) path.push({x,y:9})
    for(let y=9;y>=2;y--) path.push({x:11,y})
    for(let x=11;x<15;x++) path.push({x,y:2})
    const pathSet=new Set(path.map(p=>`${p.x},${p.y}`))
    const isPath=(x:number,y:number)=> pathSet.has(`${x},${y}`)

    const spawnWave=()=>{
      spawning=true
      const count= 8 + wave*2 + Math.floor(levelL*1.2)
      let n=0
      const iv=setInterval(()=>{
        if(gameOver||paused) return
        if(n>=count){ clearInterval(iv); spawning=false; return }
        const hp= 14 + wave*7 + levelL*5 + Math.floor(n/2)*3
        const sp= 0.62 + Math.random()*0.42 + levelL*0.05
        // 15% tanky big
        const isTank= Math.random()<0.15
        enemies.push({x:path[0].x*GRID+GRID/2,y:path[0].y*GRID+GRID/2,hp: isTank? hp*1.7:hp, maxHp: isTank?hp*1.7:hp, sp: isTank? sp*0.7:sp, idx:0, slow:0, alive:true})
        n++
      }, 460)
    }
    spawnWave()

    const reset=()=>{
      towers=[]; enemies=[]; projs=[]; particles.clear(); scoreL=0; levelL=1; goldL=130; lives=15; wave=1; gameOver=false; paused=false; spawning=false; waveTimer=0; setScore(0); setLevel(1); setGold(130); spawnWave()
    }
    resetRef.current=reset
    ;(resetRef as any).select=(k:any)=>{
      const costs={laser:50, slow:60, splash:80} as any
      selected={kind:k, cost: costs[k]}
    }

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p'||k===' '){ if(!gameOver) paused=!paused; return }
      if(k==='1') selected={kind:'laser',cost:50}
      if(k==='2') selected={kind:'slow',cost:60}
      if(k==='3') selected={kind:'splash',cost:80}
      if(k==='q' && towers.length){ const t=towers.pop()!; goldL+= Math.floor((t.kind==='laser'?50:t.kind==='slow'?60:80)*0.65); setGold(goldL) }
      if(k==='e'){
        const mx=Math.floor(input.mouse.x/GRID), my=Math.floor(input.mouse.y/GRID)
        const t=towers.find(tt=>tt.x===mx&&tt.y===my)
        if(t && t.lvl<3 && goldL>= 42+t.lvl*24){ goldL-=42+t.lvl*24; t.lvl++; setGold(goldL); playTone(880,0.12,'sine',0.14) }
      }
    }
    window.addEventListener('keydown', onKey)
    const onPointer=(e:MouseEvent)=>{
      const r=c.getBoundingClientRect()
      const mx=Math.floor(((e.clientX-r.left)*(W/r.width))/GRID)
      const my=Math.floor(((e.clientY-r.top)*(H/r.height))/GRID)
      if(mx<0||mx>=COLS||my<0||my>=ROWS) return
      if(isPath(mx,my)) return
      const existing=towers.find(t=>t.x===mx&&t.y===my)
      if(existing){
        if(existing.lvl<3 && goldL>=42+existing.lvl*24){ goldL-=42+existing.lvl*24; existing.lvl++; setGold(goldL); for(let i=0;i<7;i++) particles.push({x:mx*GRID+GRID/2,y:my*GRID+GRID/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ffdd00',size:2.2}); playTone(880,0.12,'square',0.12) }
        return
      }
      if(selected && goldL>=selected.cost){
        goldL-=selected.cost; setGold(goldL)
        towers.push({x:mx,y:my,kind:selected.kind,lvl:1,cd:0})
        for(let i=0;i<6;i++) particles.push({x:mx*GRID+GRID/2,y:my*GRID+GRID/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:selected.kind==='laser'?'#00ffff':selected.kind==='slow'?'#00aaff':'#ff00ff',size:2})
        playTone(640,0.1,'square',0.11)
      }
    }
    c.addEventListener('mousedown', onPointer as any)
    const emit=(x:number,y:number,col:string,n=6)=>{ for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:col,size:2.2}) }

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.05)'; ctx.lineWidth=1
      for(let x=0;x<=COLS;x++){ ctx.beginPath(); ctx.moveTo(x*GRID,0); ctx.lineTo(x*GRID,H); ctx.stroke() }
      for(let y=0;y<=ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*GRID); ctx.lineTo(W,y*GRID); ctx.stroke() }
      // path
      for(let i=0;i<path.length;i++){
        const p=path[i]
        ctx.fillStyle='rgba(255,255,255,0.045)'; ctx.fillRect(p.x*GRID,p.y*GRID,GRID,GRID)
        ctx.strokeStyle='rgba(0,255,255,0.14)'; ctx.strokeRect(p.x*GRID+1,p.y*GRID+1,GRID-2,GRID-2)
        if(i<path.length-1){
          const n=path[i+1]; ctx.fillStyle='rgba(0,255,255,0.2)'; ctx.beginPath(); ctx.arc(p.x*GRID+GRID/2+(n.x-p.x)*7, p.y*GRID+GRID/2+(n.y-p.y)*7,2,0,Math.PI*2); ctx.fill()
        }
      }
      // start / end
      ctx.fillStyle='#00ff88'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText('START', path[0].x*GRID+GRID/2, path[0].y*GRID-4)
      ctx.fillStyle='#ff3366'; ctx.fillText('EXIT', path[path.length-1].x*GRID+GRID/2, path[path.length-1].y*GRID-4)

      for(const t of towers){
        const cx=t.x*GRID+GRID/2, cy=t.y*GRID+GRID/2
        const range= t.kind==='laser'?94: t.kind==='slow'?80:98
        if(frame% 70 <20){ ctx.strokeStyle= t.kind==='laser'?'rgba(0,255,255,0.14)': t.kind==='slow'?'rgba(0,170,255,0.14)':'rgba(255,0,255,0.14)'; ctx.beginPath(); ctx.arc(cx,cy,range,0,Math.PI*2); ctx.stroke() }
        const col= t.kind==='laser'?'#00ffff': t.kind==='slow'?'#00aaff':'#ff00ff'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=12; ctx.beginPath(); (ctx as any).roundRect(t.x*GRID+4,t.y*GRID+4,GRID-8,GRID-8,7); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'; ctx.fillText(t.kind==='laser'?'≋':t.kind==='slow'?'◷':'◈',cx,cy+3)
        ctx.fillStyle='#fff'; ctx.font='700 7px JetBrains Mono'; ctx.fillText(`Lv${t.lvl}`,cx,cy+11)
        // level pips
        ctx.fillStyle='rgba(255,255,255,0.5)'; for(let i=0;i<t.lvl;i++) ctx.fillRect(cx-8+i*8, t.y*GRID+5,6,2)
      }
      for(const e of enemies){
        const big=e.maxHp> 28
        ctx.fillStyle= big?'#ffaa00':'#ff3366'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(e.x,e.y, big?10:8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(e.x-2,e.y-2,1.8,0,Math.PI*2); ctx.fill()
        const pct=e.hp/e.maxHp
        ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(e.x-12,e.y-14,24,4)
        ctx.fillStyle= e.slow>0?'#00aaff':'#ff3366'; ctx.fillRect(e.x-12,e.y-14,24*pct,4)
        if(e.slow>0){ ctx.strokeStyle='rgba(0,170,255,0.7)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(e.x,e.y,12,0,Math.PI*2); ctx.stroke() }
      }
      for(const p of projs){
        const col=p.kind==='splash'?'#ff00ff':'#00ffff'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      }
      particles.draw(ctx)
      ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,20)
      ctx.fillStyle='#ffdd00'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`ORO ${goldL}`,8,14)
      ctx.fillStyle='#00ffff'; ctx.textAlign='center'; ctx.fillText(`OLA ${wave} NIVEL ${levelL}  VIDAS ${lives}`,W/2,14)
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.textAlign='right'; ctx.font='10px JetBrains Mono'; ctx.fillText(`Torres ${towers.length}`,W-8,14)
      if(selected){ ctx.fillStyle='rgba(0,0,0,0.68)'; ctx.fillRect(W/2-56,24,112,14); ctx.fillStyle='#fff'; ctx.font='700 9px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`${selected.kind.toUpperCase()} $${selected.cost}`,W/2,33) }
      if(showPause||paused){ ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2) }
      else if(gameOver){ ctx.fillStyle='rgba(0,0,0,0.64)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#ff3355'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('TORRES CAÍDAS',W/2,H/2-10); ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Ola ${wave}`,W/2,H/2+12); ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar',W/2,H/2+30) }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      for(const t of towers){
        if(t.cd>0){ t.cd--; continue }
        const cx=t.x*GRID+GRID/2, cy=t.y*GRID+GRID/2
        const range=t.kind==='laser'?94:t.kind==='slow'?80:98
        let target:Enemy|null=null, bd=Infinity
        for(const e of enemies){ const d=Math.hypot(e.x-cx,e.y-cy); if(d<range && d<bd){ bd=d; target=e } }
        if(target){
          const dx=target.x-cx, dy=target.y-cy, dist=Math.hypot(dx,dy)||1
          const sp=t.kind==='splash'?5.0:7.2
          const dmg=t.kind==='laser'? 7+t.lvl*3 : t.kind==='slow'? 5+t.lvl*2 : 10+t.lvl*5
          projs.push({x:cx,y:cy,vx:dx/dist*sp,vy:dy/dist*sp,alive:true,kind:t.kind,dmg})
          t.cd= t.kind==='laser'? 16 - t.lvl*2 : t.kind==='slow'? 24 - t.lvl*2 : 32 - t.lvl*3
          if(t.cd<7) t.cd=7
        }
      }
      for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i]
        const nxt=path[e.idx+1]
        if(!nxt){ enemies.splice(i,1); lives--; emit(W-GRID/2, path[path.length-1].y*GRID+GRID/2,'#ff3366',8); playTone(160,0.16,'sawtooth',0.12); if(lives<=0){ gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_towerelite_best',scoreL); onScoreRef.current(scoreL)} } continue }
        const tx=nxt.x*GRID+GRID/2, ty=nxt.y*GRID+GRID/2
        const dx=tx-e.x, dy=ty-e.y, d=Math.hypot(dx,dy)
        if(d<2){ e.idx++; continue }
        const sp=e.slow>0? e.sp*0.38: e.sp
        e.x+=dx/d*sp; e.y+=dy/d*sp
        if(e.slow>0) e.slow--
      }
      for(let i=projs.length-1;i>=0;i--){
        const p=projs[i]
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0||p.x>W||p.y<0||p.y>H){ projs.splice(i,1); continue }
        let hit=false
        for(let j=enemies.length-1;j>=0;j--){
          const e=enemies[j]
          if(Math.hypot(p.x-e.x,p.y-e.y)<12){
            if(p.kind==='splash'){
              for(let k=enemies.length-1;k>=0;k--){
                const oe=enemies[k]
                if(Math.hypot(p.x-oe.x,p.y-oe.y)<36){ oe.hp-=p.dmg; if(oe.hp<=0){ enemies.splice(k,1); scoreL+=14+levelL*2; goldL+=6; setGold(goldL); emit(oe.x,oe.y,'#ff00ff',6) } }
              }
              emit(p.x,p.y,'#ff00ff',10); playTone(520,0.08,'square',0.1)
            } else {
              e.hp-=p.dmg
              if(p.kind==='slow') e.slow=66
              emit(e.x,e.y,p.kind==='slow'?'#00aaff':'#00ffff',4)
              if(e.hp<=0){ enemies.splice(j,1); scoreL+=14+levelL*2; goldL+=6; setGold(goldL); emit(e.x,e.y,'#00ffff',7); playTone(620,0.07,'sine',0.11) }
            }
            projs.splice(i,1); hit=true; break
          }
        }
        if(hit) continue
      }
      if(enemies.length===0 && !spawning){
        waveTimer++
        if(waveTimer>90){
          waveTimer=0; wave++; levelL=Math.min(15, 1+Math.floor(wave/1.5)); setLevel(levelL); scoreL+=36+wave*9; goldL+=20+wave*2; setGold(goldL); setScore(scoreL)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_towerelite_best',scoreL); onScoreRef.current(scoreL) }
          spawnWave(); playTone(740,0.16,'square',0.13)
        }
      }
      if(frame%10===0) setScore(scoreL)
      if(scoreL>bestRef.current) onScoreRef.current(scoreL)
      particles.update()
      draw(false)
    }
    loop()
    return()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); c.removeEventListener('mousedown', onPointer as any); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3]" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-amber-300">Oro {gold} Best {best}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        <button onClick={()=>(resetRef as any).select('laser')} className="py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs">≋ LASER $50 [1]</button>
        <button onClick={()=>(resetRef as any).select('slow')} className="py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black text-xs">◷ SLOW $60 [2]</button>
        <button onClick={()=>(resetRef as any).select('splash')} className="py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs">◈ SPLASH $80 [3]</button>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-xs">REINICIAR [R]</button>
        <span className="px-3 py-2 rounded-lg glass text-[11px] font-mono text-white/60">Click coloca • Click torre upgrade • [E]/[Q]</span>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Elite maze path • Niveles 15 • Tanques • Oro escalado • Venta/upgrade</p>
    </div>
  )
}
