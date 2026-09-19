import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function DungeonGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_dungeon_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,480,360)
    const TILE=24, COLS=20, ROWS=15
    const particles=createParticlePool(64)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let scoreL=0, levelL=1, gameOver=false, paused=false, keysCollected=0, keysNeeded=2
    let player={x:1,y:1,hp:5,maxHp:5, inv:0, hasKey:false, keys:0}
    type Enemy={x:number,y:number,hp:number,alive:boolean, cd:number}
    let enemies:Enemy[]=[]
    let boss:{x:number,y:number,hp:number,alive:boolean,cd:number}|null=null
    let map:number[][]=[] // 0 floor 1 wall
    let exit:{x:number,y:number}|null=null
    let coins:{x:number,y:number,alive:boolean}[]=[]
    let hearts:{x:number,y:number,alive:boolean}[]=[]

    const genMap=()=>{
      map=Array.from({length:ROWS},()=>Array(COLS).fill(1))
      // carve rooms + corridors
      const rooms:{x:number,y:number,w:number,h:number}[]=[]
      for(let i=0;i<6;i++){
        const w=4+Math.floor(Math.random()*4), h=3+Math.floor(Math.random()*3)
        const x=1+Math.floor(Math.random()*(COLS-w-2)), y=1+Math.floor(Math.random()*(ROWS-h-2))
        rooms.push({x,y,w,h})
        for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) map[yy][xx]=0
      }
      // connect rooms
      for(let i=0;i<rooms.length-1;i++){
        const a=rooms[i], b=rooms[i+1]
        const ax=Math.floor(a.x+a.w/2), ay=Math.floor(a.y+a.h/2)
        const bx=Math.floor(b.x+b.w/2), by=Math.floor(b.y+b.h/2)
        for(let x=Math.min(ax,bx); x<=Math.max(ax,bx); x++) map[ay][x]=0
        for(let y=Math.min(ay,by); y<=Math.max(ay,by); y++) map[y][bx]=0
      }
      // ensure border
      for(let x=0;x<COLS;x++){ map[0][x]=1; map[ROWS-1][x]=1 }
      for(let y=0;y<ROWS;y++){ map[y][0]=1; map[y][COLS-1]=1 }
      // pick player start at first room center
      const s=rooms[0]
      player.x=Math.floor(s.x+s.w/2); player.y=Math.floor(s.y+s.h/2)
      // exit at last room
      const e=rooms[rooms.length-1]
      exit={x:Math.floor(e.x+e.w/2), y:Math.floor(e.y+e.h/2)}
      map[exit.y][exit.x]=0
      // enemies A* will navigate; place enemies in rooms 1..4
      enemies=[]
      for(let i=1;i<rooms.length-1;i++){
        const r=rooms[i]
        const cnt= 1+ Math.floor(Math.random()*2) + (levelL>3?1:0)
        for(let k=0;k<cnt;k++){
          let ex=r.x+Math.floor(Math.random()*r.w), ey=r.y+Math.floor(Math.random()*r.h)
          if(map[ey][ex]===0 && !(ex===player.x&&ey===player.y)){
            enemies.push({x:ex,y:ey,hp:2+Math.floor(levelL/2), alive:true, cd:0})
          }
        }
      }
      // boss in last room if level%2==0 or high
      if(levelL%2===0 || levelL>4){
        boss={x:exit!.x, y:exit!.y-1, hp: 12+levelL*6, alive:true, cd:0}
        // remove enemies near boss
        enemies=enemies.filter(en=> Math.hypot(en.x-boss!.x, en.y-boss!.y)>3)
      } else boss=null
      // keys/coins
      keysCollected=0; keysNeeded=2
      coins=[]
      hearts=[]
      for(let i=0;i<4+levelL;i++){
        let cx,cy,tries=0
        do{ const rr=rooms[1+Math.floor(Math.random()*(rooms.length-2))]; cx=rr.x+Math.floor(Math.random()*rr.w); cy=rr.y+Math.floor(Math.random()*rr.h); tries++ }while(map[cy][cx]!==0 && tries<40)
        if(Math.random()<0.7) coins.push({x:cx,y:cy,alive:true})
        else hearts.push({x:cx,y:cy,alive:true})
      }
      // keys near center of two middle rooms
      coins.push({x:rooms[1].x+1, y:rooms[1].y+1, alive:true} as any) // first key
      coins.push({x:rooms[2].x+2, y:rooms[2].y+1, alive:true} as any)
      // mark them as keys via extra array? we reuse coins but count as keys when picking: first 2 coins are keys
    }
    genMap()

    const reset=()=>{
      scoreL=0; levelL=1; player={x:1,y:1,hp:5,maxHp:5,inv:0,hasKey:false,keys:0}; genMap(); gameOver=false; paused=false; particles.clear(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const canMove=(x:number,y:number)=> x>=0&&x<COLS&&y>=0&&y<ROWS && map[y][x]===0

    // A* for enemies towards player
    const findPath=(sx:number,sy:number, tx:number,ty:number)=>{
      const open:{x:number,y:number,g:number,h:number,f:number,parent:any}[]=[{x:sx,y:sy,g:0,h:Math.abs(sx-tx)+Math.abs(sy-ty),f:Math.abs(sx-tx)+Math.abs(sy-ty),parent:null}]
      const closed=new Set<string>()
      const key=(x:number,y:number)=>`${x},${y}`
      let found=null
      let iter=0
      while(open.length && iter< 80){
        iter++
        open.sort((a,b)=>a.f-b.f)
        const cur=open.shift()!
        if(cur.x===tx && cur.y===ty){ found=cur; break }
        closed.add(key(cur.x,cur.y))
        for(const d of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
          const nx=cur.x+d.x, ny=cur.y+d.y
          if(!canMove(nx,ny)) continue
          if(closed.has(key(nx,ny))) continue
          const g=cur.g+1
          const h=Math.abs(nx-tx)+Math.abs(ny-ty)
          const existing=open.find(o=>o.x===nx&&o.y===ny)
          if(existing){
            if(g<existing.g){ existing.g=g; existing.f=g+h; existing.parent=cur }
          } else open.push({x:nx,y:ny,g,h,f:g+h,parent:cur})
        }
      }
      if(!found) return null
      const path=[]
      let cur:any=found
      while(cur){ path.push({x:cur.x,y:cur.y}); cur=cur.parent }
      path.reverse()
      return path
    }

    const attack=()=>{
      if(gameOver) return
      // hit enemies adjacent (including diagonals)
      for(const e of enemies){
        if(!e.alive) continue
        if(Math.abs(e.x-player.x)<=1 && Math.abs(e.y-player.y)<=1){
          e.hp--; playTone(520,0.07,'square',0.1)
          for(let i=0;i<4;i++) particles.push({x:e.x*TILE+TILE/2,y:e.y*TILE+TILE/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ffdd00',size:2})
          if(e.hp<=0){ e.alive=false; scoreL+=18+levelL*3; setScore(scoreL); for(let i=0;i<8;i++) particles.push({x:e.x*TILE+TILE/2,y:e.y*TILE+TILE/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff3366',size:2.4}); playTone(740,0.09,'square',0.12); if(scoreL>bestRef.current){ bestRef.current=scoreL; saveBest('neo_dungeon_best',scoreL); onScoreRef.current(scoreL)} }
          return
        }
      }
      if(boss && boss.alive && Math.abs(boss.x-player.x)<=1 && Math.abs(boss.y-player.y)<=1){
        boss.hp--; playTone(420,0.08,'sawtooth',0.12)
        for(let i=0;i<6;i++) particles.push({x:boss.x*TILE+TILE/2,y:boss.y*TILE+TILE/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ff00ff',size:2.6})
        if(boss.hp<=0){ boss.alive=false; scoreL+=120; setScore(scoreL); for(let i=0;i<16;i++) particles.push({x:boss.x*TILE+TILE/2,y:boss.y*TILE+TILE/2,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff00ff',size:3}); playTone(880,0.2,'square',0.15); // drop key
          keysCollected++ // boss gives key
        }
      }
    }

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ reset(); return }
      if(k==='p'){ if(!gameOver) paused=!paused; return }
      if(k===' '||k==='enter'){ attack(); return }
      if(k==='e'){ // interact / pick handled in loop
      }
      let dx=0,dy=0
      if(k==='w'||k==='arrowup') dy=-1
      if(k==='s'||k==='arrowdown') dy=1
      if(k==='a'||k==='arrowleft') dx=-1
      if(k==='d'||k==='arrowright') dx=1
      if(dx||dy){
        e.preventDefault()
        const nx=player.x+dx, ny=player.y+dy
        if(canMove(nx,ny)){
          // block if enemy alive there?
          const blocked= enemies.some(en=> en.alive && en.x===nx && en.y===ny) || (boss && boss.alive && boss.x===nx&&boss.y===ny)
          if(!blocked){ player.x=nx; player.y=ny }
          else {
            // bump attack
            attack()
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    const onPointer=(e:MouseEvent)=>{
      const r=c.getBoundingClientRect()
      const mx=Math.floor(((e.clientX-r.left)*(W/r.width))/TILE)
      const my=Math.floor(((e.clientY-r.top)*(H/r.height))/TILE)
      const path=findPath(player.x,player.y,mx,my)
      if(path && path.length>1){
        const nxt=path[1]
        if(canMove(nxt.x,nxt.y) && !enemies.some(en=>en.alive&&en.x===nxt.x&&en.y===nxt.y) && !(boss&&boss.alive&&boss.x===nxt.x&&boss.y===nxt.y)){
          player.x=nxt.x; player.y=nxt.y
        } else attack()
      }
    }
    c.addEventListener('mousedown', onPointer as any)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // map
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
        const px=x*TILE, py=y*TILE
        if(map[y][x]===1){
          ctx.fillStyle='#0e1020'; ctx.fillRect(px,py,TILE,TILE)
          ctx.strokeStyle='rgba(0,255,255,0.06)'; ctx.strokeRect(px,py,TILE,TILE)
          ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(px+2,py+2,TILE-4,3)
        } else {
          ctx.fillStyle='#1a1d2f'; ctx.fillRect(px,py,TILE,TILE)
          ctx.fillStyle='rgba(0,255,255,0.03)'; ctx.fillRect(px,py,TILE,TILE)
          // floor dots
          ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(px+6,py+6,2,2)
        }
      }
      // exit
      if(exit){
        ctx.fillStyle= keysCollected>=keysNeeded ? '#00ff88' : '#555'
        ctx.shadowColor= keysCollected>=keysNeeded ? '#00ff88':'transparent'; ctx.shadowBlur= keysCollected>=keysNeeded?12:0
        ctx.beginPath(); (ctx as any).roundRect(exit.x*TILE+2, exit.y*TILE+2, TILE-4,TILE-4,6); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'; ctx.fillText(keysCollected>=keysNeeded?'EXIT':'LOCK', exit.x*TILE+TILE/2, exit.y*TILE+TILE/2+3)
      }
      // coins / keys
      for(let i=0;i<coins.length;i++){
        const co=coins[i]
        if(!co.alive) continue
        const isKey= i<2 // first two are keys
        const col=isKey?'#ffdd00':'#ffaa00'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=8
        ctx.beginPath(); ctx.arc(co.x*TILE+TILE/2, co.y*TILE+TILE/2, isKey?7:5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 8px Orbitron'; ctx.textAlign='center'; ctx.fillText(isKey?'K':'$',co.x*TILE+TILE/2,co.y*TILE+TILE/2+3)
      }
      for(const h of hearts){
        if(!h.alive) continue
        ctx.fillStyle='#ff3366'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=8
        ctx.beginPath(); ctx.arc(h.x*TILE+TILE/2, h.y*TILE+TILE/2,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='900 8px Orbitron'; ctx.textAlign='center'; ctx.fillText('♥',h.x*TILE+TILE/2,h.y*TILE+TILE/2+3)
      }
      // enemies
      for(const e of enemies){
        if(!e.alive) continue
        ctx.fillStyle='#ff3366'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=8
        ctx.beginPath(); (ctx as any).roundRect(e.x*TILE+4,e.y*TILE+4,TILE-8,TILE-8,5); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(e.x*TILE+TILE/2-3,e.y*TILE+TILE/2-2,2,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(e.x*TILE+TILE/2+3,e.y*TILE+TILE/2-2,2,0,Math.PI*2); ctx.fill()
        // hp
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(e.x*TILE+4, e.y*TILE+2, TILE-8,3)
        ctx.fillStyle='#ffdd00'; ctx.fillRect(e.x*TILE+4, e.y*TILE+2, (TILE-8)*(e.hp/(2+Math.floor(levelL/2))),3)
      }
      if(boss && boss.alive){
        ctx.fillStyle='#ff00ff'; ctx.shadowColor='#ff00ff'; ctx.shadowBlur=12
        ctx.beginPath(); (ctx as any).roundRect(boss.x*TILE+1,boss.y*TILE+1,TILE-2,TILE-2,6); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='900 8px Orbitron'; ctx.textAlign='center'; ctx.fillText('BOSS',boss.x*TILE+TILE/2,boss.y*TILE+TILE/2+3)
        const pct=boss.hp/(12+levelL*6)
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(boss.x*TILE, boss.y*TILE-8, TILE,4)
        ctx.fillStyle='#ff3366'; ctx.fillRect(boss.x*TILE, boss.y*TILE-8, TILE*pct,4)
      }
      // player
      ctx.fillStyle= player.inv>0? (frame%8<4?'#00ffff':'#ffffff') : '#00ffff'
      ctx.shadowColor='#00ffff'; ctx.shadowBlur=12
      ctx.beginPath(); (ctx as any).roundRect(player.x*TILE+3,player.y*TILE+3,TILE-6,TILE-6,6); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#003333'; ctx.beginPath(); ctx.arc(player.x*TILE+TILE/2, player.y*TILE+TILE/2,3,0,Math.PI*2); ctx.fill()
      // facing
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(player.x*TILE+TILE/2-1, player.y*TILE+4,2,6)

      particles.draw(ctx)
      // fog of war subtle vignette
      const vg=ctx.createRadialGradient(player.x*TILE+TILE/2, player.y*TILE+TILE/2, 40, player.x*TILE+TILE/2, player.y*TILE+TILE/2, 280)
      vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.42)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)

      // HUD inventory
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,20)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL}`,8,14)
      ctx.fillStyle='#ffdd00'; ctx.textAlign='center'; ctx.font='700 11px JetBrains Mono'; ctx.fillText(`LLAVES ${keysCollected}/${keysNeeded} ${boss?'BOSS':''}`,W/2,14)
      ctx.fillStyle='#ff3366'; ctx.textAlign='right'; ctx.fillText('♥'.repeat(player.hp)+'♡'.repeat(player.maxHp-player.hp),W-8,14)
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`Inv ${player.keys} coins  Score ${scoreL}`,W/2, H-8)

      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.66)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡MUERTO!',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillText('R reiniciar',W/2,H/2+30)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      frame++
      if(isStartedRef.current===false){ draw(true); return }
      if(paused){ draw(true); return }
      if(gameOver){ draw(false); return }

      if(player.inv>0) player.inv--

      // pickups
      for(const co of coins){
        if(co.alive && co.x===player.x && co.y===player.y){
          co.alive=false
          const isKey=coins.indexOf(co)<2
          if(isKey){ keysCollected++; playTone(880,0.12,'sine',0.13); scoreL+=25; for(let i=0;i<7;i++) particles.push({x:co.x*TILE+TILE/2,y:co.y*TILE+TILE/2,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ffdd00',size:2.4}) }
          else { scoreL+=12; player.keys++; playTone(660,0.09,'square',0.11); for(let i=0;i<5;i++) particles.push({x:co.x*TILE+TILE/2,y:co.y*TILE+TILE/2,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ffaa00',size:2}) }
          setScore(scoreL); if(scoreL>bestRef.current) onScoreRef.current(scoreL)
        }
      }
      for(const h of hearts){
        if(h.alive && h.x===player.x && h.y===player.y){
          h.alive=false; player.hp=Math.min(player.maxHp, player.hp+1); playTone(740,0.12,'triangle',0.12); for(let i=0;i<6;i++) particles.push({x:h.x*TILE+TILE/2,y:h.y*TILE+TILE/2,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ff3366',size:2.2})
        }
      }

      // exit
      if(exit && player.x===exit.x && player.y===exit.y){
        if(keysCollected>=keysNeeded && (!boss||!boss.alive)){
          scoreL+= 80+levelL*18; levelL++; setLevel(levelL); setScore(scoreL)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_dungeon_best',scoreL); onScoreRef.current(scoreL) }
          playTone(880,0.18,'square',0.14)
          genMap()
        } else {
          // shake
          if(frame%12===0) playTone(180,0.08,'sawtooth',0.08)
        }
      }

      // enemies AI move every 14 frames
      if(frame%14===0){
        for(const e of enemies){
          if(!e.alive) continue
          if(e.cd>0){ e.cd--; continue }
          const path=findPath(e.x,e.y, player.x, player.y)
          if(path && path.length>1){
            const nxt=path[1]
            // avoid stacking
            const blocked= enemies.some(o=>o!==e&&o.alive&&o.x===nxt.x&&o.y===nxt.y) || (boss&&boss.alive&&boss.x===nxt.x&&boss.y===nxt.y)
            if(!blocked && canMove(nxt.x,nxt.y)){
              e.x=nxt.x; e.y=nxt.y
            }
          }
          // attack if adjacent
          if(Math.abs(e.x-player.x)<=1 && Math.abs(e.y-player.y)<=1 && player.inv===0){
            player.hp--; player.inv=42; e.cd=18; playTone(160,0.14,'sawtooth',0.13)
            for(let i=0;i<6;i++) particles.push({x:player.x*TILE+TILE/2,y:player.y*TILE+TILE/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ff3366',size:2.2})
            if(player.hp<=0){ gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_dungeon_best',scoreL); onScoreRef.current(scoreL)} }
          }
        }
        if(boss && boss.alive){
          if(boss.cd>0) boss.cd--
          else {
            const p=findPath(boss.x,boss.y, player.x,player.y)
            if(p && p.length>1){
              const nxt=p[1]
              if(!enemies.some(en=>en.alive&&en.x===nxt.x&&en.y===nxt.y) && canMove(nxt.x,nxt.y)){ boss.x=nxt.x; boss.y=nxt.y }
            }
            if(Math.abs(boss.x-player.x)<=1 && Math.abs(boss.y-player.y)<=1 && player.inv===0){
              player.hp-=2; player.inv=48; boss.cd=22; playTone(120,0.2,'sawtooth',0.15)
              if(player.hp<=0){ gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_dungeon_best',scoreL); onScoreRef.current(scoreL)} }
            }
          }
        }
      }

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

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3]" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">WASD/Flechas mueve • Espacio ataca • Click para mover • Salas procedurales • A* enemigos • Jefe</p>
    </div>
  )
}
