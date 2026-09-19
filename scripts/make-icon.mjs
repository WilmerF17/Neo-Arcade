import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 for PNG
function crc32(buf){
  let c = 0xffffffff;
  for(let i=0;i<buf.length;i++){
    c ^= buf[i];
    for(let k=0;k<8;k++) c = (c>>>1) ^ (0xEDB88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data){
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const crc = Buffer.alloc(4); 
  const cc = Buffer.concat([t, data]);
  let c = 0xffffffff;
  for(let i=0;i<cc.length;i++){ c ^= cc[i]; for(let k=0;k<8;k++) c = (c>>>1) ^ (0xEDB88320 & -(c & 1)); }
  crc.writeUInt32BE((c ^ 0xffffffff)>>>0,0);
  return Buffer.concat([len, t, data, crc]);
}
function toPNG(w,h,rgba){
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const ihdrChunk = chunk('IHDR', ihdr);
  // IDAT: each scanline prefixed with 0 (no filter)
  const raw = Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){
    raw[y*(w*4+1)]=0;
    for(let x=0;x<w;x++){
      const si = (y*w+x)*4;
      const di = y*(w*4+1)+1 + x*4;
      raw[di]=rgba[si]; raw[di+1]=rgba[si+1]; raw[di+2]=rgba[si+2]; raw[di+3]=rgba[si+3];
    }
  }
  const comp = zlib.deflateSync(raw);
  const idat = chunk('IDAT', comp);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idat, iend]);
}

function lerp(a,b,t){ return a + (b-a)*t; }
function lerpColor(c1,c2,t){ return [Math.round(lerp(c1[0],c2[0],t)), Math.round(lerp(c1[1],c2[1],t)), Math.round(lerp(c1[2],c2[2],t))]; }

// distance to line segment
function distToSeg(px,py, x1,y1,x2,y2){
  const dx=x2-x1, dy=y2-y1;
  const l2=dx*dx+dy*dy;
  if(l2===0) return Math.hypot(px-x1, py-y1);
  let t=((px-x1)*dx + (py-y1)*dy)/l2;
  t=Math.max(0, Math.min(1,t));
  const sx=x1+t*dx, sy=y1+t*dy;
  return Math.hypot(px-sx, py-sy);
}
function insideRoundedRect(x,y, rx,ry,rw,rh, rad){
  // check if point inside rounded rect
  if(x < rx+rad && y < ry+rad) return (x - (rx+rad))**2 + (y - (ry+rad))**2 <= rad*rad || (x>=rx+rad || y>=ry+rad) && x>=rx && x<=rx+rw && y>=ry && y<=ry+rh;
  if(x > rx+rw-rad && y < ry+rad) return (x - (rx+rw-rad))**2 + (y - (ry+rad))**2 <= rad*rad || true;
  if(x < rx+rad && y > ry+rh-rad) return (x - (rx+rad))**2 + (y - (ry+rh-rad))**2 <= rad*rad || true;
  if(x > rx+rw-rad && y > ry+rh-rad) return (x - (rx+rw-rad))**2 + (y - (ry+rh-rad))**2 <= rad*rad || true;
  // simplified: if inside bounds and not in corner outside arc
  if(x<rx || x>rx+rw || y<ry || y>ry+rh) return false;
  if(x<rx+rad && y<ry+rad) return (x-(rx+rad))**2+(y-(ry+rad))**2 <= rad*rad;
  if(x>rx+rw-rad && y<ry+rad) return (x-(rx+rw-rad))**2+(y-(ry+rad))**2 <= rad*rad;
  if(x<rx+rad && y>ry+rh-rad) return (x-(rx+rad))**2+(y-(ry+rh-rad))**2 <= rad*rad;
  if(x>rx+rw-rad && y>ry+rh-rad) return (x-(rx+rw-rad))**2+(y-(ry+rh-rad))**2 <= rad*rad;
  return true;
}
function distToRoundedRect(x,y, rx,ry,rw,rh, rad){
  // signed distance: 0 inside, positive outside; approximate
  // if inside, distance to edge
  let closestDist = Infinity;
  // For simplicity brute: find min distance to 4 edges + arcs
  // Check if inside
  const inside = (()=> {
    if(x<rx || x>rx+rw || y<ry || y>ry+rh) return false;
    if(x<rx+rad && y<ry+rad) return (x-(rx+rad))**2+(y-(ry+rad))**2 <= rad*rad || (x>=rx+rad || y>=ry+rad);
    if(x>rx+rw-rad && y<ry+rad) return (x-(rx+rw-rad))**2+(y-(ry+rad))**2 <= rad*rad || (x<=rx+rw-rad || y>=ry+rad);
    if(x<rx+rad && y>ry+rh-rad) return (x-(rx+rad))**2+(y-(ry+rh-rad))**2 <= rad*rad || (x>=rx+rad || y<=ry+rh-rad);
    if(x>rx+rw-rad && y>ry+rh-rad) return (x-(rx+rw-rad))**2+(y-(ry+rh-rad))**2 <= rad*rad || (x<=rx+rw-rad || y<=ry+rh-rad);
    return true;
  })();
  if(inside){
    // distance to edge
    let d1 = x - rx;
    let d2 = rx+rw - x;
    let d3 = y - ry;
    let d4 = ry+rh - y;
    let d = Math.min(d1,d2,d3,d4);
    // adjust for corners
    if(x<rx+rad && y<ry+rad){
      const cd = Math.hypot(x-(rx+rad), y-(ry+rad));
      if(cd > rad) d = Math.min(d, cd - rad);
      else d = Math.min(d, rad - cd);
    }
    return -d; // negative inside
  } else {
    // outside: distance to rect
    let dx = 0, dy=0;
    if(x<rx) dx=rx-x; else if(x>rx+rw) dx=x-(rx+rw);
    if(y<ry) dy=ry-y; else if(y>ry+rh) dy=y-(ry+rh);
    if(dx===0 && dy===0){
      // in corner cut area
      if(x<rx+rad && y<ry+rad){
        const cd = Math.hypot(x-(rx+rad), y-(ry+rad));
        return cd - rad;
      }
      if(x>rx+rw-rad && y<ry+rad){
        const cd = Math.hypot(x-(rx+rw-rad), y-(ry+rad));
        return cd - rad;
      }
      if(x<rx+rad && y>ry+rh-rad){
        const cd = Math.hypot(x-(rx+rad), y-(ry+rh-rad));
        return cd - rad;
      }
      if(x>rx+rw-rad && y>ry+rh-rad){
        const cd = Math.hypot(x-(rx+rw-rad), y-(ry+rh-rad));
        return cd - rad;
      }
      return Math.min(dx,dy);
    }
    if(dx===0) return dy;
    if(dy===0) return dx;
    return Math.hypot(dx,dy);
  }
}

function generate(size){
  const w=size, h=size;
  const rgba = new Uint8Array(w*h*4);
  // fill transparent
  for(let i=0;i<rgba.length;i++) rgba[i]=0;

  const m = Math.round(size*0.0625);
  const rad = Math.round(size*0.18);
  const rw = size - m*2;
  const rh = rw;
  const rx=m, ry=m;

  // colors
  const bgTop = [12,14,36]; // #0C0E24
  const bgBottom = [4,5,16]; // #040510
  const borderCyan = [0,255,255];
  const borderFuchsia = [255,0,255];

  // N geometry scaled to size
  // For 512, N bars 70w, diagonal thickness 68
  const scale = size/512;
  const leftX = 140*scale, leftW=70*scale, leftY=130*scale, leftH=252*scale;
  const rightX=302*scale, rightW=70*scale, rightY=130*scale, rightH=252*scale;
  const diagX1=210*scale, diagY1=130*scale, diagX2=302*scale, diagY2=382*scale;
  const diagThick = 68*scale;
  const halfThick = diagThick/2;

  // accent line
  const lineW = 195*scale, lineH=7*scale, lineX=(size-lineW)/2, lineY=358*scale;

  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const idx=(y*w+x)*4;
      const sd = distToRoundedRect(x+0.5,y+0.5, rx,ry,rw,rh, rad);
      let inside = sd <= 0;
      let borderDist = Math.abs(sd);
      let alpha=255, r=0,g=0,b=0;

      if(inside){
        // background vertical gradient
        const t = (y - ry)/rh; // 0 top 1 bottom
        const bg = lerpColor(bgTop, bgBottom, Math.max(0,Math.min(1,t)));
        r=bg[0]; g=bg[1]; b=bg[2];
        // subtle top highlight: add cyan glow at top
        if(t<0.45){
          const hl = (0.45 - t)/0.45; // 1 at top
          const add = hl*18; // subtle
          r = Math.min(255, r + add*0.2);
          g = Math.min(255, g + add*0.9);
          b = Math.min(255, b + add*0.9);
        }
        // border glow inside (1-6px from edge)
        if(borderDist < 6*scale){
          const t2 = 1 - borderDist/(6*scale);
          // blend border color along perimeter: angle based on position
          const ang = Math.atan2(y - (ry+rh/2), x - (rx+rw/2)); // -PI to PI
          const hueT = (ang + Math.PI)/(2*Math.PI); // 0-1
          // cyan to fuchsia around
          const bc = lerpColor(borderCyan, borderFuchsia, (Math.sin(hueT*Math.PI*2 + 0.5)+1)/2);
          const mix = t2*0.45;
          r = Math.round(r*(1-mix) + bc[0]*mix);
          g = Math.round(g*(1-mix) + bc[1]*mix);
          b = Math.round(b*(1-mix) + bc[2]*mix);
        }
        // Check N shape
        const inLeft = x>=leftX && x<=leftX+leftW && y>=leftY && y<=leftY+leftH;
        const inRight = x>=rightX && x<=rightX+rightW && y>=rightY && y<=rightY+rightH;
        const dDiag = distToSeg(x+0.5,y+0.5, diagX1,diagY1, diagX2,diagY2);
        const inDiag = dDiag <= halfThick;
        // rounded corners for N bars? keep square for minimalist
        const inN = inLeft || inRight || inDiag;
        if(inN){
          // N fill: white with subtle gradient, plus outer glow
          // glow: if near N edge, add cyan halo
          const edgeDistN = (()=> {
            let md = Infinity;
            if(inLeft) md = Math.min(md, Math.min(x-leftX, leftX+leftW - x, y-leftY, leftY+leftH - y));
            if(inRight) md = Math.min(md, Math.min(x-rightX, rightX+rightW - x, y-rightY, rightY+rightH - y));
            if(inDiag) md = Math.min(md, halfThick - dDiag);
            return md;
          })();
          // base white
          r=255; g=255; b=255;
          // inner shading near edge for depth
          if(edgeDistN < 3*scale){
            const tE = edgeDistN/(3*scale);
            r = Math.round(lerp(220,255,tE));
            g = Math.round(lerp(255,255,tE));
            b = Math.round(lerp(255,255,tE));
          }
        } else {
          // N outer glow: 0-12px around N
          let minDist = Infinity;
          // distance to N shape
          if(!inN){
            // compute distance to nearest part
            let d1 = Infinity, d2=Infinity, d3=Infinity;
            // to left rect
            let lx = Math.max(leftX, Math.min(x, leftX+leftW));
            let ly = Math.max(leftY, Math.min(y, leftY+leftH));
            d1 = Math.hypot(x-lx, y-ly);
            let rx2 = Math.max(rightX, Math.min(x, rightX+rightW));
            let ry2 = Math.max(rightY, Math.min(y, rightY+rightH));
            d2 = Math.hypot(x-rx2, y-ry2);
            d3 = dDiag - halfThick;
            if(d3<0) d3=0;
            minDist = Math.min(d1,d2,d3);
          }
          if(minDist < 14*scale){
            const tG = 1 - minDist/(14*scale);
            const glow = tG*0.55;
            // cyan glow
            r = Math.round(r*(1-glow) + 0*glow + r*0.0);
            g = Math.round(g*(1-glow*0.3) + 255*glow*0.7);
            b = Math.round(b*(1-glow*0.3) + 255*glow*0.7);
            // add a bit
            r = Math.min(255, r + glow*22);
            g = Math.min(255, g + glow*42);
            b = Math.min(255, b + glow*42);
          }
        }
        // accent line
        const inLine = (()=> {
          // rounded capsule check
          const lx2=lineX, ly2=lineY, lw2=lineW, lh2=lineH;
          const rCap = lh2/2;
          // closest point on capsule: rectangle + caps
          if(x>=lx2+rCap && x<=lx2+lw2-rCap && y>=ly2 && y<=ly2+lh2) return true;
          const cx1=lx2+rCap, cy1=ly2+rCap;
          if(Math.hypot(x-cx1, y-cy1) <= rCap) return true;
          const cx2=lx2+lw2-rCap, cy2=ly2+rCap;
          if(Math.hypot(x-cx2, y-cy2) <= rCap) return true;
          return false;
        })();
        if(inLine){
          const tLine = (x - lineX)/lineW; // 0-1 left to right cyan->fuchsia
          const lc = lerpColor(borderCyan, borderFuchsia, tLine);
          r=lc[0]; g=lc[1]; b=lc[2];
          alpha=255;
        } else {
          // line glow
          let dLine = Infinity;
          // distance to line capsule
          const rCap = lineH/2;
          const cx1=lineX+rCap, cy1=lineY+rCap;
          const cx2=lineX+lineW-rCap;
          // if x between caps, vertical distance
          if(x>=cx1 && x<=cx2){
            dLine = Math.abs(y - cy1) - rCap;
            if(dLine<0) dLine=0;
          } else {
            const dA = Math.hypot(x-cx1, y-cy1)-rCap;
            const dB = Math.hypot(x-cx2, y-cy1)-rCap;
            dLine = Math.min(dA,dB);
          }
          if(dLine>=0 && dLine < 10*scale && !inLine){
            const tG = 1 - dLine/(10*scale);
            const glow = tG*0.45;
            r = Math.min(255, r + glow*30);
            g = Math.min(255, g + glow*120);
            b = Math.min(255, b + glow*140);
          }
        }
        // antialias border edge
        if(borderDist < 1.2){
          const aa = borderDist/1.2;
          // fade alpha at edge for smoothness
          // keep inside fully opaque, but blend edge with background transparency? For icon we want crisp edge with slight AA
          // Do nothing, keep opaque for now
        }
        rgba[idx]=r; rgba[idx+1]=g; rgba[idx+2]=b; rgba[idx+3]=255;
      } else {
        // outside rounded rect: check for outer glow (0-16px)
        if(sd >0 && sd < 16*scale){
          const tG = 1 - sd/(16*scale);
          const glowAlpha = tG*0.18*255;
          // cyan outer glow
          r=0; g=255; b=255;
          rgba[idx]=r; rgba[idx+1]=g; rgba[idx+2]=b; rgba[idx+3]=Math.round(glowAlpha*0.5);
        } else {
          rgba[idx]=0; rgba[idx+1]=0; rgba[idx+2]=0; rgba[idx+3]=0;
        }
      }
    }
  }
  return rgba;
}

const root = 'C:/Users/Wilme/neo-arcade';
const targets = [
  { out: 'public/icon-master-1024.png', size: 1024 },
  { out: 'public/icon.png', size: 512 },
  { out: 'public/neo-arcade.png', size: 512 },
  { out: 'neo-arcade.png', size: 512 },
  { out: 'public/favicon.png', size: 256 },
  { out: 'public/favicon-256.png', size: 256 },
];
for(const t of targets){
  const rgba = generate(t.size);
  const png = toPNG(t.size, t.size, rgba);
  const full = path.join(root, t.out);
  fs.mkdirSync(path.dirname(full), {recursive:true});
  fs.writeFileSync(full, png);
  console.log(`Generated ${t.out} ${t.size}x${t.size} ${png.length} bytes`);
}

// Generate ICO (multi-size) - simple: use largest PNG as ico via png-to-ico if available, else just copy PNG
try{
  const { default: pngToIco } = await import('png-to-ico');
  // png-to-ico expects paths, but we can pass buffers?
  // We'll use buffers directly: create ico from 256 and 512
  const p1 = fs.readFileSync(path.join(root,'public/favicon.png'));
  const p2 = fs.readFileSync(path.join(root,'public/icon.png'));
  // png-to-ico can take multiple png buffers/files
  const ico = await pngToIco([path.join(root,'public/favicon.png'), path.join(root,'public/icon.png')]);
  fs.writeFileSync(path.join(root,'public/favicon.ico'), ico);
  fs.writeFileSync(path.join(root,'neo-arcade.ico'), ico);
  fs.writeFileSync(path.join(root,'public/neo-arcade.ico'), ico);
  console.log('ICO generated', ico.length);
}catch(e){
  console.log('png-to-ico not usable, fallback copy', e.message);
  try{
    const data = fs.readFileSync(path.join(root,'public/icon.png'));
    fs.writeFileSync(path.join(root,'public/favicon.ico'), data);
    fs.writeFileSync(path.join(root,'neo-arcade.ico'), data);
  }catch{}
}
