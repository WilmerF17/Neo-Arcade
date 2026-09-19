import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

const SHAPES=[
  {m:[[1,1,1,1]],c:'#00ffff',id:0},
  {m:[[1,1],[1,1]],c:'#ffdd00',id:1},
  {m:[[0,1,0],[1,1,1]],c:'#ff00ff',id:2},
  {m:[[1,0,0],[1,1,1]],c:'#00aaff',id:3},
  {m:[[0,0,1],[1,1,1]],c:'#ff6b35',id:4},
  {m:[[1,1,0],[0,1,1]],c:'#00ff88',id:5},
  {m:[[0,1,1],[1,1,0]],c:'#ff3366',id:6},
]
function rotate(m:number[][]){
  const h=m.length,w=m[0].length
  const r=Array.from({length:w},()=>Array(h).fill(0))
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) r[x][h-1-y]=m[y][x]
  return r
}

export default function TetrisGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [lines,setLines]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_tetris_best'))
  const [hold,setHold]=useState<number|null>(null)
  const [nextQ,setNextQ]=useState<number[]>([])
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const COLS=10, ROWS=20, SZ=18
    const W=COLS*SZ, H=ROWS*SZ
    const {ctx}=setupCanvas(c,W,H)
    const particles=createParticlePool(64)
    const input=createInput(c,W,H)
    let raf=0
    let board:number[][]=Array.from({length:ROWS},()=>Array(COLS).fill(-1))
    let bag:number[]=[]
    const newBag=()=>{ bag=[0,1,2,3,4,5,6].sort(()=>Math.random()-0.5) }
    newBag()
    const popBag=()=>{ if(bag.length===0) newBag(); return bag.pop()! }
    let cur:{shape:number,m:number[][],x:number,y:number,c:string, id:number}={shape:0,m:SHAPES[0].m,x:3,y:0,c:SHAPES[0].c,id:0}
    let nextShapes:number[]=[popBag(),popBag(),popBag()]
    let holdShape:number|null=null, canHold=true
    let ghostY=0
    let scoreL=0, linesL=0, levelL=1, combo=-1, backToBack=false
    let dropTimer=0, dropInterval=36, lockDelay=0
    let gameOver=false, paused=false
    let frame=0
    let dasLeft=0, dasRight=0, dasTimer=0, arrTimer=0
    let lastRotateWasTSpin=false

    const updateNext=()=>{ setNextQ([...nextShapes]); setHold(holdShape) }

    const spawn=()=>{
      const s=nextShapes.shift()!; nextShapes.push(popBag())
      cur={shape:s,m:SHAPES[s].m, x: Math.floor(COLS/2)-Math.floor(SHAPES[s].m[0].length/2), y:0, c:SHAPES[s].c, id:s}
      canHold=true
      updateNext()
      // spawn collision -> game over
      if(collide(cur.m,cur.x,cur.y)){ gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_tetris_best',scoreL); onScoreRef.current(scoreL)} playTone(120,0.4,'sawtooth',0.16) }
      lastRotateWasTSpin=false
    }
    const collide=(m:number[][],x:number,y:number)=>{
      for(let r=0;r<m.length;r++) for(let cc=0;cc<m[0].length;cc++) if(m[r][cc]){
        const nx=x+cc, ny=y+r
        if(nx<0||nx>=COLS||ny>=ROWS) return true
        if(ny>=0 && board[ny][nx]!==-1) return true
      }
      return false
    }
    const merge=()=>{
      for(let r=0;r<cur.m.length;r++) for(let cc=0;cc<cur.m[0].length;cc++) if(cur.m[r][cc]){
        const ny=cur.y+r, nx=cur.x+cc
        if(ny>=0) board[ny][nx]=cur.shape
      }
    }
    const detectTSpin=()=>{
      // T piece and 3 corners occupied after lock, and last action was rotate
      if(cur.shape!==2) return false
      if(!lastRotateWasTSpin) return false
      let corners=0
      const cx=cur.x+1, cy=cur.y+1 // center of T (approx)
      const checks=[[-1,-1],[1,-1],[-1,1],[1,1]]
      for(const [dx,dy] of checks){
        const x=cx+dx, y=cy+dy
        if(x<0||x>=COLS||y<0||y>=ROWS || (y>=0 && board[y][x]!==-1)) corners++
      }
      return corners>=3
    }
    const clear=()=>{
      let cleared=[]
      for(let r=ROWS-1;r>=0;r--){
        if(board[r].every(v=>v!==-1)) cleared.push(r)
      }
      if(cleared.length){
        // animate quickly: flash
        const isTSpin=detectTSpin()
        const isTetris=cleared.length===4
        const b2bBonus = (isTetris||isTSpin) && backToBack ? 1.5 : 1
        backToBack = (isTetris||isTSpin) ? true : cleared.length>0 ? false : backToBack
        combo++
        let pts=0
        if(isTSpin){
          const map:any={1:800,2:1200,3:1600}
          pts= (map[cleared.length]||400) * levelL
          if(cleared.length===1) pts=400*levelL
        } else {
          pts=[0,100,300,500,800][cleared.length]*levelL
        }
        pts=Math.floor(pts*b2bBonus)
        if(combo>0) pts+= 50*combo*levelL
        scoreL+=pts; linesL+=cleared.length; scoreL+=0 // ensure
        setScore(scoreL); setLines(linesL); setHold(holdShape); // trick
        // remove lines with animation
        for(const r of cleared) {
          for(let x=0;x<COLS;x++) particles.push({x:x*SZ+SZ/2,y:r*SZ+SZ/2,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5-1,life:1,c:SHAPES[board[r][x]]?.c||'#fff',size:2.4})
          board.splice(r,1); board.unshift(Array(COLS).fill(-1))
        }
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_tetris_best',scoreL); onScoreRef.current(scoreL) }
        levelL=Math.min(15, Math.floor(linesL/10)+1); setLevel(levelL)
        dropInterval=Math.max(5, 36 - (levelL-1)*2)
        if(isTSpin) playTone(960,0.18,'triangle',0.15)
        else if(cleared.length===4) playTone(880,0.2,'square',0.16)
        else playTone(620+cleared.length*40,0.12,'square',0.12)
      } else {
        combo=-1
        backToBack=false
      }
    }
    const hardDrop=()=>{
      let gy=cur.y
      while(!collide(cur.m,cur.x,gy+1)) gy++
      const dist=gy-cur.y
      cur.y=gy; merge(); clear(); spawn()
      scoreL+= dist*2; setScore(scoreL)
      if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_tetris_best',scoreL); onScoreRef.current(scoreL)}
      playTone(740,0.07,'square',0.11)
    }
    const doHold=()=>{
      if(!canHold) return
      if(holdShape===null){ holdShape=cur.shape; spawn(); }
      else { const tmp=holdShape; holdShape=cur.shape; cur={shape:tmp,m:SHAPES[tmp].m,x: Math.floor(COLS/2)-Math.floor(SHAPES[tmp].m[0].length/2), y:0,c:SHAPES[tmp].c,id:tmp} }
      canHold=false
      setHold(holdShape); playTone(520,0.08,'sine',0.11)
    }
    spawn(); updateNext()

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='r'){ board=Array.from({length:ROWS},()=>Array(COLS).fill(-1)); scoreL=0; linesL=0; levelL=1; combo=-1; backToBack=false; holdShape=null; canHold=true; newBag(); nextShapes=[popBag(),popBag(),popBag()]; dropInterval=36; gameOver=false; paused=false; setScore(0); setLines(0); setLevel(1); spawn(); updateNext(); return }
      if(k==='p'){ if(!gameOver) paused=!paused; return }
      if(gameOver) return
      if(k==='arrowleft'){ if(!collide(cur.m,cur.x-1,cur.y)){ cur.x--; dasLeft=1 } else dasLeft=0 }
      if(k==='arrowright'){ if(!collide(cur.m,cur.x+1,cur.y)){ cur.x++; dasRight=1 } else dasRight=0 }
      if(k==='arrowdown'){ if(!collide(cur.m,cur.x,cur.y+1)) {cur.y++; scoreL+=1; setScore(scoreL)} }
      if(k==='arrowup' || k==='x'){ const rm=rotate(cur.m); if(!collide(rm,cur.x,cur.y)){ cur.m=rm; lastRotateWasTSpin=true } else if(!collide(rm,cur.x-1,cur.y)){ cur.x--; cur.m=rm; lastRotateWasTSpin=true } else if(!collide(rm,cur.x+1,cur.y)){ cur.x++; cur.m=rm; lastRotateWasTSpin=true } playTone(480,0.06,'sine',0.08) }
      if(k==='z'){ // ccw
        let rm=rotate(rotate(rotate(cur.m))); if(!collide(rm,cur.x,cur.y)){ cur.m=rm; lastRotateWasTSpin=true; playTone(480,0.06,'sine',0.08) }
      }
      if(k===' '){ hardDrop() }
      if(k==='c' || k==='shift'){ doHold() }
    }
    const onKeyUp=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k==='arrowleft') dasLeft=0
      if(k==='arrowright') dasRight=0
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    const reset=()=>{
      board=Array.from({length:ROWS},()=>Array(COLS).fill(-1)); scoreL=0; linesL=0; levelL=1; combo=-1; backToBack=false; holdShape=null; canHold=true; newBag(); nextShapes=[popBag(),popBag(),popBag()]; dropInterval=36; gameOver=false; paused=false; setScore(0); setLines(0); setLevel(1); spawn(); updateNext()
    }
    resetRef.current=reset
    // touch
    let touchX=0, touchY=0, touchTime=0
    const onTouchStart=(e:TouchEvent)=>{ touchX=e.touches[0].clientX; touchY=e.touches[0].clientY; touchTime=Date.now() }
    const onTouchEnd=(e:TouchEvent)=>{
      const dx=e.changedTouches[0].clientX-touchX, dy=e.changedTouches[0].clientY-touchY
      const dt=Date.now()-touchTime
      if(Math.abs(dx)<14 && Math.abs(dy)<14 && dt<220){ const rm=rotate(cur.m); if(!collide(rm,cur.x,cur.y)) cur.m=rm; return }
      if(Math.abs(dx)>Math.abs(dy)){
        if(dx>18 && !collide(cur.m,cur.x+1,cur.y)) cur.x++
        else if(dx<-18 && !collide(cur.m,cur.x-1,cur.y)) cur.x--
      } else {
        if(dy>20) hardDrop()
        else if(dy<-18){ const rm=rotate(cur.m); if(!collide(rm,cur.x,cur.y)) cur.m=rm }
      }
    }
    c.addEventListener('touchstart', onTouchStart as any, {passive:true} as any)
    c.addEventListener('touchend', onTouchEnd as any)
    c.addEventListener('mousedown', ()=>{
      // click hold
    })
    // hold button via external? we handle C

    const draw=()=>{
      ctx.fillStyle='#06081a'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
      for(let i=0;i<=COLS;i++){ ctx.beginPath(); ctx.moveTo(i*SZ,0); ctx.lineTo(i*SZ,H); ctx.stroke() }
      for(let i=0;i<=ROWS;i++){ ctx.beginPath(); ctx.moveTo(0,i*SZ); ctx.lineTo(W,i*SZ); ctx.stroke() }
      // board
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(board[y][x]!==-1){
        const col=SHAPES[board[y][x]].c
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=6
        ctx.fillRect(x*SZ+1,y*SZ+1,SZ-2,SZ-2); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(x*SZ+1,y*SZ+1,SZ-2,3)
      }
      // ghost
      let gy=cur.y; while(!collide(cur.m,cur.x,gy+1)) gy++
      ghostY=gy
      ctx.globalAlpha=0.22
      for(let r=0;r<cur.m.length;r++) for(let cc=0;cc<cur.m[0].length;cc++) if(cur.m[r][cc]){
        ctx.fillStyle=cur.c; ctx.fillRect((cur.x+cc)*SZ+1,(gy+r)*SZ+1,SZ-2,SZ-2)
        ctx.strokeStyle=cur.c; ctx.lineWidth=1; ctx.strokeRect((cur.x+cc)*SZ+1,(gy+r)*SZ+1,SZ-2,SZ-2)
      }
      ctx.globalAlpha=1
      // current
      for(let r=0;r<cur.m.length;r++) for(let cc=0;cc<cur.m[0].length;cc++) if(cur.m[r][cc]){
        const x=cur.x+cc, y=cur.y+r
        if(y>=0){
          ctx.fillStyle=cur.c; ctx.shadowColor=cur.c; ctx.shadowBlur=10
          ctx.fillRect(x*SZ+1,y*SZ+1,SZ-2,SZ-2); ctx.shadowBlur=0
          ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(x*SZ+1,y*SZ+1,SZ-2,3)
          // T-spin hint
          if(cur.shape===2 && lastRotateWasTSpin){
            ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(x*SZ+1,y*SZ+1,SZ-2,SZ-2)
          }
        }
      }
      // particles
      particles.draw(ctx)
      if(combo>0){
        ctx.fillStyle= combo>3?'#ff00ff':'#ffdd00'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'
        ctx.shadowColor=ctx.fillStyle as string; ctx.shadowBlur=8; ctx.fillText(`COMBO x${combo}`,W/2,18); ctx.shadowBlur=0
      }
      if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.58)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 16px Orbitron'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-6)
        ctx.fillStyle='#fff'; ctx.font='10px JetBrains Mono'; ctx.fillText('R para reiniciar',W/2,H/2+12)
      }
    }

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(); return }
      if(paused){ draw(); return }
      if(!gameOver){
        frame++
        // DAS handling: if holding left/right
        const keys=(input as any).keys as Record<string,boolean>
        // we already handle DAS via dasLeft/Right flags + timers
        if(keys['arrowleft']){
          dasTimer++
          if(dasTimer>12){
            arrTimer++
            if(arrTimer>2){ if(!collide(cur.m,cur.x-1,cur.y)) cur.x-- }
          }
        } else if(keys['arrowright']){
          dasTimer++
          if(dasTimer>12){
            arrTimer++
            if(arrTimer>2){ if(!collide(cur.m,cur.x+1,cur.y)) cur.x++ }
          }
        } else { dasTimer=0; arrTimer=0 }
        dropTimer++
        if(dropTimer>=dropInterval){
          dropTimer=0
          if(!collide(cur.m,cur.x,cur.y+1)) cur.y++
          else {
            lockDelay++
            if(lockDelay>8){
              merge(); clear(); spawn(); lockDelay=0
            }
          }
        } else {
          if(collide(cur.m,cur.x,cur.y+1)) lockDelay++
          else lockDelay=0
        }
      }
      particles.update()
      draw()
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      c.removeEventListener('touchstart', onTouchStart as any)
      c.removeEventListener('touchend', onTouchEnd as any)
      input.cleanup()
    }
  },[])

  return (
    <div className="flex gap-3 justify-center w-full">
      <canvas ref={canvasRef} className="rounded-xl neon-border max-w-full" style={{width:180,height:360}}/>
      <div className="flex flex-col gap-2 w-[160px]">
        <div className="glass rounded-xl p-3">
          <p className="text-[11px] font-mono tracking-widest text-white/50">HOLD [C]</p>
          <div className="mt-2 min-h-[28px] grid grid-cols-4 gap-1">
            {hold!==null ? SHAPES[hold].m.flatMap((row,y)=> row.map((v,x)=> <div key={`${y}-${x}`} className="w-5 h-5 rounded-sm" style={{background: v? SHAPES[hold!].c:'transparent', boxShadow: v? `0 0 6px ${SHAPES[hold!].c}`:'none'}}/>)) : <span className="text-[11px] font-mono text-white/30">—</span>}
          </div>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-[11px] font-mono tracking-widest text-white/50">SIGUIENTE ×3</p>
          <div className="mt-2 space-y-2">
            {nextQ.map((n,i)=>(
              <div key={i} className="grid grid-cols-4 gap-1 opacity-80">
                {SHAPES[n].m.flatMap((row,y)=> row.map((v,x)=> <div key={`${y}-${x}`} className="w-4 h-4 rounded-sm" style={{background: v? SHAPES[n].c:'transparent', boxShadow: v? `0 0 5px ${SHAPES[n].c}`:'none'}}/>))}
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs font-mono"><span className="text-white/50">SCORE</span><span className="text-white font-black" style={{fontFamily:'Orbitron'}}>{score}</span></div>
          <div className="flex justify-between text-xs font-mono"><span className="text-white/50">LINEAS</span><span className="text-cyan-300">{lines}</span></div>
          <div className="flex justify-between text-xs font-mono"><span className="text-white/50">NIVEL</span><span className="text-fuchsia-300">{level}</span></div>
          <div className="text-[11px] font-mono text-white/40">Best {best}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={()=>resetRef.current()} className="flex-1 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs">R</button>
            <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'c'}))} className="flex-1 py-1.5 rounded-lg glass text-white font-bold text-xs">HOLD [C]</button>
          </div>
        </div>
        <p className="text-[10px] font-mono text-white/40 text-center">Flechas + Space hard drop + Z/X rotar • DAS • T-Spin • Ghost • Niveles 1-15</p>
      </div>
    </div>
  )
}
