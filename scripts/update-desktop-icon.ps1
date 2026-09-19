param()
$root = "C:\Users\Wilme\neo-arcade"
$pub = Join-Path $root "public"

# 1) Generate small sizes for better desktop ICO (16,32,48) using existing make-icon logic via node quickly
# We'll generate via inline node using same generate function but quick method: resize via System.Drawing from 512
Add-Type -AssemblyName System.Drawing
function Resize-Png($src, $dst, $sz){
  $bmpSrc = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap $sz,$sz
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 7
  $g.SmoothingMode = 4
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($bmpSrc, 0,0,$sz,$sz)
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $bmpSrc.Dispose()
  Write-Host "Resized $src -> $dst ${sz}x${sz}"
}
$master512 = Join-Path $pub "icon.png"
$sz16 = Join-Path $pub "icon-16.png"
$sz32 = Join-Path $pub "icon-32.png"
$sz48 = Join-Path $pub "icon-48.png"
$sz64 = Join-Path $pub "icon-64.png"
Resize-Png $master512 $sz16 16
Resize-Png $master512 $sz32 32
Resize-Png $master512 $sz48 48
Resize-Png $master512 $sz64 64

# 2) Generate multi-size ICO via png-to-ico with 16,32,48,256,512? But to keep size reasonable, use 16,32,48,256
Write-Host "Generating multi-size ICO..."
$nodeScript = Join-Path $root "scripts\make-ico-multi.cjs"
$js = @'
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
'@
Set-Content -LiteralPath $nodeScript -Value $js -Encoding UTF8
node $nodeScript
if($LASTEXITCODE -ne 0){ Write-Host "ICO gen failed $LASTEXITCODE"; exit 1 }

# 3) Update desktop shortcut
$lnkPath = "C:\Users\Wilme\OneDrive\Desktop\NEO ARCADE.lnk"
if(Test-Path $lnkPath){
  $sh = New-Object -ComObject WScript.Shell
  $sc = $sh.CreateShortcut($lnkPath)
  $sc.TargetPath = "C:\Windows\System32\cmd.exe"
  $sc.Arguments = '/c ""C:\Users\Wilme\neo-arcade\iniciar-arcade.bat""'
  $sc.WorkingDirectory = "C:\Users\Wilme\neo-arcade"
  $sc.IconLocation = "C:\Users\Wilme\neo-arcade\neo-arcade.ico,0"
  $sc.Description = "NEO ARCADE v3.1 ELITE - 50 CABINAS RGB 2026 - Doble click para jugar"
  $sc.Save()
  Write-Host "Shortcut updated: $lnkPath -> $($sc.IconLocation)"
} else { Write-Host "LNK not found at $lnkPath" }

# Also try classic desktop path
$alt = "C:\Users\Wilme\Desktop\NEO ARCADE.lnk"
if(Test-Path $alt){
  $sc2 = $sh.CreateShortcut($alt)
  $sc2.IconLocation = "C:\Users\Wilme\neo-arcade\neo-arcade.ico,0"
  $sc2.Save()
  Write-Host "Alt shortcut updated"
}

# 4) Refresh icon cache
Write-Host "Refreshing icon cache..."
try{
  # Notify shell
  $code = @'
using System;
using System.Runtime.InteropServices;
public class IconRefresh {
  [DllImport("shell32.dll")]
  public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
'@
  Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
  [IconRefresh]::SHChangeNotify(0x8000000, 0x1000, [IntPtr]::Zero, [IntPtr]::Zero)
  Write-Host "SHChangeNotify sent"
}catch{ Write-Host "SHChangeNotify failed $_" }

# Also try ie4uinit
try{
  Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-show" -Wait -ErrorAction SilentlyContinue
  Write-Host "ie4uinit -show done"
}catch{}
try{
  Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-ClearIconCache" -Wait -ErrorAction SilentlyContinue
  Write-Host "ie4uinit -ClearIconCache done"
}catch{}

# Restart explorer icon cache via deleting IconCache db (optional, not forced)
$cache = "$env:LOCALAPPDATA\IconCache.db"
if(Test-Path $cache){
  Write-Host "IconCache.db exists at $cache (will be rebuilt on next logon)"
}
Write-Host "Done. If icon doesn't change instantly, close and reopen Explorer or logoff/logon."
