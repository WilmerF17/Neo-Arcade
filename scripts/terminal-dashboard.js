#!/usr/bin/env node
// NEO ARCADE — Terminal Dashboard (sincronizado con /api/stats y arcade-stats.json)
// Muestra en terminal el mismo estado que la página y se actualiza en vivo en ambas direcciones.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const statsPath = path.resolve(__dirname, '..', 'arcade-stats.json')
const publicPath = path.resolve(__dirname, '..', 'public', 'arcade-stats.json')

const GAMES = {
  snake:'NEON SERPENT', breakout:'CYBER BRICKS', shooter:'VOID STRIKE', memory:'MATRIX MIND', stack:'NEON TOWER',
  runner:'HYPER DASH', rhythm:'PULSE BEAT', fusion:'FUSION 2048', tetris:'QUANTUM STACK', flappy:'NEON GLIDE',
  miner:'ASTRO MINER', words:'CIPHER CODE', aim:'AIM LAB', maze:'PHANTOM MAZE', plinko:'PLINKO DROP',
  pong:'NEON PONG', color:'CHROMA FUSION', dodge:'DODGE STORM', typing:'NEON TYPE', gravity:'GRAVITY FLIP',
  slide:'TILE SHIFT', defense:'LASER GRID', rider:'NEON RIDER', hex:'HEXA MERGE', chess:'QUANTUM TACTICS'
}

function load(){
  try{
    const raw = fs.readFileSync(statsPath,'utf-8')
    return JSON.parse(raw)
  }catch{ return null }
}

function fmt(n){ return Number(n||0).toLocaleString() }

function render(){
  const data = load()
  if(!data){
    console.log('\x1b[31m[ERROR] No se pudo leer arcade-stats.json\x1b[0m')
    return
  }
  const total = Object.values(data.highScores||{}).reduce((a,b)=> a+Number(b),0)
  const distinct = Object.values(data.plays||{}).filter(v=>v>0).length
  const totalPlays = Object.values(data.plays||{}).reduce((a,b)=>a+Number(b),0)
  const pct = Math.min(100, (data.xp/(data.level*250))*100)

  // Clear screen
  console.clear()
  console.log('\x1b[36m╔════════════════════════════════════════════════════════════════╗\x1b[0m')
  console.log('\x1b[36m║\x1b[0m \x1b[1m\x1b[35mNEO ARCADE \x1b[36m— TERMINAL DASHBOARD\x1b[0m \x1b[2m(sincronizado con la página)\x1b[0m          \x1b[36m║\x1b[0m')
  console.log('\x1b[36m║\x1b[0m \x1b[2m25 cabinas • RGB • 2026 • http://127.0.0.1:3000\x1b[0m                  \x1b[36m║\x1b[0m')
  console.log('\x1b[36m╚════════════════════════════════════════════════════════════════╝\x1b[0m')
  console.log('')
  console.log(`\x1b[33m● SYNC OK\x1b[0m  Última actualización: \x1b[2m${data.lastUpdate||'-'}\x1b[0m  \x1b[90m(archivo: arcade-stats.json)\x1b[0m`)
  console.log('')
  // Player
  console.log('\x1b[1m── JUGADOR ──────────────────────────────────────────────────\x1b[0m')
  const barLen=28
  const filled=Math.round(pct/100*barLen)
  const bar='█'.repeat(filled)+'░'.repeat(barLen-filled)
  console.log(`  Nivel \x1b[36m${data.level}\x1b[0m  XP \x1b[33m${data.xp}/${data.level*250}\x1b[0m  ${bar} ${Math.round(pct)}%`)
  console.log(`  Monedas \x1b[33m💰 ${fmt(data.coins)}\x1b[0m   Racha \x1b[31m🔥 ${data.streak} días\x1b[0m   TotalScore \x1b[36m${fmt(total)}\x1b[0m`)
  console.log(`  Partidas ${totalPlays}  Juegos tocados \x1b[32m${distinct}/25\x1b[0m`)
  console.log('')
  // Highscores table
  console.log('\x1b[1m── HIGHSCORES (misma data que la página) ─────────────────────\x1b[0m')
  const sorted = Object.entries(data.highScores||{}).sort((a,b)=> Number(b[1])-Number(a[1]))
  let line=''
  sorted.forEach(([id, score], i)=>{
    const name=(GAMES[id]||id).padEnd(16).slice(0,16)
    const sc=String(score).padStart(5)
    const col= Number(score)>0? '\x1b[32m':'\x1b[90m'
    line+= `${col}${name} ${sc}\x1b[0m  `
    if((i+1)%3===0){ console.log('  '+line); line='' }
  })
  if(line) console.log('  '+line)
  console.log('')
  // Plays
  console.log('\x1b[1m── PLAYS ──────────────────────────────────────────────────\x1b[0m')
  let pline=''
  Object.entries(data.plays||{}).forEach(([id, cnt], i)=>{
    if(Number(cnt)>0){
      pline+= `\x1b[36m${(GAMES[id]||id).slice(0,10)}:${cnt}\x1b[0m `
    }
  })
  console.log('  '+(pline||'\x1b[90m(aún sin partidas)\x1b[0m'))
  console.log('')
  // Achievements
  const achCount=Object.keys(data.achUnlocked||{}).length
  console.log(`\x1b[1m── LOGROS ──────────────────────────────────────────────────\x1b[0m  \x1b[33m${achCount} desbloqueados\x1b[0m`)
  if(achCount>0){
    const list=Object.keys(data.achUnlocked).slice(0,12).join(', ')
    console.log('  \x1b[32m'+list+(achCount>12? ` +${achCount-12} más`:'')+'\x1b[0m')
  } else console.log('  \x1b[90m— juega para desbloquear —\x1b[0m')
  console.log('')
  console.log('\x1b[90m──────────────────────────────────────────────────────────────\x1b[0m')
  console.log('\x1b[2m  Cambios en la página → se ven aquí en <1s (watch). Cambios aquí → se ven en la página (poll 3s).\x1b[0m')
  console.log('\x1b[2m  Comandos: [r] reset stats  [c+50] monedas  [q] salir  [h] help\x1b[0m')
  console.log('\x1b[90m──────────────────────────────────────────────────────────────\x1b[0m')
}

// Watch file
let debounce=null
function watch(){
  try{
    fs.watch(statsPath, {persistent:true}, ()=>{
      if(debounce) clearTimeout(debounce)
      debounce=setTimeout(render, 120)
    })
  }catch(e){
    console.log('watch error',e)
  }
  // fallback polling cada 1.5s por si watch no dispara (Windows)
  setInterval(render, 1500)
}

// Interactivo básico en terminal
function setupInput(){
  if(!process.stdin.isTTY) return
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (k)=>{
    if(k==='\u0003' || k==='q'){ // Ctrl+C or q
      console.log('\n\x1b[33mCerrando dashboard...\x1b[0m')
      process.exit(0)
    }
    if(k==='r'){
      try{
        const data=load()
        if(!data) return
        // reset
        Object.keys(data.highScores).forEach(k=> data.highScores[k]=0)
        Object.keys(data.plays).forEach(k=> data.plays[k]=0)
        data.level=1; data.xp=0; data.coins=250; data.streak=1; data.achUnlocked={}; data.lastUpdate=new Date().toISOString()
        fs.writeFileSync(statsPath, JSON.stringify(data,null,2))
        try{ fs.writeFileSync(publicPath, JSON.stringify(data,null,2)) }catch{}
        console.log('\x1b[31m[RESET] Stats reiniciados desde terminal → se verá en la página en ~3s\x1b[0m')
      }catch(e){ console.log('reset error',e)}
    }
    if(k==='c'){
      try{
        const data=load(); data.coins+=50; data.lastUpdate=new Date().toISOString()
        fs.writeFileSync(statsPath, JSON.stringify(data,null,2))
        try{ fs.writeFileSync(publicPath, JSON.stringify(data,null,2)) }catch{}
        console.log('\x1b[33m[+50 monedas] desde terminal\x1b[0m')
      }catch{}
    }
    if(k==='h'){
      console.log('\n\x1b[36mAyuda:\x1b[0m r=reset  c=+50 monedas  q=salir  (cambios se reflejan en http://127.0.0.1:3000)\n')
    }
  })
}

console.log('\x1b[36m[NEO ARCADE]\x1b[0m Iniciando terminal dashboard...')
render()
watch()
setupInput()
