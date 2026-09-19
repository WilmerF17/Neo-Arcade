@echo off
title NEO ARCADE v3.0 RGB - 25 CABINAS
color 0B
echo.
echo  ============================================
echo   NEO ARCADE v3.0 RGB - 25 CABINAS
echo   SYNC TERMINAL ^<--^> PAGINA
echo  ============================================
echo.
echo  Iniciando servidor + dashboard sincronizado...
echo  Terminal y pagina comparten arcade-stats.json
echo  Cambios en la pagina se ven en la terminal y viceversa
echo.
cd /d "%~dp0"
echo  [1/2] Lanzando dashboard en nueva ventana...
start "NEO ARCADE - TERMINAL DASHBOARD" cmd /k "color 0A && node scripts/terminal-dashboard.js"
echo  [2/2] Iniciando servidor en http://127.0.0.1:3000 ...
echo  La primera carga tarda ~40 segundos (Windows Defender).
echo  No cierres esta ventana mientras juegas.
echo  Dashboard legible en la otra ventana.
echo.
npx vite preview --port 3000 --host 127.0.0.1 --open
echo.
echo  Servidor detenido. Dashboard sigue en la otra ventana.
echo  Presiona una tecla para salir.
pause >nul
