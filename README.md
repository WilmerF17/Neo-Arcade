# NEO ARCADE — Sala Inmersiva 2026

Aplicación web arcade moderna con 5 cabinas, 5 mecánicas y 5 lenguajes representativos.
Stack: **React 18 + TypeScript + Vite 6 + Tailwind CSS** + Canvas 2D + Web Audio API.

## Ubicación
`C:\Users\Wilme\neo-arcade`

## Instalación ya realizada
```bash
npm install  # ya ejecutado (138 paquetes)
npm run build # verificado ✓
```

## Lanzadores (doble click)
- `iniciar-arcade.bat` → `npx vite preview --port 3000` (producción, abre navegador)
- `iniciar-arcade-dev.bat` → `npx vite --port 3000` (desarrollo hot-reload)

O manual:
```bash
cd C:\Users\Wilme\neo-arcade
npm run preview   # http://127.0.0.1:3000  (espera ~40-50s primer carga en Windows)
npm run dev       # http://127.0.0.1:3000  modo dev
npm run build     # genera dist/
```

> Nota Windows: la primera petición a Vite tarda ~40-50s por scan antivirus/defender. Es normal. Recarga después es instantánea.

## Cabinas / Juegos

| Cabina | Mecánica | Lenguaje | Archivo |
|---|---|---|---|
| **NEON SERPENT** 🐍 | Snake con inercia, partículas, wrap no permitido | JavaScript | `src/games/SnakeGame.tsx:1` |
| **CYBER BRICKS** 🧱 | Breakout física angular, 40 ladrillos con HP, paddle magnético | C++ | `src/games/BreakoutGame.tsx:1` |
| **VOID STRIKE** 🚀 | Shooter vertical, 60 estrellas parallax, asteroides hexagonales | Rust | `src/games/ShooterGame.tsx:1` |
| **MATRIX MIND** 🧠 | Memory 4x4, 8 pares, flip 3D, bonus | Python | `src/games/MemoryGame.tsx:1` |
| **NEON TOWER** 🏗️ | Stack timing, corte perfecto, cámara ascendente | Go | `src/games/StackGame.tsx:1` |

## Diseño inmersivo
- Fondo: gradientes radiales + grid 40px + orbes blur animados + vignette
- Efecto CRT: scanlines + viñeta + bloom neon (`src/index.css:15`)
- Glassmorphism, neón cyan/fuchsia/ámber, tipografía Orbitron + Rajdhani + JetBrains Mono
- Audio procedural Web Audio (click 880Hz square) con mute
- Responsive: selector lateral en desktop, grid en móvil

## Estructura
```
src/
  App.tsx              # Orquestador, header, selector, highscores
  main.tsx             # mount
  index.css            # Tailwind + CRT
  games/*.tsx          # 5 juegos canvas
```

## Controles
- WASD/Flechas, Mouse/Touch, Espacio/Click, R reinicia, P pausa

## Próximas expansiones sugeridas
- Multiplayer WebSockets, leaderboard Supabase, WebGL shaders, PWA.
