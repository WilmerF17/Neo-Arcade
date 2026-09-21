import fs from 'fs'
import { exec } from 'child_process'
import path from 'path'

const ROOT = path.resolve('C:/Users/Wilme/neo-arcade')
let timer = null
let pushing = false

function debouncePush(){
  if(timer) clearTimeout(timer)
  timer = setTimeout(async ()=>{
    if(pushing) return
    pushing = true
    console.log('\n[auto-push] Cambios detectados → build + commit + push...')
    exec('npm run build', { cwd: ROOT }, (err)=>{
      if(err){ console.error('[auto-push] build error', err.message); pushing=false; return }
      exec('git add -A', { cwd: ROOT }, ()=>{
        exec('git diff --cached --quiet', { cwd: ROOT }, (e, stdout, stderr)=>{
          // if no diff, skip
          if(e && e.code===0){ console.log('[auto-push] sin cambios para commit'); pushing=false; return }
          // if exit code 1 means has diff
          const msg = `auto: ${new Date().toISOString().slice(0,16)}`
          exec(`git commit -m "${msg}"`, { cwd: ROOT }, (err2)=>{
            if(err2){ console.log('[auto-push] nada que commitear'); pushing=false; return }
            exec('git push', { cwd: ROOT }, (err3, out)=>{
              if(err3) console.error('[auto-push] push error', err3.message)
              else console.log('[auto-push] ✅ Pushed', out?.slice(0,120))
              pushing=false
            })
          })
        })
      })
    })
  }, 2500)
}

console.log('[auto-push] 👀 Vigilando src/, public/, index.html, vite.config.ts — Ctrl+C para salir')
const watchPaths = ['src','public','index.html','vite.config.ts','package.json']
for(const p of watchPaths){
  const full = path.join(ROOT, p)
  try{
    fs.watch(full, { recursive: true }, debouncePush)
    console.log('  watching', p)
  }catch{
    // file watch
    try{ fs.watchFile(full, debouncePush) }catch{}
  }
}
// keep alive
setInterval(()=>{}, 1<<30)
