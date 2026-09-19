const pngToIco = require('png-to-ico').default || require('png-to-ico');
const fs=require('fs');
const path=require('path');
async function run(){
  const root='C:/Users/Wilme/neo-arcade';
  const files = [
    'public/icon-16.png',
    'public/icon-32.png',
    'public/icon-48.png',
    'public/icon-64.png',
    'public/favicon.png',
    'public/icon.png'
  ].map(p=>path.join(root,p));
  const buf = await pngToIco(files);
  fs.writeFileSync(path.join(root,'public/favicon.ico'), buf);
  fs.writeFileSync(path.join(root,'neo-arcade.ico'), buf);
  fs.writeFileSync(path.join(root,'public/neo-arcade.ico'), buf);
  console.log('Multi ICO generated', buf.length, 'with', files.length, 'sizes');
}
run().catch(e=>{ console.error(e); process.exit(1)})
