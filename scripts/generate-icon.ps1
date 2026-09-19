Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath($x,$y,$w,$h,$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r*2
  $p.AddArc($x,$y,$d,$d,180,90)
  $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
  $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90)
  $p.AddArc($x,$y+$h-$d,$d,$d,90,90)
  $p.CloseFigure()
  return $p
}

function Generate-Icon($size, $outPath){
  $bmp = New-Object System.Drawing.Bitmap $size,$size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  # Background rounded square
  $margin = [int]($size * 0.0625) # 64 at 1024
  $radius = [int]($size * 0.1875) # 192 at 1024
  $rectW = $size - $margin*2
  $rectH = $rectW
  $path = New-RoundedRectPath $margin $margin $rectW $rectH $radius

  # Fill with deep dark gradient
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($margin,$margin)),
    (New-Object System.Drawing.PointF($margin,$margin+$rectH)),
    [System.Drawing.Color]::FromArgb(255, 10, 10, 30),
    [System.Drawing.Color]::FromArgb(255, 4, 5, 16)
  )
  $blend = New-Object System.Drawing.Drawing2D.Blend
  $blend.Factors = [float[]](0.0, 1.0)
  $blend.Positions = [float[]](0.0, 1.0)
  $bgBrush.Blend = $blend
  $g.FillPath($bgBrush, $path)

  # Subtle inner radial highlight (top)
  $highlightBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($margin,$margin)),
    (New-Object System.Drawing.PointF($margin,$margin+$rectH*0.55)),
    [System.Drawing.Color]::FromArgb(40, 0, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
  )
  $g.FillPath($highlightBrush, $path)

  # Neon border — gradient cyan → fuchsia
  $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,0,255,255), [float]($size*0.009))
  $borderPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  # Create gradient pen via using path with LinearGradientBrush? Simulate by drawing path with two colors
  # We'll draw border with cyan then overlay with fuchsia on right half clipped
  $g.DrawPath($borderPen, $path)
  $borderPen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180,255,0,255), [float]($size*0.005))
  $g.DrawPath($borderPen2, $path)

  # Outer glow soft
  $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35,0,255,255), [float]($size*0.018))
  $glowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($glowPen, $path)

  # Central minimalist N — geometric chrome
  # Use Arial Black, fallback to Segoe UI Black
  $fontFamilies = @("Arial Black","Segoe UI Black","Impact","Arial")
  $fam = $null
  foreach($n in $fontFamilies){
    try{ $fam = New-Object System.Drawing.FontFamily($n); break }catch{}
  }
  if($null -eq $fam){ $fam = [System.Drawing.FontFamily]::GenericSansSerif }

  $fontSize = $size * 0.52
  $style = [System.Drawing.FontStyle]::Bold
  $font = New-Object System.Drawing.Font($fam, $fontSize, $style, [System.Drawing.GraphicsUnit]::Pixel)
  # Adjust font size to fit if too wide
  $text = "N"
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

  $center = New-Object System.Drawing.RectangleF(0,0,$size,$size)
  # Slight offset up for optical centering
  $center.Y = -$size*0.02

  # Glow behind N — cyan/fuchsia blur
  $glowColor1 = [System.Drawing.Color]::FromArgb(90, 0, 255, 255)
  $glowColor2 = [System.Drawing.Color]::FromArgb(70, 255, 0, 255)
  # Draw glow by drawing text 6 times offset
  $glowBrush1 = New-Object System.Drawing.SolidBrush($glowColor1)
  for($dx=-4;$dx -le 4;$dx+=2){
    for($dy=-4;$dy -le 4;$dy+=2){
      if($dx -eq 0 -and $dy -eq 0){ continue }
      $r = New-Object System.Drawing.RectangleF($center.X+$dx*($size/512),$center.Y+$dy*($size/512),$center.Width,$center.Height)
      $g.DrawString($text,$font,$glowBrush1,$r,$sf)
    }
  }

  # Main N gradient: white → cyan → fuchsia diagonal
  $textBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($size*0.25,$size*0.25)),
    (New-Object System.Drawing.PointF($size*0.75,$size*0.75)),
    [System.Drawing.Color]::FromArgb(255,255,255,255),
    [System.Drawing.Color]::FromArgb(255,220,255,255)
  )
  # Add color blend cyan->white->fuchsia effect via interpolation colors
  $cb = New-Object System.Drawing.Drawing2D.ColorBlend
  $cb.Colors = @(
    [System.Drawing.Color]::FromArgb(255,0,255,255),
    [System.Drawing.Color]::FromArgb(255,255,255,255),
    [System.Drawing.Color]::FromArgb(255,255,255,255),
    [System.Drawing.Color]::FromArgb(255,255,0,255)
  )
  $cb.Positions = [float[]](0.0, 0.32, 0.58, 1.0)
  $textBrush.InterpolationColors = $cb

  $g.DrawString($text,$font,$textBrush,$center,$sf)

  # Thin inner stroke for N to make it pop — very subtle white edge
  $strokePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120,255,255,255), [float]($size*0.002))
  # Can't stroke text easily, skip.

  # Small minimalist underline accent — neon line under N
  $lineW = $size * 0.38
  $lineH = $size * 0.012
  $lineX = ($size - $lineW)/2
  $lineY = $size * 0.68
  $lineRect = New-Object System.Drawing.RectangleF($lineX,$lineY,$lineW,$lineH)
  $lineBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF($lineX,$lineY)),
    (New-Object System.Drawing.PointF($lineX+$lineW,$lineY)),
    [System.Drawing.Color]::FromArgb(255,0,255,255),
    [System.Drawing.Color]::FromArgb(255,255,0,255)
  )
  # Rounded line by filling rounded rect
  $linePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $linePath.AddArc($lineX,$lineY,$lineH,$lineH,90,180)
  $linePath.AddArc($lineX+$lineW-$lineH,$lineY,$lineH,$lineH,270,180)
  $linePath.CloseFigure()
  $g.FillPath($lineBrush,$linePath)
  # Glow for line
  $lineGlowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55,0,255,255))
  $glowRect = New-Object System.Drawing.RectangleF($lineX-2,$lineY-4,$lineW+4,$lineH+8)
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddArc($glowRect.X,$glowRect.Y,$glowRect.Height,$glowRect.Height,90,180)
  $glowPath.AddArc($glowRect.X+$glowRect.Width-$glowRect.Height,$glowRect.Y,$glowRect.Height,$glowRect.Height,270,180)
  $glowPath.CloseFigure()
  $g.FillPath($lineGlowBrush,$glowPath)

  # Cleanup
  $font.Dispose(); $bgBrush.Dispose(); $highlightBrush.Dispose(); $textBrush.Dispose(); $lineBrush.Dispose(); $glowBrush1.Dispose()
  $borderPen.Dispose(); $borderPen2.Dispose(); $glowPen.Dispose(); $lineGlowBrush.Dispose()
  $path.Dispose(); $linePath.Dispose(); $glowPath.Dispose()

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "Generated $outPath (${size}x${size})"
}

# Generate master 1024
$root = "C:\Users\Wilme\neo-arcade"
$master = Join-Path $root "public\icon-master-1024.png"
Generate-Icon 1024 $master

# Generate required sizes via resizing master
$sizes = @{
  "public\icon.png" = 512
  "public\favicon.png" = 256
  "public\neo-arcade.png" = 512
  "neo-arcade.png" = 512
}
foreach($rel in $sizes.Keys){
  $sz = $sizes[$rel]
  $out = Join-Path $root $rel
  Generate-Icon $sz $out
}
# Also generate 256 favicon as 64? keep 256 is fine

Write-Host "All PNG icons generated"

# Generate ICO using png-to-ico if available
try{
  $node = Get-Command node -ErrorAction Stop
  $icoScript = Join-Path $root "scripts\make-ico.cjs"
  $js = @"
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
"@
  Set-Content -LiteralPath $icoScript -Value $js -Encoding UTF8
  node $icoScript
  Write-Host "ICO done"
}catch{
  Write-Host "ICO generation skipped: $_"
  # Fallback: copy png as ico placeholder
  Copy-Item -LiteralPath (Join-Path $root "public\icon.png") -Destination (Join-Path $root "public\favicon.ico") -Force
  Copy-Item -LiteralPath (Join-Path $root "public\icon.png") -Destination (Join-Path $root "neo-arcade.ico") -Force
}
