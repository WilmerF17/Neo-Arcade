import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createParticlePool, createInput, playTone, loadBest, saveBest } from './engine/elite'

export default function ShooterGame({onScore, isStarted}:{onScore:(s:number)=>void,isStarted?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [best,setBest]=useState(()=>loadBest('neo_shooter_best'))
  const bestRef=useRef(best), onScoreRef=useRef(onScore), isStartedRef=useRef(isStarted)
  useEffect(()=>{bestRef.current=best},[best])
  useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  useEffect(()=>{onScoreRef.current=onScore},[onScore])
  useEffect(()=>{
    const c=canvasRef.current!; const {ctx,W,H}=setupCanvas(c,480,360)
    const particles=createParticlePool(48)
    const input=createInput(c,W,H)
    let raf=0, scoreL=0, level=1, gameOver=false
    let ship={x:W/2,y:H-40,w:28,h:28, hp:100}
    let bullets:{x:number,y:number,vy:number,vx:number,alive:boolean}[]=[]
    let enemies:{x:number,y:number,vx:number,vy:number,r:number,hp:number,kind:0|1|2,phase:number}[]=[]
    let eBullets:{x:number,y:number,vx:number,vy:number,alive:boolean}[]=[]
    let stars:{x:number,y:number,s:number,vy:number,tw:number}[] = Array.from({length:64},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.5+0.6,vy:Math.random()*2+1.2,tw:Math.random()*Math.PI*2}))
    let powers:{x:number,y:number,vy:number,kind:'rapid'|'spread'|'shield',alive:boolean}[]=[]
    let combo=0, comboT=0, fireCooldown=0, weapon: 'single'|'rapid'|'spread'='single', weaponT=0, shieldT=0
    let waveTimer=0, pattern=0, shake=0, last=performance.now()
    const emit=(x:number,y:number,c:string,n=8)=>{
      for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c,size:2.6})
    }
    const spawnWave=()=>{
      pattern = (pattern+1)%4
      const count = 5 + Math.floor(level*0.9) + (pattern===3?4:0)
      for(let i=0;i<count;i++){
        const kind:0|1|2 = pattern===0?0 : pattern===1?1 : pattern===2? (i%2 as 0|1) : 2
        const r = kind===2? 18 : 14+Math.random()*9
        const x = 28 + (i+0.5)*( (W-56)/count) + (Math.random()-0.5)*18
        const vx = kind===1? (Math.random()-0.5)*1.8 : Math.sin(i*0.9)*0.5
        const vy = 0.85 + level*0.16 + Math.random()*0.6
        enemies.push({x,y:-24 - i*16, vx, vy, r, hp: kind===2?3:1, kind, phase: Math.random()*Math.PI*2})
      }
      // occasional fast strafer
      if(level>2 && Math.random()<0.45){
        enemies.push({x: Math.random()<0.5?-24:W+24, y: 50+Math.random()*90, vx: (Math.random()<0.5?1:-1)*(2.9+level*0.12), vy:0.45, r:13, hp:1, kind:1, phase:0})
      }
    }
    spawnWave()
    const fire=()=>{
      if(fireCooldown>0) return
      const baseVy=-9 - level*0.12
      if(weapon==='spread'){
        for(let a=-1;a<=1;a++) bullets.push({x:ship.x + a*9, y:ship.y-12, vx: a*1.4, vy:baseVy, alive:true})
        fireCooldown=7
      } else {
        bullets.push({x:ship.x,y:ship.y-14, vx:0, vy:baseVy, alive:true})
        if(weapon==='rapid'){
          bullets.push({x:ship.x-6,y:ship.y-8, vx:-0.35, vy:baseVy, alive:true})
          bullets.push({x:ship.x+6,y:ship.y-8, vx:0.35, vy:baseVy, alive:true})
          fireCooldown=4
        } else fireCooldown=8
      }
      playTone(weapon==='spread'?920:760,0.06,'square',0.11)
    }
    const onShootKey=(e:KeyboardEvent)=>{
      if(e.code==='Space'||e.key===' ') fire()
      if(e.key.toLowerCase()==='r' && gameOver){
        gameOver=false; ship.hp=100; scoreL=0; level=1; combo=0; enemies=[]; bullets=[]; eBullets=[]; powers=[]; particles.clear(); weapon='single'; shieldT=0; setScore(0); spawnWave(); playTone(640,0.12,'square',0.14)
      }
    }
    window.addEventListener('keydown', onShootKey)
    const onClickShoot=()=>{ if(!gameOver) fire(); else { gameOver=false; ship.hp=100; scoreL=0; level=1; combo=0; enemies=[]; bullets=[]; eBullets=[]; powers=[]; particles.clear(); weapon='single'; shieldT=0; setScore(0); spawnWave() } }
    c.addEventListener('mousedown', onClickShoot)
    c.addEventListener('touchstart', (e)=>{ e.preventDefault(); onClickShoot() }, {passive:false} as any)
    const update=()=>{
      const now=performance.now()
      const dt=Math.min(32, now-last)/16.66
      last=now
      if(isStartedRef.current===false) return
      if(gameOver) return
      if(shake>0) shake-=0.14*dt
      // input move
      const keys=input.keys
      let mx=input.mouse.x
      // keys override position
      if(keys['a']||keys['arrowleft']) ship.x-=6.2*dt
      if(keys['d']||keys['arrowright']) ship.x+=6.2*dt
      if(keys['w']||keys['arrowup']) ship.y-=4.2*dt
      if(keys['s']||keys['arrowdown']) ship.y+=4.2*dt
      // mouse smooth follow when not using keys and mouse is down/moving
      if(!keys['a']&&!keys['d']&&!keys['arrowleft']&&!keys['arrowright']){
        ship.x += (mx - ship.x)*0.22*dt
      }
      if(keys[' '] ) fire()
      ship.x=Math.max(16,Math.min(W-16, ship.x))
      ship.y=Math.max(46,Math.min(H-20, ship.y))
      if(fireCooldown>0) fireCooldown-=dt
      if(weaponT>0){ weaponT-=dt; if(weaponT<=0) weapon='single' }
      if(shieldT>0) shieldT-=dt
      if(comboT>0){ comboT-=dt; if(comboT<=0) combo=0 }
      waveTimer+=dt
      if(enemies.length===0 || waveTimer> 520){
        waveTimer=0; level++; spawnWave(); playTone(880,0.15,'sine',0.15)
      }
      // stars parallax
      for(const s of stars){ s.y+=s.vy*dt; s.tw+=0.06*dt; if(s.y>H+6){ s.y=-6; s.x=Math.random()*W } }
      // bullets
      for(const b of bullets){ if(!b.alive) continue; b.y+=b.vy*dt; b.x+=b.vx*dt; if(b.y<-16) b.alive=false }
      bullets=bullets.filter(b=>b.alive)
      // enemies movement with patterns
      for(const e of enemies){
        e.phase+=0.05*dt
        if(e.kind===0){ e.x+= e.vx*dt + Math.sin(e.phase)*0.5*dt; e.y+=e.vy*dt }
        else if(e.kind===1){ e.x+=e.vx*dt; e.y+=e.vy*dt; e.vx+= Math.sin(e.phase)*0.03*dt }
        else { // heavy weaver
          e.x+= Math.sin(e.phase)*1.1*dt; e.y+=e.vy*0.7*dt
          // shoot occasionally
          if(Math.random()<0.008*dt){
            const ang=Math.atan2(ship.y - e.y, ship.x - e.x)
            eBullets.push({x:e.x,y:e.y+10, vx:Math.cos(ang)*2.8, vy:Math.sin(ang)*2.8, alive:true})
          }
        }
        if(e.x<e.r||e.x>W-e.r) e.vx*=-1
      }
      // eBullets
      for(const eb of eBullets){ eb.x+=eb.vx*dt; eb.y+=eb.vy*dt; if(eb.y>H+10||eb.x<-10||eb.x>W+10) eb.alive=false }
      eBullets=eBullets.filter(b=>b.alive)
      // bullet-enemy
      for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i]
        for(let j=bullets.length-1;j>=0;j--){
          const b=bullets[j]
          const dx=b.x-e.x, dy=b.y-e.y
          if(Math.sqrt(dx*dx+dy*dy)< e.r+4){
            b.alive=false
            e.hp--
            if(e.hp<=0){
              const base=20 + e.kind*15 + level*3
              combo++; comboT=78
              const mult= 1 + Math.floor(combo/5)*0.35
              const pts=Math.floor(base*mult)
              scoreL+=pts; setScore(scoreL); if(scoreL>bestRef.current) onScoreRef.current(scoreL)
              emit(e.x,e.y, e.kind===2?'#ffdd00': e.kind===1?'#ff00ff':'#00ffff', 10)
              playTone(e.kind===2?420:640,0.09,'square',0.13)
              // chance power
              if(Math.random()<0.14){
                const kind:typeof powers[number]['kind']= Math.random()<0.4?'rapid': Math.random()<0.6?'spread':'shield'
                powers.push({x:e.x,y:e.y,vy:1.2,kind,alive:true})
              }
              enemies.splice(i,1)
            } else {
              playTone(320,0.06,'sine',0.1)
              emit(b.x,b.y,'#ffffff',3)
              bullets.splice(j,1)
            }
            bullets=bullets.filter(bb=>bb.alive)
            break
          }
        }
      }
      // powers
      for(const p of powers){
        p.y+=p.vy*dt
        const dx=p.x-ship.x, dy=p.y-ship.y
        if(Math.sqrt(dx*dx+dy*dy)<22){
          p.alive=false
          if(p.kind==='rapid'){ weapon='rapid'; weaponT=620; playTone(920,0.16,'triangle',0.15)}
          else if(p.kind==='spread'){ weapon='spread'; weaponT=620; playTone(880,0.16,'triangle',0.15)}
          else if(p.kind==='shield'){ shieldT=420; ship.hp=Math.min(100, ship.hp+18); playTone(740,0.18,'sine',0.16)}
          scoreL+=30; setScore(scoreL)
          emit(p.x,p.y, p.kind==='rapid'?'#00ffff':p.kind==='spread'?'#ff00ff':'#00ff88',7)
        }
        if(p.y>H+20) p.alive=false
      }
      powers=powers.filter(p=>p.alive)
      // enemy-ship + eBullet-ship
      for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i]
        const dx=ship.x-e.x, dy=ship.y-e.y
        if(Math.sqrt(dx*dx+dy*dy)< e.r+15){
          enemies.splice(i,1)
          emit(e.x,e.y,'#ff3355',9); shake=4
          if(shieldT>0){ shieldT=Math.max(0,shieldT-40); playTone(300,0.12,'square',0.14)}
          else { ship.hp-=19; playTone(140,0.22,'sawtooth',0.18); for(let k=0;k<9;k++) particles.push({x:ship.x,y:ship.y,vx:(Math.random()-0.5)*7,vy:(Math.random()-0.5)*7,life:1,c:'#ff3355',size:3}) }
          if(ship.hp<=0){
            gameOver=true
            if(scoreL>bestRef.current){ saveBest('neo_shooter_best',scoreL); setBest(scoreL); bestRef.current=scoreL }
            onScoreRef.current(scoreL)
          }
        } else if(e.y>H+34){
          enemies.splice(i,1)
        }
      }
      for(let i=eBullets.length-1;i>=0;i--){
        const eb=eBullets[i]
        const dx=ship.x-eb.x, dy=ship.y-eb.y
        if(Math.sqrt(dx*dx+dy*dy)<14){
          eBullets.splice(i,1); shake=2.6
          if(shieldT>0){ shieldT=Math.max(0,shieldT-50) }
          else { ship.hp-=13; emit(ship.x,ship.y,'#ff3355',6); playTone(180,0.15,'sawtooth',0.14) }
          if(ship.hp<=0){
            gameOver=true
            if(scoreL>bestRef.current){ saveBest('neo_shooter_best',scoreL); setBest(scoreL); bestRef.current=scoreL }
            onScoreRef.current(scoreL)
          }
        }
      }
      particles.update()
    }
    const draw=(paused:boolean)=>{
      ctx.save()
      if(shake>0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake)
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid
      ctx.strokeStyle='rgba(0,255,255,0.04)'; ctx.lineWidth=1
      for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      // stars with twinkle
      for(const s of stars){
        const a=0.35+ Math.sin(s.tw)*0.2
        ctx.globalAlpha=a; ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,Math.PI*2); ctx.fill()
      }
      ctx.globalAlpha=1
      // vignette
      const vg=ctx.createRadialGradient(W/2,H/2, 120, W/2,H/2, 420)
      vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.45)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H)
      // enemies
      for(const e of enemies){
        ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(e.phase*0.18)
        const col= e.kind===0?'#ff3040': e.kind===1?'#ff00ff':'#ffdd00'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=12
        ctx.beginPath()
        for(let a=0;a<6;a++){
          const ang=a/6*Math.PI*2
          const rad=e.r + Math.sin(a*1.7 + e.phase)*2.5
          const x=Math.cos(ang)*rad, y=Math.sin(ang)*rad
          if(a===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
        }
        ctx.closePath(); ctx.fill(); ctx.shadowBlur=0
        // core
        ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.arc(-3,-3,4,0,Math.PI*2); ctx.fill()
        // hp bar for heavy
        if(e.hp>1){
          ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(-12,-e.r-8,24,4)
          ctx.fillStyle='#00ff88'; ctx.fillRect(-12,-e.r-8,24*(e.hp/3),4)
        }
        ctx.restore()
      }
      // powers falling
      for(const p of powers){
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.y*0.02)
        const col=p.kind==='rapid'?'#00ffff':p.kind==='spread'?'#ff00ff':'#00ff88'
        ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=10
        ctx.beginPath(); ctx.roundRect(-9,-9,18,18,5); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='#000'; ctx.font='900 9px Orbitron'; ctx.textAlign='center'
        ctx.fillText(p.kind==='rapid'?'≋':p.kind==='spread'?'⋇':'⬢',0,3)
        ctx.restore()
      }
      // bullets neon
      for(const b of bullets){
        ctx.fillStyle= weapon==='spread'?'#ff00ff':'#00ffff'; ctx.shadowColor=ctx.fillStyle as string; ctx.shadowBlur=10
        ctx.fillRect(b.x-2,b.y-9,4,10); ctx.shadowBlur=0
        ctx.fillStyle='#ffffff'; ctx.fillRect(b.x-1,b.y-7,2,6)
      }
      for(const eb of eBullets){
        ctx.fillStyle='#ff3355'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=8
        ctx.beginPath(); ctx.arc(eb.x,eb.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      }
      // ship
      ctx.save(); ctx.translate(ship.x, ship.y)
      if(shieldT>0){
        const a=0.18+ Math.sin(performance.now()*0.012)*0.10
        ctx.fillStyle=`rgba(0,255,136,${a})`; ctx.shadowColor='#00ff88'; ctx.shadowBlur=16
        ctx.beginPath(); ctx.arc(0,2,22,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
        ctx.strokeStyle='rgba(0,255,136,0.65)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(0,2,22,0,Math.PI*2); ctx.stroke()
      }
      // engine glow pulse
      const pulse=Math.sin(performance.now()*0.016)*0.22+0.78
      ctx.fillStyle=`rgba(0,255,255,${0.45*pulse})`; ctx.shadowColor='#00ffff'; ctx.shadowBlur=18
      ctx.beginPath(); ctx.ellipse(0,10,8,6*pulse,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0
      const grad=ctx.createLinearGradient(0,-14,0,14); grad.addColorStop(0,'#ffffff'); grad.addColorStop(1,'#00ffff')
      ctx.fillStyle=grad; ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(-12,12); ctx.lineTo(-4,8); ctx.lineTo(4,8); ctx.lineTo(12,12); ctx.closePath(); ctx.fill()
      ctx.strokeStyle='#00ffff'; ctx.lineWidth=1.4; ctx.stroke()
      ctx.fillStyle='#0a0a2a'; ctx.beginPath(); ctx.arc(0,-2,5,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#00ffff'; ctx.beginPath(); ctx.arc(1,-3,2,0,Math.PI*2); ctx.fill()
      ctx.restore()
      particles.draw(ctx)
      // combo + level
      if(combo>2){
        ctx.fillStyle='#00ffff'; ctx.font='900 12px Orbitron'; ctx.textAlign='left'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=8
        ctx.fillText(`COMBO x${combo}`, 12, 20); ctx.shadowBlur=0
        const pct=comboT/78; ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(12,24,70,4); ctx.fillStyle='#00ffff'; ctx.fillRect(12,24,70*pct,4)
      }
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='right'
      ctx.fillText(`NIVEL ${level}  HP ${Math.max(0,Math.floor(ship.hp))}%`, W-12, 18)
      // hp bar
      ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(12,H-14,140,6)
      ctx.fillStyle= ship.hp>55?'#00ff88':ship.hp>28?'#ffdd00':'#ff3355'; ctx.fillRect(12,H-14,140*(ship.hp/100),6)
      if(paused){
        ctx.fillStyle='rgba(8,10,20,0.74)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00ffff'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=12; ctx.fillText('PAUSA',W/2,H/2-6); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.78)'; ctx.font='11px JetBrains Mono'; ctx.fillText('A/D + W/S o mouse • Espacio / Click dispara',W/2,H/2+16)
      } else if(gameOver){
        ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff3355'; ctx.font='900 22px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=12; ctx.fillText('DESTRUIDO',W/2,H/2-10); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='700 12px JetBrains Mono'; ctx.fillText(`SCORE ${scoreL}  NIVEL ${level}`,W/2,H/2+12)
        ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='11px JetBrains Mono'; ctx.fillText('R / Click / Espacio para reiniciar',W/2,H/2+28)
      }
      ctx.restore()
    }
    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){ draw(true); return }
      if(gameOver){ draw(false); return }
      update(); draw(false)
    }
    loop()
    return()=>{ cancelAnimationFrame(raf); input.cleanup(); window.removeEventListener('keydown', onShootKey); c.removeEventListener('mousedown', onClickShoot)}
  },[])
  return <div className="flex flex-col items-center gap-3 w-full max-w-[480px]"><canvas ref={canvasRef} className="rounded-xl neon-border w-full aspect-[4/3] cursor-crosshair"/><div className="flex gap-2 w-full"><div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-cyan-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div><div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div></div><p className="text-[11px] text-white/50 font-mono">A/D/W/S o mouse • Espacio/Click dispara • Power: ≋ rapid ⋇ spread ⬢ shield</p></div>
}
