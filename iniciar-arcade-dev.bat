@echo off
echo Iniciando en modo desarrollo (hot reload)...
cd /d "%~dp0"
npx vite --port 3000 --host 127.0.0.1 --open
pause
