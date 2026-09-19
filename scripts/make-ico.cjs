const pngToIco = require('png-to-ico');
const fs=require('fs');
const path=require('path');
async function run(){
  const root='C:/Users/Wilme/neo-arcade';
  const sources = [
    'public/icon-master-1024.png',
    'public/icon.png',
    'public/favicon.png'
  ].map(p=>path.join(root,p));
  // use 256 and 512
  const buf = await pngToIco(sources);
  fs.writeFileSync(path.join(root,'public/favicon.ico'), buf);
  fs.writeFileSync(path.join(root,'neo-arcade.ico'), buf);
  fs.writeFileSync(path.join(root,'public/neo-arcade.ico'), buf);
  console.log('ICO generated', buf.length);
}
run().catch(e=>{ console.error(e); process.exit(1)})
