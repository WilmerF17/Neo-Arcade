Add-Type -AssemblyName System.Drawing

function New-RoundedPath($x,$y,$w,$h,$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r*2
  $p.AddArc($x,$y,$d,$d,180,90)
  $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
  $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90)
  $p.AddArc($x,$y+$h-$d,$d,$d,90,90)
  $p.CloseFigure()
  return $p
}

function GenerateOne($sz, $out){
  $bmp = New-Object System.Drawing.Bitmap $sz,$sz
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 4 # HighQuality
  $g.InterpolationMode = 7
  $g.TextRenderingHint = 4
  $g.Clear([System.Drawing.Color]::Transparent)

  $m = [int]($sz * 0.06)
  $rad = [int]($sz * 0.18)
  $rw = $sz - $m*2
  $rh = $rw
  $path = New-RoundedPath $m $m $rw $rh $rad

  # dark fill solid
  $bg = [System.Drawing.Color]::FromArgb(255, 8, 10, 28)
  $brushBg = New-Object System.Drawing.SolidBrush($bg)
  $g.FillPath($brushBg, $path)
  $brushBg.Dispose()

  # subtle highlight top
  $hlBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 0, 255, 255))
  $hlPath = New-RoundedPath $m $m $rw ([int]($rh*0.55)) $rad
  # clip highlight to top half
  $g.FillPath($hlBrush, $hlPath)
  $hlBrush.Dispose(); $hlPath.Dispose()

  # neon border cyan
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0, 255, 255), ($sz*0.012))
  $pen.LineJoin = 2
  $g.DrawPath($pen, $path)
  $pen.Dispose()
  $pen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(140, 255, 0, 255), ($sz*0.006))
  $pen2.LineJoin = 2
  $g.DrawPath($pen2, $path)
  $pen2.Dispose()
  # outer glow
  $penGlow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(30, 0, 255, 255), ($sz*0.022))
  $penGlow.LineJoin = 2
  $g.DrawPath($penGlow, $path)
  $penGlow.Dispose()

  # N letter
  $famName = "Arial Black"
  try { $fam = New-Object System.Drawing.FontFamily($famName) } catch { $fam = [System.Drawing.FontFamily]::GenericSansSerif }
  $fs = [float]($sz * 0.48)
  $font = New-Object System.Drawing.Font($fam, $fs, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 1
  $sf.LineAlignment = 1
  $rect = New-Object System.Drawing.RectangleF(0, [float]($sz*-0.02), [float]$sz, [float]$sz)
  # glow
  $glowB = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 0, 255, 255))
  $off = [float]($sz*0.008)
  $r1 = New-Object System.Drawing.RectangleF($rect.X-$off, $rect.Y-$off, $rect.Width, $rect.Height)
  $g.DrawString("N", $font, $glowB, $r1, $sf)
  $r2 = New-Object System.Drawing.RectangleF($rect.X+$off, $rect.Y+$off, $rect.Width, $rect.Height)
  $g.DrawString("N", $font, $glowB, $r2, $sf)
  $glowB.Dispose()
  # main N white
  $whiteB = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString("N", $font, $whiteB, $rect, $sf)
  $whiteB.Dispose()
  # second layer cyan tint
  $cyanB = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 0, 255, 255))
  $rc2 = New-Object System.Drawing.RectangleF($rect.X, $rect.Y+($sz*0.01), $rect.Width, $rect.Height)
  # skip second draw to keep clean

  # accent line
  $lw = [float]($sz*0.38)
  $lh = [float]($sz*0.013)
  $lx = [float](($sz - $lw)/2)
  $ly = [float]($sz*0.70)
  $linePath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $linePath.AddArc($lx, $ly, $lh, $lh, 90, 180)
  $linePath.AddArc($lx+$lw-$lh, $ly, $lh, $lh, 270, 180)
  $linePath.CloseFigure()
  # gradient via solid + blend manually: draw left cyan half and right fuchsia half
  $cyanLine = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,0,255,255))
  $g.FillPath($cyanLine, $linePath)
  $cyanLine.Dispose()
  # fuchsia overlay right half with alpha
  $clip = New-Object System.Drawing.RectangleF($lx+$lw*0.5, $ly, $lw*0.5, $lh)
  $g.SetClip($clip)
  $fuchsia = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,255,0,255))
  $g.FillPath($fuchsia, $linePath)
  $fuchsia.Dispose()
  $g.ResetClip()
  # glow for line
  $glowLine = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45,0,255,255))
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gl = [float]($lh+6*($sz/512))
  $gx = [float]($lx - 3*($sz/512))
  $gy = [float]($ly - 3*($sz/512))
  $gw = [float]($lw + 6*($sz/512))
  $gh = [float]($lh + 6*($sz/512))
  $glowPath.AddArc($gx,$gy,$gh,$gh,90,180)
  $glowPath.AddArc($gx+$gw-$gh,$gy,$gh,$gh,270,180)
  $glowPath.CloseFigure()
  # draw glow behind (need to draw before line, but we already drew line — draw glow underneath by redrawing? Just draw now with low alpha behind will still show)
  # Instead fill glow first then re-fill line: we already have line, glow will be around
  $g.FillPath($glowLine, $glowPath)
  $glowLine.Dispose()
  # re-draw line on top for crispness (quick)
  $linePath2 = New-Object System.Drawing.Drawing2D.GraphicsPath
  $linePath2.AddArc($lx,$ly,$lh,$lh,90,180)
  $linePath2.AddArc($lx+$lw-$lh,$ly,$lh,$lh,270,180)
  $linePath2.CloseFigure()
  $cyanLine2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,0,255,255))
  $g.FillPath($cyanLine2,$linePath2)
  $cyanLine2.Dispose()
  $g.SetClip($clip)
  $f2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,255,0,255))
  $g.FillPath($f2,$linePath2)
  $f2.Dispose()
  $g.ResetClip()

  $font.Dispose()
  $path.Dispose()
  $linePath.Dispose()
  $linePath2.Dispose()
  $glowPath.Dispose()

  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "Generated $out ${sz}x${sz}"
}

$root = "C:\Users\Wilme\neo-arcade"
GenerateOne 1024 (Join-Path $root "public\icon-master-1024.png")
GenerateOne 512 (Join-Path $root "public\icon.png")
GenerateOne 512 (Join-Path $root "public\neo-arcade.png")
GenerateOne 512 (Join-Path $root "neo-arcade.png")
GenerateOne 256 (Join-Path $root "public\favicon.png")
GenerateOne 256 (Join-Path $root "public\favicon-256.png")
Write-Host "PNG done"
