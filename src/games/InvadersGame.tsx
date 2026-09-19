import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function InvadersGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?:boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [best,setBest]=useState(()=>loadBest('neo_invaders_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  const resetRef=useRef<()=>void>(()=>{})

  useEffect(()=>{
    const c=canvasRef.current!
    const {ctx,W,H}=setupCanvas(c,480,360)
    const particles=createParticlePool(72)
    const input=createInput(c,W,H)
    let raf=0, frame=0
    let scoreL=0, levelL=1, wave=1, lives=3
    let gameOver=false, paused=false
    let ship={x:W/2,y:H-28,w:28,h:16, cd:0, rapidTimer:0}
    type Inv={x:number,y:number,alive:boolean, dived:boolean, diveVy:number}
    let invaders:Inv[]=[]
    let invDir=1, invDrop=0
    let bullets:{x:number,y:number,vy:number,alive:boolean}[]=[]
    let eBullets:{x:number,y:number,vy:number,alive:boolean}[]=[]
    type Shield={x:number,y:number,hp:number}
    let shields:Shield[]=[]
    let power:{x:number,y:number,vy:number,kind:'rapid'|'life',alive:boolean}[]=[]
    let boss:{x:number,y:number,hp:number,maxHp:number,alive:boolean, dir:number}|null=null

    const emit=(x:number,y:number,col:string,n=6)=>{ for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1,c:col,size:2.4}) }
    const buildWave=()=>{
      invaders=[]
      const cols=11, rows=5
      const sx=38, sy=44, gapX=36, gapY=26
      for(let r=0;r<rows;r++) for(let cc=0;cc<cols;cc++){
        invaders.push({x:sx+cc*gapX, y:sy+r*gapY, alive:true, dived:false, diveVy:0})
      }
      // if boss wave every 3, add boss after clearing? boss appears separately
      if(wave%3===0){
        boss={x:W/2,y:36,hp: 22+ wave*6, maxHp: 22+wave*6, alive:true, dir:1}
      } else boss=null
      // shields degradables
      shields=[]
      for(let i=0;i<3;i++){
        shields.push({x: 78 + i*140, y: H-96, hp: 4})
      }
      invDir=1
    }
    buildWave()

    const reset=()=>{
      scoreL=0; levelL=1; wave=1; lives=3; gameOver=false; paused=false; ship={x:W/2,y:H-28,w:28,h:16,cd:0,rapidTimer:0}
      bullets=[]; eBullets=[]; power=[]; particles.clear(); buildWave(); setScore(0); setLevel(1)
    }
    resetRef.current=reset

    const shoot=()=>{
      if(gameOver||paused) return
      if(ship.cd>0) return
      bullets.push({x:ship.x,y:ship.y-10,vy: -7.2, alive:true})
      ship.cd= ship.rapidTimer>0? 7 : 16
      playTone(740,0.07,'square',0.12)
    }

    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase()
      if(k===' '){ e.preventDefault(); shoot() }
      if(k==='r'){ reset(); return }
      if(k==='p'){ if(!gameOver) paused=!paused; return }
    }
    window.addEventListener('keydown', onKey)
    const onPointer=()=>{
      shoot()
    }
    c.addEventListener('mousedown', onPointer as any)
    c.addEventListener('touchstart', onPointer as any, {passive:true} as any)

    const draw=(showPause:boolean)=>{
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(0,255,255,0.05)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      // stars
      ctx.fillStyle='rgba(255,255,255,0.08)'
      for(let i=0;i<30;i++){ const x=(i*67)%W, y=(i*41+ frame*0.4)%H; ctx.fillRect(x,y,1,1) }
      // shields degradables
      for(const s of shields){
        const alpha= s.hp/4
        ctx.fillStyle=`rgba(0,255,255,${0.18*alpha+0.08})`
        ctx.strokeStyle=`rgba(0,255,255,${0.7*alpha})`; ctx.lineWidth=1.2
        const w=64,h=28
        ctx.beginPath(); (ctx as any).roundRect(s.x-w/2,s.y,w,h,6); ctx.fill(); ctx.stroke()
        for(let i=0;i<4;i++){
          ctx.fillStyle= i < s.hp ? '#00ffff':'rgba(255,255,255,0.12)'
          ctx.fillRect(s.x-w/2+8+i*14, s.y+10,10,6)
        }
      }
      // invaders zigzag + dive (color by row)
      for(const inv of invaders){
        if(!inv.alive) continue
        const row=Math.floor((inv.y-44)/26)
        const col=row%3===0?'#ff00ff': row%3===1?'#00ffff':'#ffdd00'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=8
        ctx.beginPath(); (ctx as any).roundRect(inv.x-12,inv.y-8,24,16,4); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.fillRect(inv.x-8,inv.y-2,4,4); ctx.fillRect(inv.x+4,inv.y-2,4,4)
        if(inv.dived){ ctx.strokeStyle='#ff3366'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(inv.x,inv.y-8); ctx.lineTo(inv.x,inv.y-18); ctx.stroke() }
      }
      // boss
      if(boss && boss.alive){
        ctx.fillStyle='#ff3366'; ctx.shadowColor='#ff3366'; ctx.shadowBlur=14
        ctx.beginPath(); (ctx as any).roundRect(boss.x-36,boss.y-14,72,28,8); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 9px Orbitron'; ctx.textAlign='center'; ctx.fillText('BOSS',boss.x,boss.y+4)
        const pct=boss.hp/boss.maxHp
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(boss.x-36,boss.y+16,72,6)
        ctx.fillStyle='#ff3366'; ctx.fillRect(boss.x-36,boss.y+16,72*pct,6)
      }
      // ship
      ctx.save(); ctx.translate(ship.x,ship.y)
      ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12
      ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(-14,8); ctx.lineTo(-6,8); ctx.lineTo(0,2); ctx.lineTo(6,8); ctx.lineTo(14,8); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0
      ctx.fillStyle= ship.rapidTimer>0?'#ff00ff':'#003333'; ctx.beginPath(); ctx.arc(0,4,3,0,Math.PI*2); ctx.fill()
      if(ship.rapidTimer>0){ ctx.strokeStyle='#ff00ff'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.stroke() }
      ctx.restore()
      // bullets
      for(const b of bullets){ ctx.fillStyle='#00ffff'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=8; ctx.fillRect(b.x-2,b.y-6,4,10); ctx.shadowBlur=0 }
      for(const b of eBullets){ ctx.fillStyle=b.vy>3?'#ff3366':'#ffdd00'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0 }
      for(const pw of power){
        const col=pw.kind==='rapid'?'#ff00ff':'#00ff88'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(pw.x,pw.y,8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 8px Orbitron'; ctx.textAlign='center'; ctx.fillText(pw.kind==='rapid'?'≋':'+',pw.x,pw.y+3)
      }
      particles.draw(ctx)
      ctx.fillStyle='rgba(0,0,0,0.46)'; ctx.fillRect(0,0,W,20)
      ctx.fillStyle='#00ffff'; ctx.font='700 11px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`NIVEL ${levelL} OLA ${wave}`,8,14)
      ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='900 11px Orbitron'; ctx.fillText(`${scoreL}`,W/2,14)
      ctx.textAlign='right'; 
      let livesStr='♥'.repeat(lives) + '♡'.repeat(Math.max(0,3-lives))
      ctx.fillStyle='#ff3366'; ctx.font='700 11px JetBrains Mono'; ctx.fillText(livesStr,W-8,14)
      if(showPause||paused){
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.66)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3366'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-10)
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

      // ship move
      const keys=input.keys
      let mv=0
      if(keys['a']||keys['arrowleft']) mv=-1
      if(keys['d']||keys['arrowright']) mv=1
      // mouse
      const mx=input.mouse.x
      if(Math.abs(mx-ship.x)>4 && !keys['a'] && !keys['d'] && !keys['arrowleft'] && !keys['arrowright']){
        ship.x += (mx - ship.x)*0.18
      } else {
        ship.x+= mv*5.2
      }
      ship.x=Math.max(18,Math.min(W-18,ship.x))
      if(input.mouse.down && frame%10===0) shoot()
      if(ship.cd>0) ship.cd--
      if(ship.rapidTimer>0) ship.rapidTimer--

      // invaders zigzag + dive pattern
      let edge=false
      const aliveInvs=invaders.filter(i=>i.alive)
      for(const inv of aliveInvs){
        if(!inv.dived) inv.x+= invDir* (0.72 + levelL*0.18 + wave*0.07)
        else {
          inv.y+= inv.diveVy
          inv.diveVy+=0.18
          // wobble
          inv.x+= Math.sin(frame*0.12+ inv.y*0.01)*1.2
        }
        if(!inv.dived && (inv.x<18||inv.x>W-18)) edge=true
        // random dive trigger
        if(!inv.dived && Math.random()<0.0012 + levelL*0.00025){
          inv.dived=true; inv.diveVy=1.2 + Math.random()*1.6
        }
        if(inv.dived && inv.y>H+20){
          inv.alive=false // dive missed, respawn top?
        }
      }
      if(edge){ invDir*=-1; for(const inv of aliveInvs) if(!inv.dived) inv.y+=10 }
      // if invaders reach shields/ship line
      for(const inv of aliveInvs){
        if(inv.y > H-50){
          lives=0; gameOver=true; playTone(90,0.5,'sawtooth',0.18)
          if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_invaders_best',scoreL); onScoreRef.current(scoreL) }
        }
        // collide with ship
        if(Math.abs(inv.x-ship.x)<18 && Math.abs(inv.y-ship.y)<14){
          inv.alive=false
          lives--; playTone(200,0.22,'sawtooth',0.15)
          for(let i=0;i<10;i++) particles.push({x:inv.x,y:inv.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:1,c:'#ff3366',size:2.4})
          if(lives<=0){ gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_invaders_best',scoreL); onScoreRef.current(scoreL) } }
          else { ship.x=W/2; // brief invul?
          }
        }
      }

      // boss move
      if(boss && boss.alive){
        boss.x+= boss.dir* (1.2+ levelL*0.12)
        if(boss.x<60||boss.x>W-60) boss.dir*=-1
        if(frame% 58===0){
          // boss shoots 3
          for(let k=-1;k<=1;k++) eBullets.push({x:boss.x+k*12, y:boss.y+14, vy:3.2, alive:true})
        }
        if(frame% 220===0 && boss.hp < boss.maxHp*0.5){
          // spawn reinforcements
          for(let i=0;i<3;i++) invaders.push({x:boss.x+(Math.random()-0.5)*60, y:boss.y+10, alive:true, dived:false, diveVy:0})
        }
      }

      // eBullets spawn random
      if(frame% Math.max(18, 46 - levelL*2)===0 && aliveInvs.length>0){
        const shooters=aliveInvs.filter((_,i)=> i% Math.max(2, 6 - Math.floor(levelL/2))===0)
        if(shooters.length){
          const s=shooters[Math.floor(Math.random()*shooters.length)]
          eBullets.push({x:s.x,y:s.y+8,vy:2.6 + Math.random()*1.2, alive:true})
        }
      }

      // update bullets
      for(const b of bullets){ b.y+=b.vy }
      bullets=bullets.filter(b=> b.alive && b.y>-10)
      for(const b of eBullets){ b.y+=b.vy }
      eBullets=eBullets.filter(b=> b.alive && b.y<H+10)

      // collisions: bullets vs invaders/boss/shields
      for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i]
        let hit=false
        // shields block
        for(const s of shields){
          if(b.x> s.x-32 && b.x < s.x+32 && b.y> s.y-6 && b.y< s.y+28){
            if(s.hp>0){ s.hp--; bullets.splice(i,1); hit=true; emit(b.x,b.y,'#00ffff',5); playTone(300,0.08,'square',0.1); break }
          }
        }
        if(hit) continue
        if(boss && boss.alive && Math.abs(b.x-boss.x)<36 && Math.abs(b.y-boss.y)<18){
          boss.hp-=1; bullets.splice(i,1); emit(b.x,b.y,'#ff3366',6); playTone(520,0.07,'square',0.11); scoreL+=5; setScore(scoreL)
          if(boss.hp<=0){ boss.alive=false; scoreL+=120+wave*12; setScore(scoreL); for(let k=0;k<16;k++) particles.push({x:boss.x,y:boss.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff3366',size:3}); playTone(880,0.22,'square',0.16); if(Math.random()<0.5) power.push({x:boss.x,y:boss.y,vy:1.6,kind:'life',alive:true}); if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_invaders_best',scoreL); onScoreRef.current(scoreL)} }
          continue
        }
        for(const inv of invaders){
          if(!inv.alive) continue
          if(Math.abs(b.x-inv.x)<14 && Math.abs(b.y-inv.y)<10){
            inv.alive=false; bullets.splice(i,1); hit=true; scoreL+=12+levelL*2; setScore(scoreL); emit(inv.x,inv.y,'#ffdd00',7); playTone(620,0.08,'sine',0.11)
            if(Math.random()<0.07) power.push({x:inv.x,y:inv.y,vy:1.8,kind: Math.random()<0.7?'rapid':'life', alive:true})
            if(scoreL>bestRef.current) onScoreRef.current(scoreL)
            break
          }
        }
      }
      // eBullets vs ship/shields/power
      for(let i=eBullets.length-1;i>=0;i--){
        const b=eBullets[i]
        // shields
        let blocked=false
        for(const s of shields){
          if(s.hp>0 && b.x> s.x-32 && b.x < s.x+32 && b.y> s.y-4 && b.y< s.y+28){ s.hp=Math.max(0,s.hp-1); eBullets.splice(i,1); blocked=true; emit(b.x,b.y,'#00ffff',4); break }
        }
        if(blocked) continue
        if(Math.abs(b.x-ship.x)<14 && Math.abs(b.y-ship.y)<10){
          eBullets.splice(i,1); lives--; emit(ship.x,ship.y,'#ff3366',9); playTone(180,0.18,'sawtooth',0.14)
          if(lives<=0){ gameOver=true; if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_invaders_best',scoreL); onScoreRef.current(scoreL) } }
        }
      }
      // power pickup
      for(let i=power.length-1;i>=0;i--){
        const pw=power[i]
        pw.y+=pw.vy
        if(Math.abs(pw.x-ship.x)<18 && Math.abs(pw.y-ship.y)<16){
          if(pw.kind==='rapid'){ ship.rapidTimer=520; scoreL+=20; setScore(scoreL); playTone(880,0.14,'sine',0.15) }
          else { lives=Math.min(3,lives+1); scoreL+=25; setScore(scoreL); playTone(660,0.14,'triangle',0.14) }
          emit(pw.x,pw.y, pw.kind==='rapid'?'#ff00ff':'#00ff88',8)
          power.splice(i,1)
        } else if(pw.y>H+10) power.splice(i,1)
      }

      // wave clear?
      if(invaders.every(inv=>!inv.alive) && (!boss || !boss.alive)){
        wave++; levelL=Math.min(12, 1+Math.floor(wave/1.2)); setLevel(levelL)
        scoreL+=50+wave*8; setScore(scoreL)
        if(scoreL>bestRef.current){ bestRef.current=scoreL; setBest(scoreL); saveBest('neo_invaders_best',scoreL); onScoreRef.current(scoreL) }
        buildWave(); playTone(740,0.18,'square',0.14)
      }

      particles.update()
      draw(false)
    }
    loop()
    return()=>{
      cancelAnimationFrame(raf); window.removeEventListener('keydown',onKey)
      c.removeEventListener('mousedown', onPointer as any); c.removeEventListener('touchstart', onPointer as any)
      input.cleanup()
    }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-crosshair" width={480} height={360}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-center min-w-[84px]"><p className="text-[11px] font-mono text-white/50">NIVEL</p><p className="font-black text-cyan-300" style={{fontFamily:'Orbitron'}}>{level}</p></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={()=>resetRef.current()} className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm">REINICIAR [R]</button>
        <button onClick={()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'p'}))} className="px-4 py-2 rounded-lg glass text-cyan-200 font-bold text-sm">⏯ [P]</button>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">A/D o Mouse mueve • Espacio/Click dispara • Horda 5×11 zigzag + dive • Boss cada 3 oleadas • Escudos degradables</p>
    </div>
  )
}
