import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

export default function SurvivalGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=> loadBest(bestKey('survival'),0))
  const [hp,setHp]=useState(100)
  const [wave,setWave]=useState(1)
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const canvas=canvasRef.current!; const {ctx,W,H}=setupCanvas(canvas,480,360)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(64)
    let raf=0, frame=0
    let scoreL=0, levelL=1, hpL=100, waveL=1, over=false, paused=false
    let player={x:W/2,y:H/2,r:10, dash:0, dashCd:0}
    let enemies:{x:number,y:number,r:number,hp:number,sp:number}[]=[]
    let bullets:{x:number,y:number,vx:number,vy:number,life:number}[]=[]
    let power:{x:number,y:number,kind:'heal'|'burst'|'spread',t:number}[]=[]
    const BK=bestKey('survival')
    let shootCd=0
    let weapon:'single'|'spread'='single', spreadTimer=0
    let combo=0, comboTimer=0

    const spawnWave=()=>{
      const count= 6 + waveL*2 // spec 6+wave*2
      for(let i=0;i<count;i++){
        const side=Math.floor(Math.random()*4)
        let x=0,y=0
        if(side===0){ x=Math.random()*W; y=-14 }
        if(side===1){ x=W+14; y=Math.random()*H }
        if(side===2){ x=Math.random()*W; y=H+14 }
        if(side===3){ x=-14; y=Math.random()*H }
        enemies.push({x,y,r:7+Math.random()*8, hp:1+Math.floor(levelL/2.5), sp: 0.92 + Math.random()*0.62 + levelL*0.09})
      }
    }
    spawnWave()

    const shoot=()=>{
      if(over||paused) return
      if(shootCd>0) return
      const mx=input.mouse.x, my=input.mouse.y
      const ang=Math.atan2(my-player.y, mx-player.x)
      if(weapon==='spread'){
        const spread=0.22
        for(let d=-1;d<=1;d++){
          const a=ang+d*spread
          const sp=7.4
          bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:42})
        }
        playTone(680,0.07,'square',0.11)
      } else {
        const sp=7.6
        bullets.push({x:player.x,y:player.y,vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, life:42})
        playTone(640,0.07,'square',0.11)
      }
      shootCd= weapon==='spread'? 8:7
    }
    const burst=()=>{
      for(let k=0;k<14;k++){
        const a=k/14*Math.PI*2
        bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*6.2,vy:Math.sin(a)*6.2,life:30})
      }
      playTone(880,0.18,'square',0.14)
    }
    const dash=()=>{
      if(player.dashCd>0||player.dash>0) return
      const mx=input.keys['w']||input.keys['arrowup']? -1: input.keys['s']||input.keys['arrowdown']?1:0
      const my=input.keys['a']||input.keys['arrowleft']? -1: input.keys['d']||input.keys['arrowright']?1:0
      // dash towards mouse if no keys
      let ang=0
      if(mx||my){ ang=Math.atan2(my,mx) } else { ang=Math.atan2(input.mouse.y-player.y, input.mouse.x-player.x) }
      player.dash=14; player.dashCd=42
      // apply impulse
      player.x+=Math.cos(ang)*4; player.y+=Math.sin(ang)*4
      for(let i=0;i<8;i++) pool.push({x:player.x,y:player.y,vx:Math.cos(ang+Math.PI)*(Math.random()*3+1),vy:Math.sin(ang+Math.PI)*(Math.random()*3+1),life:1,c:'#00ffff',size:2.2})
      playTone(520,0.09,'square',0.13)
    }

    const reset=()=>{
      scoreL=0; levelL=1; hpL=100; waveL=1; enemies=[]; bullets=[]; power=[]; player={x:W/2,y:H/2,r:10,dash:0,dashCd:0}; over=false; paused=false; weapon='single'; spreadTimer=0; shootCd=0; combo=0; comboTimer=0; spawnWave(); setScore(0); setLevel(1); setHp(100); setWave(1); pool.clear()
    }
    resetRef.current=reset

    let wasDown=false
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '){ e.preventDefault(); shoot() }
      if(k==='shift'){ e.preventDefault(); dash() }
      if(k==='r' && over) reset()
      if(k==='p'){ if(!over) paused=!paused; }
      if(k==='e') burst()
      if(k==='q' && over) reset()
    }
    window.addEventListener('keydown', onKey)

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      const isPausedExternal=isStartedRef.current===false
      if(isPausedExternal){ draw(true); return }
      if(paused){ draw(true); return }
      if(!over){
        frame++
        if(shootCd>0) shootCd--
        if(player.dash>0) player.dash--
        if(player.dashCd>0) player.dashCd--
        if(spreadTimer>0){ spreadTimer--; if(spreadTimer<=0) weapon='single' }
        if(comboTimer>0){ comboTimer--; if(comboTimer<=0) combo=0 }
        // player move WASD/Flechas with dash multiplier
        let mx=0,my=0
        if(input.keys['w']||input.keys['arrowup']) my-=1
        if(input.keys['s']||input.keys['arrowdown']) my+=1
        if(input.keys['a']||input.keys['arrowleft']) mx-=1
        if(input.keys['d']||input.keys['arrowright']) mx+=1
        if(mx||my){
          const l=Math.hypot(mx,my); mx/=l; my/=l
          const sp= player.dash>0? 5.8 : 2.4
          player.x+=mx*sp; player.y+=my*sp
        } else {
          const dx=input.mouse.x-player.x, dy=input.mouse.y-player.y
          if(Math.hypot(dx,dy)>120){ player.x+=dx*0.006; player.y+=dy*0.006 }
        }
        player.x=Math.max(player.r,Math.min(W-player.r,player.x))
        player.y=Math.max(player.r,Math.min(H-player.r,player.y))

        if(input.mouse.down && !wasDown) shoot()
        if(input.mouse.down && frame%7===0) shoot()
        wasDown=input.mouse.down
        // shift dash via double-tap detection? use Shift key already

        enemies.forEach(e=>{
          const ang=Math.atan2(player.y-e.y, player.x-e.x)
          const sp=e.sp * (player.dash>0?0.72:1)
          e.x+=Math.cos(ang)*sp
          e.y+=Math.sin(ang)*sp
          enemies.forEach(o=>{ if(o!==e){ const d=Math.hypot(e.x-o.x, e.y-o.y); if(d< e.r+o.r+2 && d>0.1){ const a=Math.atan2(e.y-o.y,e.x-o.x); e.x+=Math.cos(a)*0.5; e.y+=Math.sin(a)*0.5 } } })
        })
        bullets.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.life-- })
        bullets=bullets.filter(b=> b.life>0 && b.x>-10&&b.x<W+10&&b.y>-10&&b.y<H+10)

        for(let i=enemies.length-1;i>=0;i--){
          const e=enemies[i]
          for(let j=bullets.length-1;j>=0;j--){
            const b=bullets[j]
            if(Math.hypot(b.x-e.x,b.y-e.y)< e.r+3.2){
              bullets.splice(j,1); e.hp--
              for(let k=0;k<3;k++) pool.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:1,c:'#ffdd00',size:2})
              if(e.hp<=0){
                enemies.splice(i,1); combo++; comboTimer=72
                const base=14+levelL*2
                const bonus= combo>2? (combo-1)*4:0
                scoreL+= base+bonus
                if(combo>3) playTone(740+combo*20,0.09,'sine',0.1)
                else playTone(520,0.07,'square',0.09)
                if(Math.random()>0.78){
                  const r=Math.random()
                  const kind= r<0.4?'heal': r<0.7?'burst':'spread'
                  power.push({x:e.x,y:e.y,kind:kind as any,t:360})
                }
                for(let k=0;k<7;k++) pool.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:'#ff3355',size:2.6})
                // score popup handled via particles
              }
              break
            }
          }
        }
        let hit=false
        for(let i=enemies.length-1;i>=0;i--){
          const e=enemies[i]
          if(Math.hypot(e.x-player.x,e.y-player.y)< e.r+player.r){
            if(player.dash>0){
              // dash through: knock enemy away, no damage
              const a=Math.atan2(e.y-player.y,e.x-player.x); e.x+=Math.cos(a)*12; e.y+=Math.sin(a)*12; e.hp-=1
              if(e.hp<=0){ enemies.splice(i,1); scoreL+=20; for(let k=0;k<8;k++) pool.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#00ffff',size:2.4}) }
              continue
            }
            if(!hit){
              hpL-=0.58 + levelL*0.045; playTone(160,0.06,'sawtooth',0.07)
              const a=Math.atan2(player.y-e.y,player.x-e.x); player.x+=Math.cos(a)*1.8; player.y+=Math.sin(a)*1.8
              for(let k=0;k<2;k++) pool.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:1,c:'#ff3355',size:2})
              hit=true
              combo=0; comboTimer=0
              if(hpL<=0){ hpL=0; over=true; if(scoreL>bestRef.current){ saveBest(BK,Math.floor(scoreL)); bestRef.current=Math.floor(scoreL); setBest(Math.floor(scoreL)); onScoreRef.current(Math.floor(scoreL))} playTone(90,0.5,'sawtooth',0.16) }
            }
          }
        }
        power.forEach(p=> p.t--)
        power=power.filter(p=> p.t>0)
        for(let i=power.length-1;i>=0;i--){
          const p=power[i]
          if(Math.hypot(p.x-player.x,p.y-player.y)<15){
            if(p.kind==='heal'){ hpL=Math.min(100, hpL+30); playTone(660,0.14,'sine',0.13) }
            else if(p.kind==='burst'){ burst(); hpL=Math.min(100, hpL+10); playTone(880,0.14,'square',0.13) }
            else { weapon='spread'; spreadTimer=520; playTone(740,0.14,'triangle',0.13); hpL=Math.min(100, hpL+8) }
            for(let k=0;k<10;k++) pool.push({x:p.x,y:p.y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c: p.kind==='heal'?'#00ff88': p.kind==='burst'?'#ffdd00':'#00aaff',size:2.8})
            power.splice(i,1)
          }
        }
        scoreL+=0.06; if(frame%6===0){ setScore(Math.floor(scoreL)); setHp(Math.max(0,Math.floor(hpL))) }
        if(enemies.length===0){
          waveL++; levelL=Math.min(15, 1+Math.floor(waveL/1.5)); setWave(waveL); setLevel(levelL)
          hpL=Math.min(100, hpL+10); setHp(Math.floor(hpL))
          spawnWave(); playTone(740,0.16,'square',0.12)
          weapon='spread'; spreadTimer=180 // brief spread reward
          if(scoreL>bestRef.current){ saveBest(BK,Math.floor(scoreL)); bestRef.current=Math.floor(scoreL); setBest(Math.floor(scoreL)); onScoreRef.current(Math.floor(scoreL)) }
        }
        if(combo>1 && frame%24===0) playTone(660+combo*12,0.06,'sine',0.08)
      }
      pool.update()
      draw(false)
    }

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.04)'; for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo((i+frame*0.2)%W,0); ctx.lineTo((i+frame*0.2)%W+20,H); ctx.stroke()}
      // grid glow
      const vg=ctx.createRadialGradient(W/2,H/2, 120, W/2,H/2, 360)
      vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.28)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)
      power.forEach(p=>{
        const col=p.kind==='heal'?'#00ff88':p.kind==='burst'?'#ffdd00':'#00aaff'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(p.x,p.y,8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'; ctx.fillText(p.kind==='heal'?'+':p.kind==='burst'?'★':'◈',p.x,p.y+3)
        ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(p.x,p.y,11, -Math.PI/2, -Math.PI/2+Math.PI*2*(p.t/360)); ctx.stroke()
      })
      enemies.forEach(e=>{
        const col= e.hp>1?'#ffaa00':'#ff3355'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(e.x-2,e.y-2,2,0,Math.PI*2); ctx.fill()
        if(e.hp>1){ ctx.fillStyle='rgba(255,221,0,0.9)'; ctx.font='700 7px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(String(e.hp),e.x,e.y- e.r-4) }
      })
      bullets.forEach(b=>{
        ctx.fillStyle= weapon==='spread'?'#00aaff':'#00ffff'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      })
      const isDash=player.dash>0
      ctx.fillStyle= over?'#555': isDash?'#ffffff':'#00ffff'; ctx.shadowColor= over?'transparent': isDash?'#ffffff':'#00ffff'; ctx.shadowBlur= over?0:14; ctx.beginPath(); ctx.arc(player.x,player.y,player.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle= isDash?'#00ffff':'#003333'; ctx.beginPath(); ctx.arc(player.x,player.y,3,0,Math.PI*2); ctx.fill()
      // dash ring
      if(isDash){
        ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(player.x,player.y, player.r+7,0,Math.PI*2); ctx.stroke()
      } else if(player.dashCd>0){
        ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(player.x,player.y, player.r+5,-Math.PI/2, -Math.PI/2 + Math.PI*2*(1-player.dashCd/42)); ctx.stroke()
      }
      ctx.strokeStyle='rgba(0,255,255,0.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(player.x,player.y, player.r+7+Math.sin(frame*0.18)*3,0,Math.PI*2); ctx.stroke()
      if(!over && !showPause){
        ctx.strokeStyle='rgba(0,255,255,0.14)'; ctx.setLineDash([4,6]); ctx.beginPath(); ctx.moveTo(player.x,player.y); ctx.lineTo(input.mouse.x,input.mouse.y); ctx.stroke(); ctx.setLineDash([])
      }
      pool.draw(ctx)
      if(combo>2){
        ctx.fillStyle= combo>5?'#ff00ff':'#ffdd00'; ctx.font='900 12px Orbitron'; ctx.textAlign='center'; ctx.shadowColor=ctx.fillStyle as string; ctx.shadowBlur=8; ctx.fillText(`COMBO x${combo}`,W/2,20); ctx.shadowBlur=0
        const pct=comboTimer/72
        ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(W/2-40,24,80,3)
        ctx.fillStyle='#ffdd00'; ctx.fillRect(W/2-40,24,80*pct,3)
      }
      if(weapon==='spread'){
        ctx.fillStyle='rgba(0,170,255,0.14)'; ctx.fillRect(0,0,W,20)
        ctx.fillStyle='#00aaff'; ctx.font='700 10px JetBrains Mono'; ctx.textAlign='center'; ctx.fillText(`SPREAD ${Math.ceil(spreadTimer/60)}s`,W/2,14)
      }
      if(showPause){
        ctx.fillStyle='rgba(0,0,0,0.54)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='11px JetBrains Mono'; ctx.fillText('P para continuar',W/2,H/2+18)
      } else if(over){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=10; ctx.fillText('¡HORDA TE ALCANZÓ!',W/2,H/2-12); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='11px JetBrains Mono'; ctx.fillText(`Score ${Math.floor(scoreL)} • Oleada ${waveL} • Nivel ${levelL}`,W/2,H/2+10)
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('Q/R para reiniciar — E burst — Shift dash',W/2,H/2+30)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-crosshair" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="flex-1 glass rounded-lg px-3 py-2 flex items-center gap-2"><span className="text-xs font-mono text-red-300">HP</span><div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-red-400" style={{width:`${hp}%`}}/></div><span className="text-xs font-mono text-white">{hp}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Oleada {wave} Lv{level} • Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <span className="px-3 py-2 rounded-lg glass text-[11px] font-mono text-white/60">Shift dash</span>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">WASD mueve • Mouse apunta • Shift dash • E burst • Spread arma • Combo • Oleadas 6+wave*2</p>
    </div>
  )
}
