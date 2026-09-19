import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function StackGame({ onScore, isStarted }: { onScore: (s: number) => void, isStarted?: boolean }){
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [best, setBest] = useState(()=> loadBest(bestKey('stack'),0))
  const [over, setOver] = useState(false)
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current!; const {ctx,W,H}=setupCanvas(canvas,360,440)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0
    let stack: {x:number,y:number,w:number,color:string}[] = [{x: W/2-60, y: H-30, w:120, color:'#00ffff'}]
    let current: {x:number,w:number,dir:number, y:number, color:string} = { x:0, w:120, dir:2.15, y: H-60, color:'#ff00ff'}
    let cameraY=0, targetCam=0
    let scoreL=0, levelL=1, comboL=0
    let gameOver=false
    const BK=bestKey('stack')
    const colors = ['#00ffff','#ff00ff','#ffdd00','#00ff88','#ff6b35','#8a2be2','#ff3366','#00aaff']

    const place=()=>{
      if(gameOver){
        stack=[{x:W/2-60,y:H-30,w:120,color:'#00ffff'}]
        current={x:0,w:120,dir:2.15+levelL*0.08,y:H-60,color:'#ff00ff'}
        scoreL=0; levelL=1; comboL=0; cameraY=0; targetCam=0; gameOver=false; setOver(false); setScore(0); setLevel(1); setCombo(0); pool.clear(); return
      }
      const top = stack[stack.length-1]
      const overlapLeft = Math.max(top.x, current.x)
      const overlapRight = Math.min(top.x+top.w, current.x+current.w)
      const overlap = overlapRight - overlapLeft
      if(overlap<=2){
        gameOver=true; setOver(true)
        const sc=scoreL
        if(sc>bestRef.current){ try{ saveBest(BK,sc)}catch{}; bestRef.current=sc; setBest(sc); onScoreRef.current(sc)}
        for(let i=0;i<16;i++) pool.push({x: current.x+current.w/2, y: current.y+14, vx:(Math.random()-0.5)*7, vy:(Math.random()-0.5)*6-2, life:1, c: current.color, size:3})
        playTone(140,0.34,'sawtooth',0.16)
        comboL=0; setCombo(0)
        return
      }
      const perfect = Math.abs((current.x+current.w/2) - (top.x+top.w/2)) < 4.5
      let newW = overlap
      let newX = overlapLeft
      if(perfect){
        newW = top.w; newX = top.x
        comboL++; playTone(880,0.14,'square',0.14)
        for(let i=0;i<12;i++) pool.push({x:newX+newW/2,y:current.y+14,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*3-1,life:1,c:'#ffffff',size:2.8})
      } else {
        comboL=0
        const cutW = current.w - overlap
        if(cutW>0){
          const fx = current.x < top.x ? current.x : overlapRight
          for(let i=0;i<9;i++) pool.push({x:fx+cutW/2,y:current.y+14,vx:(Math.random()-0.5)*4,vy: Math.random()*2+1,life:1,c:current.color,size:2.6})
        }
        playTone(520,0.08,'sine',0.11)
      }
      const newColor = colors[stack.length % colors.length]
      stack.push({x:newX, y: current.y, w:newW, color: newColor})
      scoreL = stack.length-1; setScore(scoreL); setCombo(comboL)
      onScoreRef.current(scoreL*10 + comboL*5)
      if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL) }
      if(comboL>=3){ scoreL+= comboL; setScore(scoreL) }
      if(scoreL>0 && scoreL%6===0){ levelL++; setLevel(levelL) }
      if(stack.length>7) targetCam += 30
      const nextW=newW
      const dirSpeed= 2.15 + levelL*0.16 + scoreL*0.016
      const startLeft=Math.random()>0.5
      current = { x: startLeft? 0 : W-nextW, w:nextW, dir: startLeft? dirSpeed : -dirSpeed, y: current.y-30, color: colors[(stack.length+1)%colors.length] }
    }

    const onKey=(e:KeyboardEvent)=>{ if(e.code==='Space'){ e.preventDefault(); place() } }
    window.addEventListener('keydown',onKey)
    let wasDown=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const paused=isStartedRef.current===false
      if(!paused){
        if(!gameOver){
          if(input.keys[' '] && !wasDown) place()
          if(input.mouse.down && !wasDown) place()
          wasDown= !!(input.keys[' ']||input.mouse.down)
          current.x += current.dir
          if(current.x<0){ current.x=0; current.dir*=-1; playTone(320,0.04,'square',0.06) }
          if(current.x+current.w>W){ current.x=W-current.w; current.dir*=-1; playTone(320,0.04,'square',0.06) }
        } else {
          if((input.keys[' ']||input.mouse.down) && !wasDown) place()
          wasDown= !!(input.keys[' ']||input.mouse.down)
        }
        cameraY += (targetCam - cameraY)*0.08
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
      for(let y=-40+ (cameraY%40); y<H; y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      // base glow
      ctx.fillStyle='rgba(0,255,255,0.07)'; ctx.fillRect(0,H-30, W, 30)
      ctx.save()
      ctx.translate(0, cameraY*0.62)
      // stack
      stack.forEach((b,i)=>{
        const y=b.y
        ctx.fillStyle=b.color; ctx.shadowColor=b.color; ctx.shadowBlur= i===stack.length-1?14:8
        ctx.fillRect(b.x, y, b.w, 28); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.32)'; ctx.fillRect(b.x,y, b.w,3)
        ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(b.x,y+26, b.w,2)
        if(i>0){
          ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'
          ctx.fillText(String(i), b.x+b.w/2, y+18)
        }
        // perfect shine
        if(i>1 && Math.abs(b.x - stack[i-1].x)<0.1){ ctx.strokeStyle='#ffffff'; ctx.globalAlpha=0.55; ctx.strokeRect(b.x+0.5,y+0.5,b.w-1,27); ctx.globalAlpha=1 }
      })
      if(!gameOver){
        const pulse = Math.sin(Date.now()*0.012)*0.14+0.86
        ctx.globalAlpha=pulse
        ctx.fillStyle=current.color; ctx.shadowColor=current.color; ctx.shadowBlur=16
        ctx.fillRect(current.x, current.y, current.w, 28); ctx.shadowBlur=0; ctx.globalAlpha=1
        ctx.fillStyle='rgba(255,255,255,0.42)'; ctx.fillRect(current.x, current.y, current.w, 3)
        ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(current.x+6, current.y+28, Math.max(0,current.w-12), 4)
        // guide
        const top=stack[stack.length-1]
        ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.setLineDash([4,6]); ctx.beginPath(); ctx.moveTo(top.x+top.w/2, current.y+28); ctx.lineTo(top.x+top.w/2, current.y-10); ctx.stroke(); ctx.setLineDash([])
      }
      pool.draw(ctx)
      ctx.restore()
      // HUD floating
      if(!gameOver && !paused){
        ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(W/2-42, 8,84,18)
        ctx.fillStyle='#00ffff'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.fillText(`${scoreL} PISOS`,W/2,20)
        if(comboL>1){ ctx.fillStyle='#ffdd00'; ctx.font='700 10px JetBrains Mono'; ctx.fillText(`${comboL}x PERFECT`,W/2,34) }
      }
      if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.58)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=10; ctx.fillText('TORRE CAÍDA', W/2, H/2-12); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='12px JetBrains Mono'; ctx.fillText(`Pisos ${scoreL} • Lv ${levelL} • ${comboL}x perfect`, W/2, H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='11px JetBrains Mono'; ctx.fillText('Click / Espacio para reiniciar', W/2, H/2+32)
      } else if(paused){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else {
        ctx.setLineDash([4,6]); ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke(); ctx.setLineDash([])
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[6/7]" width={360} height={440}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-amber-300 font-mono">PISOS</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono" style={{color: combo>2?'#ffdd00':'#fff'}}>x{combo} Lv{level}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      {over && <p className="text-xs font-mono text-red-300 animate-pulse">¡Perdiste! Presiona click/espacio</p>}
      <p className="text-[11px] text-white/50 font-mono text-center">Timing milimétrico • Corte perfecto = bloque completo • Cámara ascendente • Velocidad por nivel</p>
    </div>
  )
}
