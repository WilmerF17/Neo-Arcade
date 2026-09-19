// Elite Engine v4 - shared utilities for NEO ARCADE 2026
// Maximum potential: 60fps, DPR, deltaTime, input unify, particles pool, scoring, audio

export type Particle = { x:number, y:number, vx:number, vy:number, life:number, c:string, size?:number }

export function setupCanvas(canvas: HTMLCanvasElement, W:number, H:number){
  const dpr = Math.min(2, window.devicePixelRatio||1)
  canvas.width = Math.round(W*dpr)
  canvas.height = Math.round(H*dpr)
  canvas.style.width = W+'px'
  canvas.style.height = H+'px'
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr,0,0,dpr,0,0)
  return { ctx, W, H, dpr }
}

export function createParticlePool(max=48){
  let pool: Particle[]=[]
  return {
    get:()=>pool,
    set:(arr:Particle[])=>{ pool=arr },
    push(p:Particle){
      if(pool.length>=max) pool = pool.slice(-Math.floor(max*0.6))
      pool.push(p)
    },
    pushMany(arr:Particle[]){
      for(const p of arr) this.push(p)
    },
    update(){
      pool = pool.filter(p=>p.life>0)
      for(const p of pool){ p.x+=p.vx; p.y+=p.vy; p.life-=0.04; p.vx*=0.99; p.vy+=0.18 }
    },
    draw(ctx:CanvasRenderingContext2D){
      for(const p of pool){
        ctx.globalAlpha=Math.max(0,p.life)
        ctx.fillStyle=p.c
        ctx.beginPath(); ctx.arc(p.x,p.y, p.size||3,0,Math.PI*2); ctx.fill()
      }
      ctx.globalAlpha=1
    },
    clear(){ pool=[] }
  }
}

export function createInput(canvas:HTMLCanvasElement, W:number, H:number){
  const keys:Record<string,boolean>={}
  const onKeyD=(e:KeyboardEvent)=> keys[e.key.toLowerCase()]=true
  const onKeyU=(e:KeyboardEvent)=> keys[e.key.toLowerCase()]=false
  window.addEventListener('keydown', onKeyD)
  window.addEventListener('keyup', onKeyU)

  let mouse={x:W/2,y:H/2,down:false}
  const toCanvas=(clientX:number,clientY:number)=>{
    const r=canvas.getBoundingClientRect()
    return { x:(clientX - r.left)*(W/r.width), y:(clientY - r.top)*(H/r.height) }
  }
  const onMouseMove=(e:MouseEvent)=>{ const p=toCanvas(e.clientX,e.clientY); mouse.x=p.x; mouse.y=p.y }
  const onMouseDown=(e:MouseEvent)=>{ const p=toCanvas(e.clientX,e.clientY); mouse.x=p.x; mouse.y=p.y; mouse.down=true }
  const onMouseUp=()=> mouse.down=false
  const onTouchMove=(e:TouchEvent)=>{ if(e.touches[0]){ const p=toCanvas(e.touches[0].clientX,e.touches[0].clientY); mouse.x=p.x; mouse.y=p.y; e.preventDefault() } }
  const onTouchStart=(e:TouchEvent)=>{ if(e.touches[0]){ const p=toCanvas(e.touches[0].clientX,e.touches[0].clientY); mouse.x=p.x; mouse.y=p.y; mouse.down=true; e.preventDefault() } }
  const onTouchEnd=()=> mouse.down=false
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('touchmove', onTouchMove, {passive:false} as any)
  canvas.addEventListener('touchstart', onTouchStart, {passive:false} as any)
  window.addEventListener('touchend', onTouchEnd)

  const cleanup=()=>{
    window.removeEventListener('keydown', onKeyD)
    window.removeEventListener('keyup', onKeyU)
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('touchmove', onTouchMove as any)
    canvas.removeEventListener('touchstart', onTouchStart as any)
    window.removeEventListener('touchend', onTouchEnd)
  }
  return { keys, mouse, cleanup }
}

export function playTone(freq=880, dur=0.12, type:OscillatorType='square', vol=0.14){
  try{
    const ctx=new (window.AudioContext||(window as any).webkitAudioContext)()
    const o=ctx.createOscillator(), g=ctx.createGain()
    o.type=type; o.frequency.value=freq; o.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+dur)
    o.start(); o.stop(ctx.currentTime+dur)
  }catch{}
}

export function bestKey(name:string){ return `neo_${name}_best` }

export function loadBest(key:string, fallback=0){
  try{ return Number(localStorage.getItem(key)||fallback) }catch{ return fallback }
}
export function saveBest(key:string, val:number){
  try{ localStorage.setItem(key,String(val)) }catch{}
}

// draw helpers
export function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  if((ctx as any).roundRect){ (ctx as any).roundRect(x,y,w,h,r); return }
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath()
}

export function neonGlow(ctx:CanvasRenderingContext2D, color:string, blur=14){
  ctx.shadowColor=color; ctx.shadowBlur=blur
}
