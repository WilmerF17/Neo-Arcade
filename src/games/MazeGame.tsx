import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

type Ghost = { x:number,y:number, tx:number, ty:number, path:{x:number,y:number}[], t:number }

export default function MazeGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [time,setTime]=useState(60)
  const [best,setBest]=useState(()=> loadBest(bestKey('maze'),0))
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const baseCols=11
    let COLS=baseCols, ROWS=baseCols
    let SZ=22
    // dynamic sizing based on level later, but we keep canvas fixed and scale cell size
    const W= 360, H=360
    const {ctx}=setupCanvas(canvas,W,H)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, levelL=1, timeL=60
    let maze:number[][]=[]
    let player={x:1,y:1}
    let goal={x:COLS-2,y:ROWS-2}
    let dots:{x:number,y:number}[]=[]
    let ghosts:Ghost[]=[]
    let keysHeld:Record<string,boolean>={}
    let moveCooldown=0
    let over=false

    const BK=bestKey('maze')

    const genMaze=(cols:number,rows:number)=>{
      COLS=cols; ROWS=rows
      SZ= Math.floor(Math.min(W/COLS, H/ROWS))
      maze=Array.from({length:ROWS},()=> Array(COLS).fill(1))
      const stack:[number,number][]=[[1,1]]
      maze[1][1]=0
      const dirs=[[0,2],[2,0],[0,-2],[-2,0]]
      while(stack.length){
        const [x,y]=stack[stack.length-1]
        const neigh=dirs.map(([dx,dy])=> [x+dx,y+dy, x+dx/2, y+dy/2]).filter(([nx,ny])=> nx>0&&nx<COLS-1&&ny>0&&ny<ROWS-1 && maze[ny as number][nx as number]===1)
        if(neigh.length){
          const [nx,ny,mx,my]=neigh[Math.floor(Math.random()*neigh.length)] as number[]
          maze[ny][nx]=0; maze[my][mx]=0; stack.push([nx,ny])
        } else stack.pop()
      }
      player={x:1,y:1}
      goal={x:COLS-2,y:ROWS-2}
      if(maze[goal.y][goal.x]===1){
        // carve
        maze[goal.y][goal.x]=0; maze[goal.y][goal.x-1]=0
      }
      dots=[]
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(maze[y][x]===0 && !(x===1&&y===1) && !(x===goal.x&&y===goal.y) && Math.random()>0.55) dots.push({x,y})
      ghosts=[
        {x: Math.floor(COLS/2), y: Math.floor(ROWS/2), tx:0, ty:0, path:[], t:0},
        {x: COLS-3, y: 3, tx:0, ty:0, path:[], t:0},
      ].slice(0, Math.min(2+Math.floor(levelL/2),4))
      // clear paths
      ghosts.forEach(g=>{ g.path=[]; g.t=0 })
    }
    genMaze(COLS,ROWS)

    // A* helper
    const findPath=(sx:number,sy:number, tx:number, ty:number)=>{
      const open:[number,number,number,number,string][]=[[sx,sy,0, Math.abs(tx-sx)+Math.abs(ty-sy), `${sx},${sy}`]]
      const came=new Map<string,string>()
      const gScore=new Map<string,number>(); gScore.set(`${sx},${sy}`,0)
      const visited=new Set<string>()
      while(open.length){
        open.sort((a,b)=> (a[2]+a[3])-(b[2]+b[3]))
        const [x,y]=open.shift()!
        const key=`${x},${y}`
        if(x===tx && y===ty){
          const path: {x:number,y:number}[]=[]
          let cur=key
          while(came.has(cur)){ const [cx,cy]=cur.split(',').map(Number); path.unshift({x:cx,y:cy}); cur=came.get(cur)! }
          return path
        }
        visited.add(key)
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=x+dx, ny=y+dy
          if(nx<0||nx>=COLS||ny<0||ny>=ROWS||maze[ny][nx]===1) continue
          const nk=`${nx},${ny}`
          if(visited.has(nk)) continue
          const ng=(gScore.get(key)||0)+1
          if(ng < (gScore.get(nk)??Infinity)){
            gScore.set(nk,ng); came.set(nk,key)
            const h=Math.abs(tx-nx)+Math.abs(ty-ny)
            if(!open.find(o=>o[0]===nx&&o[1]===ny)) open.push([nx,ny,ng,h,nk])
          }
        }
      }
      return []
    }

    const tryMove=(nx:number,ny:number)=>{
      if(nx<0||nx>=COLS||ny<0||ny>=ROWS||maze[ny][nx]===1) return
      player.x=nx; player.y=ny
      const idx=dots.findIndex(d=>d.x===nx&&d.y===ny)
      if(idx!==-1){ dots.splice(idx,1); scoreL+=10 + levelL*2; playTone(740,0.08,'sine',0.12); for(let k=0;k<4;k++) pool.push({x:nx*SZ+SZ/2,y:ny*SZ+SZ/2,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:1,c:'#ffdd00', size:2.5}) }
      if(nx===goal.x && ny===goal.y){
        scoreL+=100*levelL + Math.max(0,timeL*2); playTone(880,0.22,'square',0.16)
        for(let k=0;k<14;k++) pool.push({x:goal.x*SZ+SZ/2,y:goal.y*SZ+SZ/2,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#00ff88',size:3})
        if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL) }
        levelL++; timeL=Math.min(90, timeL+12)
        const nc= Math.min(21, baseCols + Math.floor(levelL*1.2))
        const nr=nc
        genMaze(nc,nr)
        setLevel(levelL)
      }
      // sync
      setScore(scoreL); setTime(timeL)
    }

    const onKeyD=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' ') { if(over){ genMaze(baseCols,ROWS); levelL=1; scoreL=0; timeL=60; over=false; setLevel(1); setScore(0); } return }
      keysHeld[k]=true
      if(['arrowup','w'].includes(k)) tryMove(player.x, player.y-1)
      if(['arrowdown','s'].includes(k)) tryMove(player.x, player.y+1)
      if(['arrowleft','a'].includes(k)) tryMove(player.x-1, player.y)
      if(['arrowright','d'].includes(k)) tryMove(player.x+1, player.y)
    }
    const onKeyU=(e:KeyboardEvent)=> keysHeld[e.key.toLowerCase()]=false
    window.addEventListener('keydown',onKeyD); window.addEventListener('keyup',onKeyU)

    // touch swipe using input.mouse
    let touchStart={x:0,y:0,down:false}
    const onTouchStart=(e:TouchEvent)=>{ touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY,down:true} }
    const onTouchEnd=(e:TouchEvent)=>{
      if(!touchStart.down) return
      const dx=e.changedTouches[0].clientX-touchStart.x
      const dy=e.changedTouches[0].clientY-touchStart.y
      if(Math.hypot(dx,dy)<18) return
      if(Math.abs(dx)>Math.abs(dy)) tryMove(player.x + (dx>0?1:-1), player.y)
      else tryMove(player.x, player.y + (dy>0?1:-1))
      touchStart.down=false
    }
    canvas.addEventListener('touchstart',onTouchStart as any,{passive:true} as any)
    canvas.addEventListener('touchend',onTouchEnd as any)

    // also allow continuous hold
    const timer=setInterval(()=>{
      if(isStartedRef.current===false||over) return
      timeL-=1; if(timeL<=0){ timeL=0; over=true; if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; setBest(scoreL); onScoreRef.current(scoreL)} } setTime(timeL)
    },1000)

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){
        // still draw but not update logic
      } else if(!over){
        frame++
        // ghost A* chase every 18 frames
        if(frame%18===0){
          ghosts.forEach(g=>{
            if(Math.random()<0.72){
              const p=findPath(g.x,g.y, player.x, player.y)
              if(p.length){ g.path=p; g.t=0 }
            } else {
              // random wander to keep pressure
              const opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:g.x+dx,y:g.y+dy})).filter(o=> o.x>=0&&o.x<COLS&&o.y>=0&&o.y<ROWS&&maze[o.y][o.x]===0)
              if(opts.length){ const ch=opts[Math.floor(Math.random()*opts.length)]; g.path=[ch] }
            }
          })
        }
        if(frame% Math.max(6, 14 - levelL)===0){
          ghosts.forEach(g=>{
            if(g.path.length){
              const nxt=g.path.shift()!
              g.x=nxt.x; g.y=nxt.y
              if(g.x===player.x && g.y===player.y){
                scoreL=Math.max(0,scoreL-30 - levelL*5); playTone(180,0.22,'sawtooth',0.16); for(let k=0;k<10;k++) pool.push({x:g.x*SZ+SZ/2,y:g.y*SZ+SZ/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ff3355',size:2.8})
                player={x:1,y:1}
                setScore(scoreL)
              }
            }
          })
        }
        // continuous input via keysHeld with cooldown
        if(moveCooldown>0) moveCooldown--
        else {
          if(keysHeld['arrowup']||keysHeld['w']){ tryMove(player.x,player.y-1); moveCooldown=7 }
          else if(keysHeld['arrowdown']||keysHeld['s']){ tryMove(player.x,player.y+1); moveCooldown=7 }
          else if(keysHeld['arrowleft']||keysHeld['a']){ tryMove(player.x-1,player.y); moveCooldown=7 }
          else if(keysHeld['arrowright']||keysHeld['d']){ tryMove(player.x+1,player.y); moveCooldown=7 }
        }
        // mouse click to move towards click (grid)
        if(input.mouse.down && frame%8===0){
          const mx=Math.floor(input.mouse.x / (W/COLS))
          const my=Math.floor(input.mouse.y / (H/ROWS))
          // simple step towards
          const dx=Math.sign(mx-player.x), dy=Math.sign(my-player.y)
          if(Math.abs(mx-player.x)>Math.abs(my-player.y)) tryMove(player.x+dx, player.y)
          else if(my!==player.y) tryMove(player.x, player.y+dy)
        }
      }
      pool.update()
      // draw
      const ox=(W - COLS*SZ)/2, oy=(H - ROWS*SZ)/2
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.04)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke()}
      // maze
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
        const px=ox+x*SZ, py=oy+y*SZ
        if(maze[y][x]===1){
          ctx.fillStyle='#0f1a2e'; ctx.fillRect(px,py,SZ,SZ)
          ctx.fillStyle='rgba(0,255,255,0.08)'; ctx.fillRect(px,py,SZ,1); ctx.fillRect(px,py,1,SZ)
        } else {
          ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fillRect(px,py,SZ,SZ)
        }
      }
      // dots
      dots.forEach(d=>{
        ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(ox+d.x*SZ+SZ/2, oy+d.y*SZ+SZ/2, Math.max(2,SZ*0.16),0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      })
      // goal
      ctx.fillStyle='#00ff88'; ctx.shadowColor='#00ff88'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(ox+goal.x*SZ+SZ/2, oy+goal.y*SZ+SZ/2, SZ*0.34,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#003311'; ctx.font=`${Math.max(7,SZ*0.4)}px Orbitron`; ctx.textAlign='center'; ctx.fillText('EXIT',ox+goal.x*SZ+SZ/2, oy+goal.y*SZ+SZ/2+3)
      // ghosts A* path hint
      ghosts.forEach(g=>{
        // draw path faint
        if(g.path.length>1){
          ctx.strokeStyle='rgba(255,51,85,0.18)'; ctx.lineWidth=1; ctx.beginPath()
          ctx.moveTo(ox+g.x*SZ+SZ/2, oy+g.y*SZ+SZ/2)
          g.path.slice(0,4).forEach(p=> ctx.lineTo(ox+p.x*SZ+SZ/2, oy+p.y*SZ+SZ/2)); ctx.stroke()
        }
        ctx.fillStyle='#ff3355'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(ox+g.x*SZ+SZ/2, oy+g.y*SZ+SZ/2, SZ*0.32,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ox+g.x*SZ+SZ/2- SZ*0.1, oy+g.y*SZ+SZ/2- SZ*0.05, SZ*0.1,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ox+g.x*SZ+SZ/2+ SZ*0.1, oy+g.y*SZ+SZ/2- SZ*0.05, SZ*0.1,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(ox+g.x*SZ+SZ/2- SZ*0.1, oy+g.y*SZ+SZ/2- SZ*0.05, SZ*0.05,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ox+g.x*SZ+SZ/2+ SZ*0.1, oy+g.y*SZ+SZ/2- SZ*0.05, SZ*0.05,0,Math.PI*2); ctx.fill()
      })
      // player
      ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(ox+player.x*SZ+SZ/2, oy+player.y*SZ+SZ/2, SZ*0.32,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle='#003333'; ctx.beginPath(); ctx.arc(ox+player.x*SZ+SZ/2, oy+player.y*SZ+SZ/2, SZ*0.1,0,Math.PI*2); ctx.fill()
      pool.draw(ctx)
      // vignette
      const g2=ctx.createRadialGradient(W/2,H/2, 120, W/2,H/2, 280); g2.addColorStop(0,'transparent'); g2.addColorStop(1,'rgba(0,0,0,0.35)'); ctx.fillStyle=g2; ctx.fillRect(0,0,W,H)
      if(over){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 20px Orbitron'; ctx.textAlign='center'; ctx.fillText('¡ATRAPADO!',W/2,H/2-10)
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${scoreL} • Nivel ${levelL}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('Espacio para reiniciar',W/2,H/2+30)
      } else if(isStartedRef.current===false){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); clearInterval(timer); window.removeEventListener('keydown',onKeyD); window.removeEventListener('keyup',onKeyU); canvas.removeEventListener('touchstart',onTouchStart as any); canvas.removeEventListener('touchend',onTouchEnd as any); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="rounded-xl neon-border max-w-full" style={{width:360,height:360}}/>
      <div className="flex gap-2 w-full max-w-[360px]">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Lv {level} • {time}s</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">Flechas/WASD • Click hacia objetivo • Fantasmas A* • DFS procedural • Niveles crecen</p>
    </div>
  )
}
