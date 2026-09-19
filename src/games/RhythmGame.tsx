import { useEffect, useRef, useState } from 'react'
import { setupCanvas, createInput, createParticlePool, playTone, bestKey, loadBest, saveBest } from './engine/elite'

type Note = { lane:number, y:number, hit:boolean, miss:boolean, t:number }
export default function RhythmGame({ onScore, isStarted }: { onScore:(s:number)=>void, isStarted?: boolean }){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0)
  const [level,setLevel]=useState(1)
  const [combo,setCombo]=useState(0)
  const [best,setBest]=useState(()=> loadBest(bestKey('rhythm'),0))
  const [acc,setAcc]=useState('—')
  const isStartedRef=useRef(isStarted); useEffect(()=>{isStartedRef.current=isStarted},[isStarted])
  const bestRef=useRef(best); useEffect(()=>{bestRef.current=best},[best])
  const onScoreRef=useRef(onScore); useEffect(()=>{onScoreRef.current=onScore},[onScore])

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    const {ctx,W,H}=setupCanvas(canvas,480,340)
    const input=createInput(canvas,W,H)
    const pool=createParticlePool(48)
    let raf=0, frame=0
    let scoreL=0, comboL=0, levelL=1
    let bpm= 104
    let notes:Note[]=[]
    let spawnAcc=0
    let perfect=0, good=0, miss=0
    const lanes=4
    const laneW=W/lanes
    const hitY=H-64
    const colors=['#00ffff','#ff00ff','#ffdd00','#00ff88']
    const keys=[false,false,false,false]
    const BK=bestKey('rhythm')
    let lastHitText='', lastHitT=0, hitColor='#fff'

    const keyMap:Record<string,number>={'a':0,'s':1,'k':2,'l':3,'arrowleft':0,'arrowdown':1,'arrowup':2,'arrowright':3}

    const tryHit=(lane:number)=>{
      let bestIdx=-1, bestDist=999
      for(let i=0;i<notes.length;i++){
        const n=notes[i]; if(n.lane!==lane||n.hit||n.miss) continue
        const d=Math.abs(n.y-hitY)
        if(d<28 && d<bestDist){ bestDist=d; bestIdx=i }
      }
      if(bestIdx!==-1){
        const n=notes[bestIdx]
        const d=Math.abs(n.y-hitY)
        n.hit=true
        if(d<8){ // perfect
          const pts= 50 + comboL*3 + levelL*4
          scoreL+=pts; perfect++; lastHitText='PERFECT!'; hitColor='#00ffff'; playTone(880,0.12,'square',0.14)
          for(let i=0;i<10;i++) pool.push({x: lane*laneW+laneW/2, y:hitY, vx:(Math.random()-0.5)*7, vy:(Math.random()-0.5)*7, life:1, c:'#ffffff', size:3})
        } else if(d<17){
          const pts=22 + comboL*2
          scoreL+=pts; good++; lastHitText='GOOD'; hitColor='#aaff00'; playTone(640,0.1,'sine',0.12)
          for(let i=0;i<6;i++) pool.push({x: lane*laneW+laneW/2, y:hitY, vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, life:1, c: colors[lane], size:2.5})
        } else {
          const pts=10
          scoreL+=pts; good++; lastHitText='OK'; hitColor='#ffdd88'; playTone(520,0.08,'triangle',0.1)
          for(let i=0;i<4;i++) pool.push({x: lane*laneW+laneW/2, y:hitY, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*4, life:1, c: colors[lane], size:2})
        }
        comboL++
        if(comboL%10===0 && levelL<10){ levelL++; bpm+=10; setLevel(levelL) }
        lastHitT=28
        if(scoreL>bestRef.current){ try{ saveBest(BK,scoreL)}catch{}; bestRef.current=scoreL; setBest(scoreL); onScoreRef.current(scoreL) }
        setScore(scoreL); setCombo(comboL)
        return
      }
      // miss press
      comboL=0; miss++; lastHitText='MISS'; hitColor='#ff3355'; lastHitT=18; playTone(160,0.18,'sawtooth',0.12)
      for(let i=0;i<5;i++) pool.push({x: lane*laneW+laneW/2,y:hitY,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:1,c:'#ff3355',size:2.2})
      setCombo(0)
    }

    const onKeyDown=(e:KeyboardEvent)=>{
      const lane=keyMap[e.key.toLowerCase()]
      if(lane===undefined) return
      if(keys[lane]) return
      keys[lane]=true
      tryHit(lane)
    }
    const onKeyUp=(e:KeyboardEvent)=>{
      const lane=keyMap[e.key.toLowerCase()]
      if(lane!==undefined) keys[lane]=false
    }
    window.addEventListener('keydown',onKeyDown); window.addEventListener('keyup',onKeyUp)

    // mouse/touch tap lane
    const handleTap=()=>{
      const lane=Math.min(lanes-1, Math.max(0, Math.floor(input.mouse.x / laneW)))
      tryHit(lane); keys[lane]=true; setTimeout(()=> keys[lane]=false,120)
    }
    let wasDown=false

    const loop=()=>{
      raf=requestAnimationFrame(loop)
      if(isStartedRef.current===false){
        // draw paused
      } else {
        frame++
        // beat sync: spawn every beat
        const speed= 2.9 + levelL*0.35
        const interval= Math.max(14, Math.round( (60/bpm)*60 ) ) // 60fps
        spawnAcc++
        if(spawnAcc>=interval){
          spawnAcc=0
          const count= Math.random()>0.78?2:1
          const used=new Set<number>()
          for(let i=0;i<count;i++){
            let lane=Math.floor(Math.random()*lanes)
            if(used.has(lane)) lane=(lane+1)%lanes
            used.add(lane)
            notes.push({lane, y:-18, hit:false, miss:false, t:frame})
          }
        }
        // move
        notes.forEach(n=>{ if(!n.hit) n.y+=speed })
        // auto miss
        notes.forEach(n=>{
          if(!n.hit && !n.miss && n.y> hitY+30){ n.miss=true; comboL=0; miss++; lastHitText='MISS'; hitColor='#ff3355'; lastHitT=18; setCombo(0); playTone(140,0.12,'square',0.09) }
        })
        notes=notes.filter(n=> !(n.hit && n.y>hitY+36) && !(n.miss && n.y>H+18) && n.y < H+30 )
        if(input.mouse.down && !wasDown) handleTap()
        wasDown=input.mouse.down
        if(lastHitT>0) lastHitT--
        // accuracy text
        const tot=perfect+good+miss
        const accVal= tot? `${Math.round((perfect*1+good*0.6)/tot*100)}%` : '—'
        if(frame%12===0) setAcc(accVal)
      }
      pool.update()
      // draw
      ctx.fillStyle='#080a14'; ctx.fillRect(0,0,W,H)
      // grid
      ctx.strokeStyle='rgba(255,255,255,0.03)'; for(let i=0;i<W;i+=40){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke()}
      // beat pulse bg
      const pulse = Math.sin(frame* bpm/60 * Math.PI*0.5)*0.04
      ctx.fillStyle=`rgba(0,255,255,${0.035+pulse})`; ctx.fillRect(0,0,W,H)
      // lanes
      for(let i=0;i<lanes;i++){
        ctx.fillStyle= keys[i]? `${colors[i]}20` : 'rgba(255,255,255,0.035)'
        ctx.fillRect(i*laneW+1,0,laneW-2,H)
        ctx.strokeStyle= keys[i]? colors[i] : 'rgba(255,255,255,0.06)'; ctx.lineWidth=1
        ctx.strokeRect(i*laneW+0.5,0.5,laneW-1,H-1)
        // key label
        ctx.fillStyle= keys[i]? colors[i] : 'rgba(255,255,255,0.45)'
        ctx.font='700 11px Orbitron'; ctx.textAlign='center'
        ctx.fillText(['A','S','K','L'][i], i*laneW+laneW/2, H-14)
        // little speaker icon
        if(keys[i]){
          ctx.fillStyle=colors[i]; ctx.globalAlpha=0.22; ctx.beginPath(); ctx.arc(i*laneW+laneW/2, hitY, 24,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1
        }
      }
      // hit line with glow
      ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fillRect(0,hitY-18,W,36)
      ctx.strokeStyle= lastHitText==='PERFECT!'?'#00ffff':'rgba(255,255,255,0.22)'; ctx.setLineDash([6,6]); ctx.lineWidth=1.2
      ctx.shadowColor= lastHitText==='PERFECT!'?'#00ffff':'transparent'; ctx.shadowBlur= lastHitText==='PERFECT!'?12:0
      ctx.beginPath(); ctx.moveTo(0,hitY); ctx.lineTo(W,hitY); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur=0
      // notes with glow + approach ring
      notes.forEach(n=>{
        if(n.hit || n.miss) return
        const x=n.lane*laneW
        const y=n.y
        const dist=Math.abs(y-hitY)
        const glow = dist<18? 16: 7
        // approach scaling
        const scale = 0.92 + Math.min(1, Math.max(0, (H - y)/H))*0.08
        ctx.save(); ctx.translate(x+laneW/2, y); ctx.scale(scale,scale)
        ctx.fillStyle=colors[n.lane]; ctx.shadowColor=colors[n.lane]; ctx.shadowBlur=glow
        ctx.beginPath(); (ctx as any).roundRect(-laneW/2+12, -12, laneW-24, 24, 8); ctx.fill(); ctx.shadowBlur=0
        ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.beginPath(); (ctx as any).roundRect(-laneW/2+16, -6, laneW-32, 6, 3); ctx.fill()
        // inner shine
        ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fillRect(-laneW/2+18, -10, laneW-36, 2)
        ctx.restore()
        // timing window hint when close
        if(dist<22){
          ctx.strokeStyle= dist<8?'#00ffff':'#aaff00'; ctx.lineWidth=1; ctx.globalAlpha=0.35; ctx.beginPath(); ctx.arc(x+laneW/2, hitY, 14+ (18-dist),0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1
        }
      })
      pool.draw(ctx)
      // combo & hit text
      if(comboL>2){
        ctx.fillStyle='#fff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.shadowColor='#00ffff'; ctx.shadowBlur=10; ctx.fillText(`${comboL}x COMBO`,W/2, 34); ctx.shadowBlur=0
      }
      if(lastHitT>0){
        ctx.fillStyle=hitColor; ctx.font='900 14px Orbitron'; ctx.textAlign='center'; ctx.globalAlpha=Math.min(1, lastHitT/18)
        ctx.fillText(lastHitText, W/2, 56); ctx.globalAlpha=1
      }
      // BPM indicator
      ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='10px JetBrains Mono'; ctx.textAlign='left'; ctx.fillText(`BPM ${bpm} • LVL ${levelL}`,10,16)
      ctx.textAlign='right'; ctx.fillText(`PERFECT ${perfect} GOOD ${good} MISS ${miss}`,W-10,16)
      if(isStartedRef.current===false){
        ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff00ff'; ctx.font='900 18px Orbitron'; ctx.textAlign='center'; ctx.fillText('PAUSA',W/2,H/2)
      }
    }
    loop()
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('keydown',onKeyDown); window.removeEventListener('keyup',onKeyUp); input.cleanup() }
  },[])

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[480px]">
      <canvas ref={canvasRef} className="rounded-xl neon-border-pink w-full aspect-[3/2] cursor-pointer" width={480} height={340}/>
      <div className="flex gap-2 w-full">
        <div className="flex-1 glass rounded-lg px-3 py-2 flex justify-between"><span className="text-xs text-fuchsia-300 font-mono">SCORE</span><span className="font-black text-white" style={{fontFamily:'Orbitron'}}>{score}</span></div>
        <div className="glass rounded-lg px-3 py-2 flex items-center gap-2"><span className="text-xs font-mono text-white/60">COMBO</span><span className="font-black" style={{color: combo>6?'#00ffff': combo>3?'#ffdd00':'#fff', fontFamily:'Orbitron'}}>{combo}</span></div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Lv{level} {acc}</div>
        <div className="glass rounded-lg px-3 py-2 text-xs font-mono text-white/60">Best {best}</div>
      </div>
      <p className="text-[11px] text-white/50 font-mono text-center">4 carriles beat-sync • PERFECT/GOOD/MISS • Combo infinito • BPM sube por nivel</p>
    </div>
  )
}
