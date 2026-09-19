import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

const statsPath = path.resolve('arcade-stats.json')
const publicStatsPath = path.resolve('public/arcade-stats.json')

function ensureStats(){
  if(!fs.existsSync(statsPath)){
    const init = {
      level: 1, xp: 0, coins: 250, streak: 1,
      highScores: { snake:0,breakout:0,shooter:0,memory:0,stack:0,runner:0,rhythm:0,fusion:0,tetris:0,flappy:0,miner:0,words:0,aim:0,maze:0,plinko:0,pong:0,color:0,dodge:0,typing:0,gravity:0,slide:0,defense:0,rider:0,hex:0,chess:0,frogger:0,pinball:0,bubble:0,racing:0,ninja:0,harvest:0,jetpack:0,match:0,survival:0,laser:0,invaders:0,dungeon:0,snakeduel:0,puzzlebox:0,memoryultra:0,towerelite:0,flappyultra:0,snakeultra:0,pongultra:0,racingelite:0,tron:0,sudoku:0,chessultra:0,asteroidsultra:0,wordleultra:0 },
      plays: { snake:0,breakout:0,shooter:0,memory:0,stack:0,runner:0,rhythm:0,fusion:0,tetris:0,flappy:0,miner:0,words:0,aim:0,maze:0,plinko:0,pong:0,color:0,dodge:0,typing:0,gravity:0,slide:0,defense:0,rider:0,hex:0,chess:0,frogger:0,pinball:0,bubble:0,racing:0,ninja:0,harvest:0,jetpack:0,match:0,survival:0,laser:0,invaders:0,dungeon:0,snakeduel:0,puzzlebox:0,memoryultra:0,towerelite:0,flappyultra:0,snakeultra:0,pongultra:0,racingelite:0,tron:0,sudoku:0,chessultra:0,asteroidsultra:0,wordleultra:0 },
      achUnlocked: {},
      lastUpdate: new Date().toISOString()
    }
    fs.writeFileSync(statsPath, JSON.stringify(init,null,2))
    try{ fs.mkdirSync(path.dirname(publicStatsPath),{recursive:true}); fs.writeFileSync(publicStatsPath, JSON.stringify(init,null,2)) }catch{}
  }
}
ensureStats()

function arcadeSyncPlugin(){
  return {
    name: 'arcade-sync',
    configureServer(server: any){
      server.middlewares.use((req:any, res:any, next:any)=>{
        if(req.url?.startsWith('/api/stats')){
          ensureStats()
          if(req.method==='GET'){
            const data = fs.readFileSync(statsPath,'utf-8')
            res.setHeader('Content-Type','application/json')
            res.setHeader('Access-Control-Allow-Origin','*')
            res.end(data)
            // Log terminal sync read
            const j=JSON.parse(data)
            console.log(`\x1b[36m[ARCADE SYNC]\x1b[0m GET /api/stats → nivel ${j.level} xp ${j.xp}/${j.level*250} monedas ${j.coins} total ${Object.values(j.highScores as any).reduce((a:number,b:any)=>a+b,0)}`)
            return
          }
          if(req.method==='POST'){
            let body=''
            req.on('data',(c:any)=> body+=c)
            req.on('end',()=>{
              try{
                const incoming=JSON.parse(body)
                incoming.lastUpdate=new Date().toISOString()
                fs.writeFileSync(statsPath, JSON.stringify(incoming,null,2))
                try{ fs.writeFileSync(publicStatsPath, JSON.stringify(incoming,null,2)) }catch{}
                res.setHeader('Content-Type','application/json')
                res.setHeader('Access-Control-Allow-Origin','*')
                res.end(JSON.stringify({ok:true}))
                // Terminal log with colors showing what changed
                const total=Object.values(incoming.highScores as any).reduce((a:number,b:any)=>a+b,0)
                const playsDistinct=Object.values(incoming.plays as any).filter((v:any)=>v>0).length
                console.log(`\x1b[35m[ARCADE SYNC]\x1b[0m POST /api/stats → \x1b[32mNivel ${incoming.level}\x1b[0m \x1b[33m${incoming.xp}/${incoming.level*250} XP\x1b[0m \x1b[33m💰${incoming.coins}\x1b[0m HS:${total} Plays:${playsDistinct}/50`)
                if(incoming._event) console.log(`  â†³ Evento: ${incoming._event}`)
              }catch(e){
                res.statusCode=400; res.end(JSON.stringify({error:String(e)}))
              }
            })
            return
          }
          if(req.method==='OPTIONS'){
            res.setHeader('Access-Control-Allow-Origin','*')
            res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')
            res.setHeader('Access-Control-Allow-Headers','Content-Type')
            res.end()
            return
          }
        }
        next()
      })
    },
    configurePreviewServer(server:any){
      // same for preview
      server.middlewares.use((req:any, res:any, next:any)=>{
        if(req.url?.startsWith('/api/stats')){
          ensureStats()
          if(req.method==='GET'){
            const data=fs.readFileSync(statsPath,'utf-8')
            res.setHeader('Content-Type','application/json')
            res.setHeader('Access-Control-Allow-Origin','*')
            res.end(data)
            const j=JSON.parse(data)
            console.log(`\x1b[36m[ARCADE SYNC - PREVIEW]\x1b[0m GET → nivel ${j.level} 💰${j.coins}`)
            return
          }
          if(req.method==='POST'){
            let body=''; req.on('data',(c:any)=> body+=c)
            req.on('end',()=>{
              try{
                const incoming=JSON.parse(body); incoming.lastUpdate=new Date().toISOString()
                fs.writeFileSync(statsPath, JSON.stringify(incoming,null,2))
                try{ fs.writeFileSync(publicStatsPath, JSON.stringify(incoming,null,2)) }catch{}
                res.setHeader('Content-Type','application/json'); res.setHeader('Access-Control-Allow-Origin','*')
                res.end(JSON.stringify({ok:true}))
                console.log(`\x1b[35m[ARCADE SYNC - PREVIEW]\x1b[0m POST → Nivel ${incoming.level} 💰${incoming.coins}`)
              }catch(e){ res.statusCode=400; res.end(JSON.stringify({error:String(e)})) }
            })
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  base: '/neo-arcade/',
  plugins: [react(), arcadeSyncPlugin(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico','favicon.png','icon-*.png','icon.png','icon-master-1024.png','apple-touch-icon.png'],
    manifest: {
      name: 'NEO ARCADE — Sala Inmersiva 2026',
      short_name: 'NEO ARCADE',
      description: '50 cabinas RGB • 2026 • Sala inmersiva neón. 50 juegos ELITE 60fps, progreso, logros y desafíos diarios.',
      start_url: '/neo-arcade/',
      scope: '/neo-arcade/',
      id: '/neo-arcade/',
      display: 'standalone',
      display_override: ['window-controls-overlay','standalone','browser'],
      orientation: 'any',
      background_color: '#040510',
      theme_color: '#00ffff',
      lang: 'es',
      categories: ['games','arcade','entertainment'],
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-16.png', sizes: '16x16', type: 'image/png', purpose: 'any' },
        { src: '/icon-32.png', sizes: '32x32', type: 'image/png', purpose: 'any' },
        { src: '/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
        { src: '/icon-64.png', sizes: '64x64', type: 'image/png', purpose: 'any' },
        { src: '/favicon.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
        { src: '/icon-master-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }
      ],
      shortcuts: [
        { name: 'Jugar Ahora', short_name: 'Jugar', description: 'Entra directo al arcade', url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        { name: 'Ranking', short_name: 'Ranking', description: 'Ver logros y progreso', url: '/?logros=1', icons: [{ src: '/icon-192.png', sizes: '192x192' }] }
      ],
      screenshots: [
        { src: '/icon-master-1024.png', sizes: '1024x1024', type: 'image/png', form_factor: 'wide', label: 'NEO ARCADE — 50 cabinas RGB neón' },
        { src: '/icon.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow', label: 'NEO ARCADE en móvil' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
      runtimeCaching: [
        { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } } },
        { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } } }
      ]
    },
    devOptions: { enabled: false }
  })],
  server: { port: 3000, open: false },
  preview: { port: 3000 }
})


