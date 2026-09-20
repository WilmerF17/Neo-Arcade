import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import SnakeGame from './games/SnakeGame'
import BreakoutGame from './games/BreakoutGame'
import ShooterGame from './games/ShooterGame'
import MemoryGame from './games/MemoryGame'
import StackGame from './games/StackGame'
import RunnerGame from './games/RunnerGame'
import RhythmGame from './games/RhythmGame'
import Game2048 from './games/Game2048'
import TetrisGame from './games/TetrisGame'
import FlappyGame from './games/FlappyGame'
import MinerGame from './games/MinerGame'
import WordsGame from './games/WordsGame'
import AimGame from './games/AimGame'
import MazeGame from './games/MazeGame'
import PlinkoGame from './games/PlinkoGame'
import PongGame from './games/PongGame'
import ColorGame from './games/ColorGame'
import DodgeGame from './games/DodgeGame'
import TypingGame from './games/TypingGame'
import GravityGame from './games/GravityGame'
import SlideGame from './games/SlideGame'
import DefenseGame from './games/DefenseGame'
import RiderGame from './games/RiderGame'
import HexGame from './games/HexGame'
import ChessGame from './games/ChessGame'
import FroggerGame from './games/FroggerGame'
import PinballGame from './games/PinballGame'
import BubbleGame from './games/BubbleGame'
import RacingGame from './games/RacingGame'
import NinjaGame from './games/NinjaGame'
import HarvestGame from './games/HarvestGame'
import JetpackGame from './games/JetpackGame'
import MatchGame from './games/MatchGame'
import SurvivalGame from './games/SurvivalGame'
import LaserGame from './games/LaserGame'
import InvadersGame from './games/InvadersGame'
import DungeonGame from './games/DungeonGame'
import SnakeDuelGame from './games/SnakeDuelGame'
import PuzzleBoxGame from './games/PuzzleBoxGame'
import MemoryUltraGame from './games/MemoryUltraGame'
import TowerEliteGame from './games/TowerEliteGame'
import FlappyUltraGame from './games/FlappyUltraGame'
import SnakeUltraGame from './games/SnakeUltraGame'
import PongUltraGame from './games/PongUltraGame'
import RacingEliteGame from './games/RacingEliteGame'
import TronGame from './games/TronGame'
import SudokuGame from './games/SudokuGame'
import ChessUltraGame from './games/ChessUltraGame'
import AsteroidsUltraGame from './games/AsteroidsUltraGame'
import WordleUltraGame from './games/WordleUltraGame'
import GameIcon from './components/GameIcons'
import PWAInstall from './components/PWAInstall'
import SlotsGame from './games/SlotsGame'
import RouletteGame from './games/RouletteGame'
import BlackjackGame from './games/BlackjackGame'
import PokerGame from './games/PokerGame'
import DiceGame from './games/DiceGame'
import CoinFlipGame from './games/CoinFlipGame'
import ScratchGame from './games/ScratchGame'
import LotteryGame from './games/LotteryGame'
import CrashGame from './games/CrashGame'
import MinesGame from './games/MinesGame'
import PlaceholderGame from './games/PlaceholderGame'
import ElitePhGame from './games/ElitePhGame'

// --- ErrorBoundary profesional ---
class GameErrorBoundary extends React.Component<{children:React.ReactNode, game: string}, {hasError:boolean, msg:string}>{
  state={hasError:false, msg:''}
  static getDerivedStateFromError(err:any){ return {hasError:true, msg:String(err?.message||err)}}
  componentDidCatch(err:any, info:any){ console.error(`[NEO ARCADE] Error en ${this.props.game}:`, err, info) }
  render(){
    if(this.state.hasError) return (
      <div className="glass rounded-xl p-6 text-center border border-red-400/30 max-w-[360px]">
        <p className="font-black text-red-300" style={{fontFamily:'Orbitron'}}>⚠️ Error en {this.props.game}</p>
        <p className="text-xs font-mono text-white/50 mt-1">{this.state.msg.slice(0,120)}</p>
        <button onClick={()=> this.setState({hasError:false, msg:''})} className="mt-3 px-4 py-1.5 rounded-full bg-white text-black font-black text-xs">REINTENTAR</button>
        <p className="text-[11px] font-mono text-white/30 mt-2">El juego se ha recuperado profesionalmente. Si persiste, cambia de cabina.</p>
      </div>
    )
    return this.props.children
  }
}

// --- Types ---
type GameId = 'snake'|'breakout'|'shooter'|'memory'|'stack'|'runner'|'rhythm'|'fusion'|'tetris'|'flappy'|'miner'|'words'|'aim'|'maze'|'plinko'|'pong'|'color'|'dodge'|'typing'|'gravity'|'slide'|'defense'|'rider'|'hex'|'chess'|'frogger'|'pinball'|'bubble'|'racing'|'ninja'|'harvest'|'jetpack'|'match'|'survival'|'laser'|'invaders'|'dungeon'|'snakeduel'|'puzzlebox'|'memoryultra'|'towerelite'|'flappyultra'|'snakeultra'|'pongultra'|'racingelite'|'tron'|'sudoku'|'chessultra'|'asteroidsultra'|'wordleultra'|'slots'|'roulette'|'blackjack'|'poker'|'dice'|'coinflip'|'scratch'|'lottery'|'crash'|'mines'|'ph061'|'ph062'|'ph063'|'ph064'|'ph065'|'ph066'|'ph067'|'ph068'|'ph069'|'ph070'|'ph071'|'ph072'|'ph073'|'ph074'|'ph075'|'ph076'|'ph077'|'ph078'|'ph079'|'ph080'|'ph081'|'ph082'|'ph083'|'ph084'|'ph085'|'ph086'|'ph087'|'ph088'|'ph089'|'ph090'|'ph091'|'ph092'|'ph093'|'ph094'|'ph095'|'ph096'|'ph097'|'ph098'|'ph099'|'ph100'|'ph101'|'ph102'|'ph103'|'ph104'|'ph105'|'ph106'|'ph107'|'ph108'|'ph109'|'ph110'|'ph111'|'ph112'|'ph113'|'ph114'|'ph115'|'ph116'|'ph117'|'ph118'|'ph119'|'ph120'|'ph121'|'ph122'|'ph123'|'ph124'|'ph125'|'ph126'|'ph127'|'ph128'|'ph129'|'ph130'|'ph131'|'ph132'|'ph133'|'ph134'|'ph135'|'ph136'|'ph137'|'ph138'|'ph139'|'ph140'|'ph141'|'ph142'|'ph143'|'ph144'|'ph145'|'ph146'|'ph147'|'ph148'|'ph149'|'ph150'|'ph151'|'ph152'|'ph153'|'ph154'|'ph155'|'ph156'|'ph157'|'ph158'|'ph159'|'ph160'|'ph161'|'ph162'|'ph163'|'ph164'|'ph165'|'ph166'|'ph167'|'ph168'|'ph169'|'ph170'|'ph171'|'ph172'|'ph173'|'ph174'|'ph175'|'ph176'|'ph177'|'ph178'|'ph179'|'ph180'|'ph181'|'ph182'|'ph183'|'ph184'|'ph185'|'ph186'|'ph187'|'ph188'|'ph189'|'ph190'|'ph191'|'ph192'|'ph193'|'ph194'|'ph195'|'ph196'|'ph197'|'ph198'|'ph199'|'ph200'|'ph201'|'ph202'|'ph203'|'ph204'|'ph205'|'ph206'|'ph207'|'ph208'|'ph209'|'ph210'|'ph211'|'ph212'|'ph213'|'ph214'|'ph215'|'ph216'|'ph217'|'ph218'|'ph219'|'ph220'|'ph221'|'ph222'|'ph223'|'ph224'|'ph225'|'ph226'|'ph227'|'ph228'|'ph229'|'ph230'|'ph231'|'ph232'|'ph233'|'ph234'|'ph235'|'ph236'|'ph237'|'ph238'|'ph239'|'ph240'|'ph241'|'ph242'|'ph243'|'ph244'|'ph245'|'ph246'|'ph247'|'ph248'|'ph249'|'ph250'

type GameMeta = { title:string, subtitle:string, lang:string, color:string, mech:string, desc:string, icon:string, cat:'ARCADE'|'PULSE'|'BRAIN'|'SKILL'|'CASINO', diff:1|2|3 }

const GAMES: Record<GameId, GameMeta> = {
  snake:  { title:'NEON SERPENT', subtitle:'SNAKE • REFLEJOS', lang:'JavaScript', color:'#00ffff', mech:'Cola reactiva', desc:'Crece sin chocar. Curvas y timing.', icon:'🐍', cat:'ARCADE', diff:1 },
  breakout:{ title:'CYBER BRICKS', subtitle:'BREAKOUT • FÍSICA', lang:'C++', color:'#ff00ff', mech:'Rebote angular', desc:'Destruye 40 bloques con física perfecta.', icon:'🧱', cat:'ARCADE', diff:1 },
  shooter:{ title:'VOID STRIKE', subtitle:'SHOOTER • ESPACIAL', lang:'Rust', color:'#00ff88', mech:'Bullet hell', desc:'Esquiva y dispara hordas infinitas.', icon:'🚀', cat:'ARCADE', diff:2 },
  memory:{ title:'MATRIX MIND', subtitle:'MEMORY • PUZZLE', lang:'Python', color:'#ffdd00', mech:'Memoria', desc:'Empareja 8 símbolos con bonus.', icon:'🧠', cat:'BRAIN', diff:1 },
  stack:{ title:'NEON TOWER', subtitle:'STACK • TIMING', lang:'Go', color:'#ff6b35', mech:'Timing milimétrico', desc:'Apila infinito, corte perfecto.', icon:'🏗️', cat:'SKILL', diff:2 },
  runner:{ title:'HYPER DASH', subtitle:'RUNNER • ENDLESS', lang:'TypeScript', color:'#00aaff', mech:'Salto preciso', desc:'Corre infinito, esquiva y acelera.', icon:'🏃', cat:'ARCADE', diff:1 },
  rhythm:{ title:'PULSE BEAT', subtitle:'RHYTHM • MÚSICA', lang:'C#', color:'#ff3366', mech:'Ritmo 4 carriles', desc:'Golpea al beat, combo x infinito.', icon:'🎵', cat:'PULSE', diff:2 },
  fusion:{ title:'FUSION 2048', subtitle:'2048 • SLIDE', lang:'Kotlin', color:'#8a2be2', mech:'Fusión', desc:'Desliza y fusiona hasta 2048.', icon:'🔢', cat:'BRAIN', diff:1 },
  tetris:{ title:'QUANTUM STACK', subtitle:'TETRIS • BLOCK', lang:'Java', color:'#00ffff', mech:'Tetrominós', desc:'Líneas, niveles y ghost piece.', icon:'🧩', cat:'BRAIN', diff:2 },
  flappy:{ title:'NEON GLIDE', subtitle:'FLAPPY • PHYSICS', lang:'Swift', color:'#ffdd00', mech:'Gravedad', desc:'Aletea entre tuberías neón.', icon:'🐦', cat:'ARCADE', diff:1 },
  miner:{ title:'ASTRO MINER', subtitle:'ASTEROIDS • THRUST', lang:'Rust', color:'#ffaa00', mech:'Thrust + minado', desc:'Mina asteroides, gestiona fuel.', icon:'⛏️', cat:'ARCADE', diff:3 },
  words:{ title:'CIPHER CODE', subtitle:'WORDLE • LOGIC', lang:'Python', color:'#00ff88', mech:'Deducción', desc:'Adivina la palabra neón.', icon:'🔤', cat:'BRAIN', diff:1 },
  aim:{ title:'AIM LAB', subtitle:'AIM • REFLEJOS', lang:'C++', color:'#ff3355', mech:'Precisión', desc:'30s, revienta blancos fugaces.', icon:'🎯', cat:'SKILL', diff:2 },
  maze:{ title:'PHANTOM MAZE', subtitle:'MAZE • ESCAPE', lang:'Go', color:'#00ff88', mech:'Laberinto', desc:'Generación procedural + fantasmas.', icon:'🌀', cat:'BRAIN', diff:2 },
  plinko:{ title:'PLINKO DROP', subtitle:'PLINKO • PHYSICS', lang:'JavaScript', color:'#ff00ff', mech:'Física rebote', desc:'Suelta bolas, busca x8 jackpot.', icon:'🎲', cat:'SKILL', diff:1 },
  pong:{ title:'NEON PONG', subtitle:'PONG • RGB', lang:'C', color:'#ff00ff', mech:'RGB + rebote', desc:'Pong infinito con estela RGB y IA.', icon:'🏓', cat:'ARCADE', diff:1 },
  color:{ title:'CHROMA FUSION', subtitle:'COLOR • RGB', lang:'JavaScript', color:'#ffdd00', mech:'Mezcla RGB', desc:'Ajusta sliders hasta clavar el color objetivo.', icon:'🎨', cat:'BRAIN', diff:1 },
  dodge:{ title:'DODGE STORM', subtitle:'DODGE • SURVIVE', lang:'Rust', color:'#00ffff', mech:'Esquiva RGB', desc:'Tormenta de fragmentos neón. Sobrevive.', icon:'🌪️', cat:'ARCADE', diff:2 },
  typing:{ title:'NEON TYPE', subtitle:'TYPING • SPEED', lang:'TypeScript', color:'#00ff88', mech:'Mecanografía', desc:'Escribe palabras neón contra reloj.', icon:'⌨️', cat:'SKILL', diff:1 },
  gravity:{ title:'GRAVITY FLIP', subtitle:'GRAVITY • FLIP', lang:'C++', color:'#8a2be2', mech:'Gravedad', desc:'Invierte gravedad para cruzar túneles.', icon:'🪐', cat:'ARCADE', diff:2 },
  slide:{ title:'TILE SHIFT', subtitle:'PUZZLE • SLIDE', lang:'Kotlin', color:'#00aaff', mech:'Deslizante 15', desc:'Ordena 1-15 con hexágonos RGB.', icon:'🧊', cat:'BRAIN', diff:1 },
  defense:{ title:'LASER GRID', subtitle:'TOWER • DEFENSE', lang:'Go', color:'#ffaa00', mech:'Defensa', desc:'Coloca torretas y frena oleadas.', icon:'🛡️', cat:'SKILL', diff:2 },
  rider:{ title:'NEON RIDER', subtitle:'RIDER • JUMP', lang:'Swift', color:'#ff6b35', mech:'Moto salto', desc:'Salta plataformas con física.', icon:'🏍️', cat:'ARCADE', diff:2 },
  hex:{ title:'HEXA MERGE', subtitle:'HEX • 2048', lang:'Python', color:'#ff3366', mech:'Hex fusión', desc:'2048 en hexágonos con brillo RGB.', icon:'⬡', cat:'BRAIN', diff:2 },
  chess:{ title:'QUANTUM TACTICS', subtitle:'CHESS • TÁCTICAS', lang:'Java', color:'#ffffff', mech:'Táctica', desc:'Puzzles de ajedrez, mate en 1.', icon:'♟️', cat:'BRAIN', diff:2 },
  frogger:{ title:'FROGGER NEON', subtitle:'FROGGER • CROSS', lang:'JavaScript', color:'#00ff88', mech:'Cruce', desc:'Cruza carretera y río sin morir.', icon:'🐸', cat:'ARCADE', diff:2 },
  pinball:{ title:'NEON PINBALL', subtitle:'PINBALL • PHYSICS', lang:'C++', color:'#ffdd00', mech:'Física', desc:'Bumpers y flippers RGB.', icon:'🎯', cat:'ARCADE', diff:2 },
  bubble:{ title:'BUBBLE POP', subtitle:'BUBBLE • MATCH', lang:'TypeScript', color:'#ff00ff', mech:'Burbujas', desc:'Dispara y agrupa colores.', icon:'🫧', cat:'BRAIN', diff:1 },
  racing:{ title:'NEON RACING', subtitle:'RACING • DODGE', lang:'C#', color:'#ff3355', mech:'Carrera', desc:'Esquiva tráfico a toda velocidad.', icon:'🏎️', cat:'ARCADE', diff:2 },
  ninja:{ title:'NINJA DASH', subtitle:'NINJA • PLATFORM', lang:'Go', color:'#00ffff', mech:'Plataformas', desc:'Salta y lanza shurikens.', icon:'🥷', cat:'ARCADE', diff:2 },
  harvest:{ title:'HARVEST MOON', subtitle:'HARVEST • CLICK', lang:'Python', color:'#00ff88', mech:'Cosecha', desc:'Recoge frutos maduros.', icon:'🌾', cat:'BRAIN', diff:1 },
  jetpack:{ title:'JETPACK JOY', subtitle:'JETPACK • FLY', lang:'Swift', color:'#00aaff', mech:'Vuelo', desc:'Vuela con jetpack y recoge monedas.', icon:'🚀', cat:'ARCADE', diff:2 },
  match:{ title:'MATCH 3', subtitle:'MATCH • PUZZLE', lang:'Kotlin', color:'#ff00ff', mech:'Match', desc:'Intercambia y alinea 3.', icon:'💎', cat:'BRAIN', diff:1 },
  survival:{ title:'SURVIVAL HORDE', subtitle:'SURVIVAL • DODGE', lang:'Rust', color:'#ff3355', mech:'Horda', desc:'Sobrevive a la horda.', icon:'🧟', cat:'ARCADE', diff:2 },
  laser:{ title:'LASER MAZE', subtitle:'LASER • PUZZLE', lang:'C', color:'#ff0080', mech:'Láser', desc:'Dirige el láser con espejos.', icon:'🔦', cat:'BRAIN', diff:2 },
  invaders:{ title:'SPACE INVADERS', subtitle:'INVADERS • SHOOT', lang:'C++', color:'#ff3355', mech:'Invasores', desc:'Elimina la horda invasora.', icon:'👾', cat:'ARCADE', diff:2 },
  dungeon:{ title:'DUNGEON CRAWL', subtitle:'DUNGEON • RPG', lang:'Go', color:'#ffaa00', mech:'Mazmorra', desc:'Explora y combate.', icon:'🏰', cat:'ARCADE', diff:2 },
  snakeduel:{ title:'SNAKE DUEL', subtitle:'SNAKE • VS', lang:'JavaScript', color:'#00ffff', mech:'Duelo', desc:'Duelo de serpientes 2P.', icon:'🐍', cat:'ARCADE', diff:2 },
  puzzlebox:{ title:'PUZZLE BOX', subtitle:'PUZZLE • LOGIC', lang:'Python', color:'#8a2be2', mech:'Lógica', desc:'Resuelve puzzles variados.', icon:'🧩', cat:'BRAIN', diff:1 },
  memoryultra:{ title:'MEMORY ULTRA', subtitle:'MEMORY • HARD', lang:'TypeScript', color:'#00ffff', mech:'Memoria', desc:'12 cartas, memoria extrema.', icon:'🧠', cat:'BRAIN', diff:2 },
  towerelite:{ title:'TOWER ELITE', subtitle:'TOWER • ELITE', lang:'Go', color:'#ffaa00', mech:'Élite', desc:'Defensa élite con niveles.', icon:'🏰', cat:'SKILL', diff:3 },
  flappyultra:{ title:'FLAPPY ULTRA', subtitle:'FLAPPY • ULTRA', lang:'Swift', color:'#ff3355', mech:'Ultra', desc:'Ultra rápido y difícil.', icon:'🐦', cat:'ARCADE', diff:3 },
  snakeultra:{ title:'SNAKE ULTRA', subtitle:'SNAKE • WALLS', lang:'JavaScript', color:'#ffdd00', mech:'Muros', desc:'Muros que aparecen.', icon:'🐍', cat:'ARCADE', diff:3 },
  pongultra:{ title:'PONG ULTRA', subtitle:'PONG • POWER', lang:'C', color:'#00ffff', mech:'Power', desc:'Pong con power-ups.', icon:'🏓', cat:'ARCADE', diff:3 },
  racingelite:{ title:'RACING ELITE', subtitle:'RACING • ELITE', lang:'C#', color:'#ff3355', mech:'Élite', desc:'Carrera 3 carriles élite.', icon:'🏎️', cat:'ARCADE', diff:3 },
  tron:{ title:'TRON GRID', subtitle:'TRON • NEÓN', lang:'TypeScript', color:'#00ffff', mech:'Estela', desc:'Duelo de estelas neón, no choques.', icon:'🏍️', cat:'ARCADE', diff:2 },
  sudoku:{ title:'SUDOKU NEON', subtitle:'SUDOKU • LÓGICA', lang:'Python', color:'#00ff88', mech:'Lógica', desc:'Completa el Sudoku 9x9 neón.', icon:'🔢', cat:'BRAIN', diff:2 },
  chessultra:{ title:'CHESS ULTRA', subtitle:'CHESS • ÉLITE', lang:'Java', color:'#ffffff', mech:'Táctica Élite', desc:'Puzzles élite, brillo RGB.', icon:'♔', cat:'BRAIN', diff:3 },
  asteroidsultra:{ title:'ASTEROID STORM', subtitle:'ASTEROIDS • ULTRA', lang:'Rust', color:'#ffaa00', mech:'Física Ultra', desc:'Nave, asteroides y split infinito.', icon:'☄️', cat:'ARCADE', diff:3 },
  wordleultra:{ title:'WORDLE ULTRA', subtitle:'WORDLE • HARD', lang:'TypeScript', color:'#ff00ff', mech:'Deducción Hard', desc:'Adivina la palabra élite 6x5.', icon:'🔤', cat:'BRAIN', diff:2 },
  slots:{ title:'NEON SLOTS', subtitle:'SLOTS • JACKPOT', lang:'JavaScript', color:'#ffaa00', mech:'Tragaperras', desc:'Gira rodillos neón, busca 3x7 jackpot.', icon:'🎰', cat:'CASINO', diff:1 },
  roulette:{ title:'NEON ROULETTE', subtitle:'ROULETTE • AZAR', lang:'C++', color:'#ff0055', mech:'Ruleta', desc:'Apuesta color/número, gira la rueda.', icon:'🎡', cat:'CASINO', diff:1 },
  blackjack:{ title:'BLACKJACK NEON', subtitle:'BLACKJACK • 21', lang:'Python', color:'#00ff88', mech:'21', desc:'Llega a 21 sin pasarte, vs dealer.', icon:'♠️', cat:'CASINO', diff:2 },
  poker:{ title:'POKER FACE', subtitle:'POKER • FAROL', lang:'Go', color:'#00aaff', mech:'Póker', desc:'Texas Hold’em simplificado, mejor mano gana.', icon:'🃏', cat:'CASINO', diff:2 },
  dice:{ title:'DICE STORM', subtitle:'DADOS • AZAR', lang:'Rust', color:'#ffdd00', mech:'Dados', desc:'Lanza dados, apuesta par/impar o suma.', icon:'🎲', cat:'CASINO', diff:1 },
  coinflip:{ title:'COIN FLIP', subtitle:'CARA/CRUZ • 50/50', lang:'TypeScript', color:'#ff00ff', mech:'Moneda', desc:'Elige cara o cruz, doble o nada.', icon:'🪙', cat:'CASINO', diff:1 },
  scratch:{ title:'SCRATCH WIN', subtitle:'RASCA • PREMIO', lang:'Swift', color:'#ff6b35', mech:'Rasca', desc:'Rasca 3 iguales para premio.', icon:'🎫', cat:'CASINO', diff:1 },
  lottery:{ title:'LOTTO NEON', subtitle:'LOTERÍA • SORTEO', lang:'Kotlin', color:'#8a2be2', mech:'Sorteo', desc:'Elige 6 números, sorteo neón.', icon:'🎟️', cat:'CASINO', diff:1 },
  crash:{ title:'CRASH ROCKET', subtitle:'CRASH • MULTIPLIER', lang:'C#', color:'#ff3355', mech:'Crash', desc:'Retira antes que crashee el cohete.', icon:'📈', cat:'CASINO', diff:2 },
  mines:{ title:'MINES FIELD', subtitle:'MINAS • RIESGO', lang:'Java', color:'#00ffff', mech:'Minas', desc:'Abre casillas sin pisar mina.', icon:'💣', cat:'CASINO', diff:2 },
}

// Auto-generar 190 ELITE únicos — cada uno BRILLA con identidad propia
const ELITE_TITLES=[
  ['NEON','VOID','CYBER','QUANTUM','HYPER','ASTRO','PHANTOM','CRYSTAL','NOVA','ECLIPSE','PULSE','FUSION','PRISM','VORTEX','MEGA','ULTRA','TURBO','OMEGA','ALPHA','DELTA'],
  ['STORM','BLAST','RUSH','DRIFT','SURGE','BREAK','SPIKE','WAVE','FLARE','STRIKE','FORCE','CORE','EDGE','GRID','PORTAL','NEXUS','DRIVE','BEAT','MIND','FURY']
]
const ELITE_ICONS=['🚀','🌀','💎','⚡','🔥','🌟','🎮','🎯','🧠','💥','🌌','🔮','🛸','🎲','🎨','🏆','💫','🌠','🎪','🏅','🧩','🎭','🫧','🌪️','🪐','🏍️','♟️','🐸','🏓','🎨']
const ELITE_CATS:(GameMeta['cat'])[]=['ARCADE','BRAIN','PULSE','SKILL','CASINO']
const ELITE_LANGS=['TypeScript','Rust','Go','Python','C++','Swift','Kotlin','Java']
const ELITE_MECHS=['Reflex','Táctica','Ritmo','Timing','Fusión','Neón','Cuántico','Hiper','Orbital','Prisma']
for(let i=61;i<=250;i++){
  const id=`ph${String(i).padStart(3,'0')}` as GameId
  if(!(id in GAMES)){
    const a=ELITE_TITLES[0][i % ELITE_TITLES[0].length]
    const b=ELITE_TITLES[1][(i*7) % ELITE_TITLES[1].length]
    const colors=['#00ffff','#ff00ff','#ffdd00','#00ff88','#ff6b35','#8a2be2','#00aaff','#ff3355','#ffffff','#ffaa00']
    const color=colors[i % colors.length]
    const icon=ELITE_ICONS[i % ELITE_ICONS.length]
    const cat=ELITE_CATS[i % ELITE_CATS.length]
    const diff=(i%3+1) as 1|2|3
    const lang=ELITE_LANGS[i % ELITE_LANGS.length]
    const mech=ELITE_MECHS[i % ELITE_MECHS.length]
    GAMES[id]={
      title:`${a} ${b} ${String(i).padStart(3,'0')}`,
      subtitle:`ELITE • ${mech.toUpperCase()} ${cat}`,
      lang, color, mech, icon, cat, diff,
      desc:`Cabina ELITE ${i} — ${mech} neón 60fps. ¡BRILLA y domina el ranking!`
    }
  }
}

type Achievement = { id:string, title:string, desc:string, icon:string, target:number, xp:number, coins:number, cat:string }
const ACHIEVEMENTS: Achievement[] = [
  { id:'first', title:'Primer Contacto', desc:'Juega tu primera partida', icon:'🌟', target:1, xp:50, coins:100, cat:'GENERAL' },
  { id:'snake100', title:'Serpiente Eléctrica', desc:'100 pts en Neon Serpent', icon:'🐍', target:100, xp:100, coins:150, cat:'ARCADE' },
  { id:'brick300', title:'Demolición', desc:'300 pts en Cyber Bricks', icon:'🧱', target:300, xp:100, coins:150, cat:'ARCADE' },
  { id:'void300', title:'As del Vacío', desc:'300 pts en Void Strike', icon:'🚀', target:300, xp:120, coins:180, cat:'ARCADE' },
  { id:'tower10', title:'Arquitecto', desc:'10 pisos en Neon Tower', icon:'🏗️', target:10, xp:120, coins:150, cat:'SKILL' },
  { id:'runner500', title:'Velocista', desc:'500m en Hyper Dash', icon:'🏃', target:500, xp:120, coins:150, cat:'ARCADE' },
  { id:'rhythm500', title:'Oído Absoluto', desc:'500 pts en Pulse Beat', icon:'🎵', target:500, xp:120, coins:150, cat:'PULSE' },
  { id:'fusion1024', title:'Fusión', desc:'Crea 1024 en 2048', icon:'🔢', target:1024, xp:150, coins:200, cat:'BRAIN' },
  { id:'tetris5', title:'Tetrominero', desc:'5 líneas en Tetris', icon:'🧩', target:5, xp:120, coins:150, cat:'BRAIN' },
  { id:'flappy10', title:'Vuelo Neón', desc:'10 pts en Flappy', icon:'🐦', target:10, xp:120, coins:150, cat:'ARCADE' },
  { id:'miner300', title:'Minero Espacial', desc:'300 minerales', icon:'⛏️', target:300, xp:130, coins:180, cat:'ARCADE' },
  { id:'words3', title:'Criptógrafo', desc:'3 palabras adivinadas', icon:'🔤', target:3, xp:100, coins:150, cat:'BRAIN' },
  { id:'aim200', title:'Francotirador', desc:'200 pts en Aim Lab', icon:'🎯', target:200, xp:120, coins:150, cat:'SKILL' },
  { id:'maze3', title:'Escapista', desc:'3 laberintos completados', icon:'🌀', target:3, xp:130, coins:180, cat:'BRAIN' },
  { id:'plinko500', title:'Jackpot', desc:'500 pts en Plinko', icon:'🎲', target:500, xp:130, coins:200, cat:'SKILL' },
  { id:'collector5', title:'Coleccionista', desc:'Juega 5 juegos diferentes', icon:'🗂️', target:5, xp:200, coins:300, cat:'GENERAL' },
  { id:'collector15', title:'Maestro Arcade', desc:'Juega los 15 juegos', icon:'👑', target:15, xp:400, coins:600, cat:'GENERAL' },
  { id:'collector25', title:'Leyenda RGB', desc:'Juega los 25 juegos', icon:'🌈', target:25, xp:700, coins:1000, cat:'GENERAL' },
  { id:'collector50', title:'Dios del Arcade', desc:'Juega los 50 juegos', icon:'🌈', target:50, xp:1200, coins:2000, cat:'GENERAL' },
  { id:'level5', title:'Nivel 5', desc:'Alcanza nivel 5', icon:'⬆️', target:5, xp:200, coins:300, cat:'GENERAL' },
  { id:'level10', title:'Nivel 10', desc:'Alcanza nivel 10', icon:'🚀', target:10, xp:400, coins:600, cat:'GENERAL' },
  { id:'coins1000', title:'Magnate', desc:'Acumula 1000 monedas', icon:'💰', target:1000, xp:150, coins:0, cat:'GENERAL' },
  { id:'coins5000', title:'Millonario RGB', desc:'Acumula 5000 monedas', icon:'💎', target:5000, xp:300, coins:0, cat:'GENERAL' },
  { id:'streak3', title:'Racha 3', desc:'3 días seguidos', icon:'🔥', target:3, xp:150, coins:250, cat:'GENERAL' },
  { id:'pong10', title:'Maestro Pong', desc:'100 pts en Neon Pong', icon:'🏓', target:100, xp:120, coins:150, cat:'ARCADE' },
  { id:'color500', title:'Cromático', desc:'500 pts en Chroma Fusion', icon:'🎨', target:500, xp:120, coins:150, cat:'BRAIN' },
  { id:'dodge300', title:'Intocable', desc:'300 pts en Dodge Storm', icon:'🌪️', target:300, xp:120, coins:150, cat:'ARCADE' },
  { id:'typing500', title:'Teclado Neón', desc:'500 pts en Neon Type', icon:'⌨️', target:500, xp:120, coins:150, cat:'SKILL' },
  { id:'frogger100', title:'Saltarín', desc:'100 pts en Frogger Neon', icon:'🐸', target:100, xp:120, coins:150, cat:'ARCADE' },
  { id:'pinball200', title:'Pinball Wizard', desc:'200 pts en Neon Pinball', icon:'🎯', target:200, xp:120, coins:150, cat:'ARCADE' },
  { id:'bubble300', title:'Burbujas', desc:'300 pts en Bubble Pop', icon:'🫧', target:300, xp:120, coins:150, cat:'BRAIN' },
  { id:'racing300', title:'Piloto', desc:'300m en Neon Racing', icon:'🏎️', target:300, xp:120, coins:150, cat:'ARCADE' },
  { id:'ninja200', title:'Ninja', desc:'200 pts en Ninja Dash', icon:'🥷', target:200, xp:120, coins:150, cat:'ARCADE' },
  { id:'harvest200', title:'Cosechador', desc:'200 pts en Harvest Moon', icon:'🌾', target:200, xp:120, coins:150, cat:'BRAIN' },
  { id:'jetpack300', title:'Jetpack', desc:'300m en Jetpack Joy', icon:'🚀', target:300, xp:120, coins:150, cat:'ARCADE' },
  { id:'match500', title:'Match Maestro', desc:'500 pts en Match 3', icon:'💎', target:500, xp:120, coins:150, cat:'BRAIN' },
  { id:'survival300', title:'Superviviente', desc:'300 pts en Survival Horde', icon:'🧟', target:300, xp:130, coins:180, cat:'ARCADE' },
  { id:'invaders100', title:'Invasor', desc:'100 pts en Space Invaders', icon:'👾', target:100, xp:120, coins:150, cat:'ARCADE' },
  { id:'dungeon100', title:'Mazmorra', desc:'100 pts en Dungeon Crawl', icon:'🏰', target:100, xp:120, coins:150, cat:'ARCADE' },
  { id:'snakeduel50', title:'Duelo', desc:'50 pts en Snake Duel', icon:'🐍', target:50, xp:120, coins:150, cat:'ARCADE' },
  { id:'puzzlebox50', title:'Caja Puzzle', desc:'50 pts en Puzzle Box', icon:'🧩', target:50, xp:120, coins:150, cat:'BRAIN' },
  { id:'memoryultra100', title:'Memoria Ultra', desc:'100 pts en Memory Ultra', icon:'🧠', target:100, xp:130, coins:180, cat:'BRAIN' },
  { id:'laser20', title:'Láser', desc:'20 hits en Laser Maze', icon:'🔦', target:20, xp:130, coins:180, cat:'BRAIN' },
  { id:'tron50', title:'Tron Runner', desc:'50 pts en Tron Grid', icon:'🏍️', target:50, xp:130, coins:180, cat:'ARCADE' },
  { id:'sudoku1', title:'Sudoku Master', desc:'Completa 1 Sudoku', icon:'🔢', target:1, xp:200, coins:250, cat:'BRAIN' },
  { id:'chessultra50', title:'Gran Maestro', desc:'50 pts en Chess Ultra', icon:'♔', target:50, xp:130, coins:180, cat:'BRAIN' },
  { id:'asteroids200', title:'Cazador Asteroides', desc:'200 pts en Asteroid Storm', icon:'☄️', target:200, xp:130, coins:180, cat:'ARCADE' },
  { id:'wordleultra3', title:'Lexicón', desc:'3 aciertos en Wordle Ultra', icon:'🔤', target:3, xp:130, coins:180, cat:'BRAIN' },
  { id:'gravity300', title:'Anti-Gravedad', desc:'300m en Gravity Flip', icon:'🪐', target:300, xp:120, coins:150, cat:'ARCADE' },
]

type Daily = { id:string, title:string, desc:string, icon:string, target:number, rewardXp:number, rewardCoins:number, gameId?:GameId }

const DAILY_POOL: Daily[] = [
  { id:'d_score100', title:'Puntos Neón', desc:'Consigue 100 pts en cualquier juego', icon:'💎', target:100, rewardXp:60, rewardCoins:80 },
  { id:'d_play3', title:'Sesión', desc:'Juega 3 partidas', icon:'🎮', target:3, rewardXp:50, rewardCoins:60 },
  { id:'d_snake', title:'Serpiente', desc:'50 pts en Neon Serpent', icon:'🐍', target:50, rewardXp:40, rewardCoins:50, gameId:'snake' },
  { id:'d_bricks', title:'Ladrillos', desc:'150 pts en Cyber Bricks', icon:'🧱', target:150, rewardXp:45, rewardCoins:60, gameId:'breakout' },
  { id:'d_shooter', title:'Caza', desc:'120 pts en Void Strike', icon:'🚀', target:120, rewardXp:45, rewardCoins:60, gameId:'shooter' },
  { id:'d_runner', title:'Sprint', desc:'200m en Hyper Dash', icon:'🏃', target:200, rewardXp:45, rewardCoins:60, gameId:'runner' },
  { id:'d_rhythm', title:'Ritmo', desc:'200 pts en Pulse Beat', icon:'🎵', target:200, rewardXp:45, rewardCoins:60, gameId:'rhythm' },
  { id:'d_fusion', title:'Fusión diaria', desc:'500 pts en 2048', icon:'🔢', target:500, rewardXp:45, rewardCoins:60, gameId:'fusion' },
  { id:'d_aim', title:'Puntería', desc:'80 pts en Aim Lab', icon:'🎯', target:80, rewardXp:45, rewardCoins:60, gameId:'aim' },
  { id:'d_maze', title:'Laberinto', desc:'Completa 1 laberinto', icon:'🌀', target:1, rewardXp:50, rewardCoins:70, gameId:'maze' },
  { id:'d_pong', title:'Pong', desc:'40 pts en Neon Pong', icon:'🏓', target:40, rewardXp:45, rewardCoins:60, gameId:'pong' },
  { id:'d_color', title:'Cromático', desc:'120 pts en Chroma Fusion', icon:'🎨', target:120, rewardXp:45, rewardCoins:60, gameId:'color' },
  { id:'d_dodge', title:'Esquiva', desc:'150 pts en Dodge Storm', icon:'🌪️', target:150, rewardXp:45, rewardCoins:60, gameId:'dodge' },
  { id:'d_typing', title:'Tecleo', desc:'80 pts en Neon Type', icon:'⌨️', target:80, rewardXp:45, rewardCoins:60, gameId:'typing' },
  { id:'d_gravity', title:'Gravedad', desc:'120m en Gravity Flip', icon:'🪐', target:120, rewardXp:45, rewardCoins:60, gameId:'gravity' },
  { id:'d_frogger', title:'Rana', desc:'80 pts en Frogger Neon', icon:'🐸', target:80, rewardXp:45, rewardCoins:60, gameId:'frogger' },
  { id:'d_pinball', title:'Pinball', desc:'80 pts en Neon Pinball', icon:'🎯', target:80, rewardXp:45, rewardCoins:60, gameId:'pinball' },
  { id:'d_bubble', title:'Burbujas', desc:'100 pts en Bubble Pop', icon:'🫧', target:100, rewardXp:45, rewardCoins:60, gameId:'bubble' },
  { id:'d_racing', title:'Carrera', desc:'200m en Neon Racing', icon:'🏎️', target:200, rewardXp:45, rewardCoins:60, gameId:'racing' },
  { id:'d_ninja', title:'Ninja', desc:'80 pts en Ninja Dash', icon:'🥷', target:80, rewardXp:45, rewardCoins:60, gameId:'ninja' },
  { id:'d_harvest', title:'Cosecha', desc:'80 pts en Harvest Moon', icon:'🌾', target:80, rewardXp:45, rewardCoins:60, gameId:'harvest' },
  { id:'d_jetpack', title:'Jetpack', desc:'120m en Jetpack Joy', icon:'🚀', target:120, rewardXp:45, rewardCoins:60, gameId:'jetpack' },
  { id:'d_match', title:'Match', desc:'120 pts en Match 3', icon:'💎', target:120, rewardXp:45, rewardCoins:60, gameId:'match' },
  { id:'d_survival', title:'Horda', desc:'120 pts en Survival Horde', icon:'🧟', target:120, rewardXp:45, rewardCoins:60, gameId:'survival' },
  { id:'d_invaders', title:'Invasores', desc:'80 pts en Space Invaders', icon:'👾', target:80, rewardXp:45, rewardCoins:60, gameId:'invaders' },
  { id:'d_dungeon', title:'Mazmorra', desc:'80 pts en Dungeon Crawl', icon:'🏰', target:80, rewardXp:45, rewardCoins:60, gameId:'dungeon' },
  { id:'d_snakeduel', title:'Duelo', desc:'40 pts en Snake Duel', icon:'🐍', target:40, rewardXp:45, rewardCoins:60, gameId:'snakeduel' },
  { id:'d_puzzlebox', title:'Puzzle', desc:'40 pts en Puzzle Box', icon:'🧩', target:40, rewardXp:45, rewardCoins:60, gameId:'puzzlebox' },
  { id:'d_memoryultra', title:'Ultra Memoria', desc:'80 pts en Memory Ultra', icon:'🧠', target:80, rewardXp:45, rewardCoins:60, gameId:'memoryultra' },
  { id:'d_laser', title:'Láser', desc:'10 hits en Laser Maze', icon:'🔦', target:10, rewardXp:45, rewardCoins:60, gameId:'laser' },
  { id:'d_defense', title:'Defensa', desc:'Gana 80 pts en Laser Grid', icon:'🛡️', target:80, rewardXp:50, rewardCoins:70, gameId:'defense' },
  { id:'d_tron', title:'Tron', desc:'40 pts en Tron Grid', icon:'🏍️', target:40, rewardXp:45, rewardCoins:60, gameId:'tron' },
  { id:'d_sudoku', title:'Sudoku', desc:'Completa 1 Sudoku', icon:'🔢', target:1, rewardXp:60, rewardCoins:80, gameId:'sudoku' },
  { id:'d_chessultra', title:'Ajedrez Élite', desc:'40 pts en Chess Ultra', icon:'♔', target:40, rewardXp:45, rewardCoins:60, gameId:'chessultra' },
  { id:'d_asteroids', title:'Asteroides', desc:'80 pts en Asteroid Storm', icon:'☄️', target:80, rewardXp:45, rewardCoins:60, gameId:'asteroidsultra' },
  { id:'d_wordleultra', title:'Wordle Élite', desc:'2 aciertos en Wordle Ultra', icon:'🔤', target:2, rewardXp:45, rewardCoins:60, gameId:'wordleultra' },
]

function getDailyForDate(dateStr:string): Daily[]{
  let hash=0; for(let i=0;i<dateStr.length;i++) hash=(hash*31+dateStr.charCodeAt(i))>>>0
  const pick:Daily[]=[]
  const pool=[...DAILY_POOL]
  for(let i=0;i<3;i++){
    hash=(hash*1664525+1013904223)>>>0
    const idx=hash % pool.length
    pick.push(pool[idx]); pool.splice(idx,1)
  }
  return pick
}

export default function App(){
  const [active, setActive] = useState<GameId>('snake')
  const [filter, setFilter] = useState<'ALL'|'ARCADE'|'BRAIN'|'PULSE'|'SKILL'|'CASINO'>('ALL')
  const [search, setSearch] = useState('')
  const [muted, setMuted] = useState(false)
  const [showDaily, setShowDaily] = useState(false)
  const [showAch, setShowAch] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [toasts, setToasts] = useState<{id:number,text:string,sub:string}[]>([])
  const [globalReady, setGlobalReady] = useState(false)
  const [started, setStarted] = useState(false)
  const [rgbMode, setRgbMode] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'idle'|'syncing'|'ok'|'error'>('idle')
  const hasHydrated = useRef(false)
  const lastEvent = useRef<string>('')
  const lastServerUpdate = useRef<string>('')

  // player persistence
  const [level, setLevel] = useState(()=> Number(localStorage.getItem('neo_level')||1))
  const [xp, setXp] = useState(()=> Number(localStorage.getItem('neo_xp')||0))
  const [coins, setCoins] = useState(()=> Number(localStorage.getItem('neo_coins')||250))
  const [streak, setStreak] = useState(()=> Number(localStorage.getItem('neo_streak')||1))
  const [highScores, setHighScores] = useState<Record<GameId,number>>(()=>{
    const defaults:any={}; (Object.keys(GAMES) as GameId[]).forEach(k=>defaults[k]=0)
    try{ const v=localStorage.getItem('neo_highscores'); if(v) return {...defaults, ...JSON.parse(v)} }catch{}
    return defaults as Record<GameId,number>
  })
  const [plays, setPlays] = useState<Record<GameId,number>>(()=>{
    const defaults:any={}; (Object.keys(GAMES) as GameId[]).forEach(k=>defaults[k]=0)
    try{ const v=localStorage.getItem('neo_plays'); if(v) return {...defaults, ...JSON.parse(v)} }catch{}
    return defaults as Record<GameId,number>
  })
  const [achProg, setAchProg] = useState<Record<string,number>>(()=>{
    try{ const v=localStorage.getItem('neo_ach_prog'); if(v) return JSON.parse(v)}catch{}
    return {}
  })
  const [achUnlocked, setAchUnlocked] = useState<Record<string,boolean>>(()=>{
    try{ const v=localStorage.getItem('neo_ach_unlocked'); if(v) return JSON.parse(v)}catch{} return {}
  })
  const todayStr = new Date().toISOString().slice(0,10)
  const [dailyProgress, setDailyProgress] = useState<Record<string,number>>(()=>{
    try{ const raw=localStorage.getItem('neo_daily'); if(raw){ const o=JSON.parse(raw); if(o.date===todayStr) return o.progress } }catch{}
    return {}
  })
  const [dailyDone, setDailyDone] = useState<Record<string,boolean>>(()=>{
    try{ const raw=localStorage.getItem('neo_daily_done'); if(raw){ const o=JSON.parse(raw); if(o.date===todayStr) return o.done } }catch{} return {}
  })

  const dailyList = useMemo(()=> getDailyForDate(todayStr),[todayStr])

  const addToast=(text:string,sub:string)=>{
    const id=Date.now()+Math.random()
    setToasts(t=>[...t,{id,text,sub}])
    setTimeout(()=> setToasts(t=> t.filter(x=>x.id!==id)), 2800)
  }
  const playClick=useCallback(()=>{
    if(muted) return
    try{
      const ctx=new (window.AudioContext||(window as any).webkitAudioContext)()
      const o=ctx.createOscillator(); const g=ctx.createGain()
      o.type='square'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.14,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.11)
      o.start(); o.stop(ctx.currentTime+0.12)
    }catch{}
  },[muted])

  // per-game start reset
  useEffect(()=> setStarted(false),[active])

  // global + per-game ENTER handling
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(!globalReady && e.key==='Enter'){ setGlobalReady(true); playClick(); return }
      if(globalReady && !started && e.key==='Enter'){ setStarted(true); playClick(); }
      if(started && e.key==='Escape'){ setStarted(false); playClick(); }
    }
    window.addEventListener('keydown',h)
    return()=> window.removeEventListener('keydown',h)
  },[globalReady, started, playClick])

  // streak on mount
  useEffect(()=>{
    const last=localStorage.getItem('neo_last_login')
    if(last!==todayStr){
      if(last){
        const d1=new Date(last), d2=new Date(todayStr)
        const diff=(d2.getTime()-d1.getTime())/86400000
        if(diff===1) setStreak(s=>{ const ns=s+1; localStorage.setItem('neo_streak',String(ns)); return ns})
        else if(diff>1) { setStreak(1); localStorage.setItem('neo_streak','1')}
      }
      localStorage.setItem('neo_last_login',todayStr)
    }
  },[todayStr])

  // persist
  useEffect(()=> localStorage.setItem('neo_level',String(level)),[level])
  useEffect(()=> localStorage.setItem('neo_xp',String(xp)),[xp])
  useEffect(()=> localStorage.setItem('neo_coins',String(coins)),[coins])
  useEffect(()=> localStorage.setItem('neo_highscores',JSON.stringify(highScores)),[highScores])
  useEffect(()=> localStorage.setItem('neo_plays',JSON.stringify(plays)),[plays])
  useEffect(()=> localStorage.setItem('neo_ach_prog',JSON.stringify(achProg)),[achProg])
  useEffect(()=> localStorage.setItem('neo_ach_unlocked',JSON.stringify(achUnlocked)),[achUnlocked])
  useEffect(()=> localStorage.setItem('neo_daily',JSON.stringify({date:todayStr, progress:dailyProgress})),[dailyProgress,todayStr])
  useEffect(()=> localStorage.setItem('neo_daily_done',JSON.stringify({date:todayStr, done:dailyDone})),[dailyDone,todayStr])

  // --- SYNC con terminal (arcade-stats.json via /api/stats) ---
  useEffect(()=>{
    fetch('/api/stats').then(r=> r.ok? r.json(): null).then(data=>{
      if(data && typeof data.level==='number'){
        const serverTotal=Object.values(data.highScores||{}).reduce((a:number,b:any)=>a+Number(b),0)
        const localTotal=Object.values(highScores).reduce((a,b)=>a+b,0)
        if(serverTotal>localTotal || data.level>level || data.coins>coins){
          if(typeof data.level==='number') setLevel(data.level)
          if(typeof data.xp==='number') setXp(data.xp)
          if(typeof data.coins==='number') setCoins(data.coins)
          if(data.highScores) setHighScores((prev:any)=> ({...prev, ...data.highScores}))
          if(data.plays) setPlays((prev:any)=> ({...prev, ...data.plays}))
          if(data.achUnlocked) setAchUnlocked((prev:any)=> ({...prev, ...data.achUnlocked}))
        }
        lastServerUpdate.current=data.lastUpdate||''
        setSyncStatus('ok')
      } else setSyncStatus('idle')
      hasHydrated.current=true
    }).catch(()=>{ setSyncStatus('error'); hasHydrated.current=true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  // push a servidor cuando cambian datos (debounced)
  useEffect(()=>{
    if(!hasHydrated.current) return
    setSyncStatus('syncing')
    const t=setTimeout(()=>{
      const payload={ level, xp, coins, streak, highScores, plays, achUnlocked, lastUpdate:new Date().toISOString(), _event: lastEvent.current || 'sync' }
      fetch('/api/stats',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r=>{
        if(r.ok) setSyncStatus('ok'); else setSyncStatus('error')
      }).catch(()=> setSyncStatus('error'))
      lastEvent.current=''
    }, 450)
    return()=> clearTimeout(t)
  },[level, xp, coins, streak, highScores, plays, achUnlocked])

  // poll desde servidor para ver cambios hechos en terminal (bidireccional)
  useEffect(()=>{
    if(!hasHydrated.current) return
    const id=setInterval(()=>{
      fetch('/api/stats').then(r=> r.ok? r.json():null).then(data=>{
        if(!data || !data.lastUpdate) return
        if(data.lastUpdate===lastServerUpdate.current) return
        lastServerUpdate.current=data.lastUpdate
        const serverTotal=Object.values(data.highScores||{}).reduce((a:number,b:any)=>a+Number(b),0)
        const localTotal=Object.values(highScores).reduce((a:number,b:any)=>a+Number(b),0)
        if(serverTotal!==localTotal || data.level!==level || data.coins!==coins || JSON.stringify(data.achUnlocked)!==JSON.stringify(achUnlocked)){
          if(typeof data.level==='number') setLevel(data.level)
          if(typeof data.xp==='number') setXp(data.xp)
          if(typeof data.coins==='number') setCoins(data.coins)
          if(typeof data.streak==='number') setStreak(data.streak)
          if(data.highScores) setHighScores((prev:any)=> ({...prev, ...data.highScores}))
          if(data.plays) setPlays((prev:any)=> ({...prev, ...data.plays}))
          if(data.achUnlocked) setAchUnlocked((prev:any)=> ({...prev, ...data.achUnlocked}))
          setSyncStatus('ok')
        }
      }).catch(()=>{})
    }, 2800)
    return()=> clearInterval(id)
  },[level, xp, coins, streak, highScores, plays, achUnlocked])

  const xpToNext = level*250
  const xpPct = Math.min(100, (xp/xpToNext)*100)
  const totalScore = useMemo(()=> Object.values(highScores).reduce((a,b)=>a+b,0),[highScores])
  const gamesPlayedDistinct = useMemo(()=> Object.values(plays).filter(v=>v>0).length,[plays])
  const totalPlays = useMemo(()=> Object.values(plays).reduce((a,b)=>a+b,0),[plays])

  const addXp=(amount:number)=>{
    setXp(curr=>{
      let nx=curr+amount
      let nl=level
      let ncoins=coins
      while(nx >= nl*250){
        nx -= nl*250; nl++
        ncoins+= 100 + nl*10
        addToast(`¡NIVEL ${nl}!`, `+${100+nl*10} monedas`)
      }
      if(nl!==level) setLevel(nl)
      if(ncoins!==coins) setCoins(ncoins)
      return nx
    })
  }

  const handleScore = useCallback((s:number)=>{
    const game=active
    lastEvent.current = `${GAMES[game].title} ${s}pts`
    setPlays(p=> ({...p, [game]:(p[game]||0)+1}))
    setHighScores(prev=>{
      const cur=prev[game]||0
      if(s>cur){
        const diff=s-cur
        const coinsEarn=Math.floor(diff/12)+5
        setCoins(c=>c+coinsEarn)
        addXp(Math.floor(diff/8)+10)
        addToast(`+${coinsEarn} monedas`, `${GAMES[game].title} — nuevo récord!`)
        const nxt={...prev, [game]:s}
        return nxt
      } else if(s>0){
        setCoins(c=>c+1)
        addXp(5)
      }
      return prev
    })
    // daily progress
    setDailyProgress(d=>{
      const nd={...d}
      dailyList.forEach(ch=>{
        if(dailyDone[ch.id]) return
        if(ch.id==='d_score100'){
          nd[ch.id]=(nd[ch.id]||0)+ Math.min(s, ch.target - (nd[ch.id]||0))
        } else if(ch.id==='d_play3'){
          nd[ch.id]=(nd[ch.id]||0)+1
        } else if(ch.gameId===game){
          nd[ch.id]=Math.min(ch.target, Math.max(nd[ch.id]||0, s))
          if(ch.id==='d_maze' && s>=100) nd[ch.id]=(nd[ch.id]||0)+1
        }
      })
      dailyList.forEach(ch=>{
        if(!dailyDone[ch.id] && (nd[ch.id]||0)>=ch.target){
          setDailyDone(dd=> ({...dd, [ch.id]:true}))
          setCoins(c=>c+ch.rewardCoins)
          addXp(ch.rewardXp)
          addToast(`Desafío completado!`, `${ch.title} +${ch.rewardCoins}c +${ch.rewardXp}xp`)
        }
      })
      return nd
    })
    // achievements
    setAchProg(ap=>{
      const na={...ap}
      const setIf=(id:string, val:number)=>{
        const prev=na[id]||0
        if(val>prev) na[id]=val
        if(!achUnlocked[id] && na[id] >= (ACHIEVEMENTS.find(a=>a.id===id)?.target||9999)){
          setAchUnlocked(au=> ({...au, [id]:true}))
          const ach=ACHIEVEMENTS.find(a=>a.id===id)!
          setCoins(c=>c+ach.coins)
          addXp(ach.xp)
          addToast(`¡LOGRO! ${ach.title}`, ach.desc)
        }
      }
      setIf('first', totalPlays+1)
      if(game==='snake') setIf('snake100', Math.max(na['snake100']||0, s))
      if(game==='breakout') setIf('brick300', Math.max(na['brick300']||0, s))
      if(game==='shooter') setIf('void300', Math.max(na['void300']||0, s))
      if(game==='stack') setIf('tower10', Math.max(na['tower10']||0, s))
      if(game==='runner') setIf('runner500', Math.max(na['runner500']||0, s))
      if(game==='rhythm') setIf('rhythm500', Math.max(na['rhythm500']||0, s))
      if(game==='fusion') setIf('fusion1024', Math.max(na['fusion1024']||0, s))
      if(game==='tetris') setIf('tetris5', Math.max(na['tetris5']||0, s/45))
      if(game==='flappy') setIf('flappy10', Math.max(na['flappy10']||0, s))
      if(game==='miner') setIf('miner300', Math.max(na['miner300']||0, s))
      if(game==='words') setIf('words3', (na['words3']||0)+ (s>=80?1:0))
      if(game==='aim') setIf('aim200', Math.max(na['aim200']||0, s))
      if(game==='maze') setIf('maze3', (na['maze3']||0)+ (s>=100?1:0))
      if(game==='plinko') setIf('plinko500', Math.max(na['plinko500']||0, s))
      setIf('collector5', gamesPlayedDistinct + (plays[game]===0?1:0))
      setIf('collector15', gamesPlayedDistinct + (plays[game]===0?1:0))
      setIf('collector25', gamesPlayedDistinct + (plays[game]===0?1:0))
      setIf('collector50', gamesPlayedDistinct + (plays[game]===0?1:0))
      setIf('level5', level)
      setIf('level10', level)
      setIf('coins1000', coins)
      setIf('coins5000', coins)
      setIf('streak3', streak)
      if(game==='pong') setIf('pong10', Math.max(na['pong10']||0, s))
      if(game==='pongultra') setIf('pong10', Math.max(na['pong10']||0, s))
      if(game==='color') setIf('color500', Math.max(na['color500']||0, s))
      if(game==='dodge') setIf('dodge300', Math.max(na['dodge300']||0, s))
      if(game==='typing') setIf('typing500', Math.max(na['typing500']||0, s))
      if(game==='gravity') setIf('gravity300', Math.max(na['gravity300']||0, s))
      if(game==='invaders') setIf('invaders100', Math.max(na['invaders100']||0, s))
      if(game==='dungeon') setIf('dungeon100', Math.max(na['dungeon100']||0, s))
      if(game==='snakeduel') setIf('snakeduel50', Math.max(na['snakeduel50']||0, s))
      if(game==='puzzlebox') setIf('puzzlebox50', Math.max(na['puzzlebox50']||0, s))
      if(game==='memoryultra') setIf('memoryultra100', Math.max(na['memoryultra100']||0, s))
      if(game==='laser') setIf('laser20', Math.max(na['laser20']||0, s))
      if(game==='tron') setIf('tron50', Math.max(na['tron50']||0, s))
      if(game==='sudoku') setIf('sudoku1', (na['sudoku1']||0)+1)
      if(game==='chessultra') setIf('chessultra50', Math.max(na['chessultra50']||0, s))
      if(game==='asteroidsultra') setIf('asteroids200', Math.max(na['asteroids200']||0, s))
      if(game==='wordleultra') setIf('wordleultra3', (na['wordleultra3']||0)+ (s>=50?1:0))
      // genérico para cualquier juego elite no mapeado: asegura progreso de coleccionista
      if(!['snake','breakout','shooter','stack','runner','rhythm','fusion','tetris','flappy','miner','words','aim','maze','plinko','pong','color','dodge','typing','gravity','invaders','dungeon','snakeduel','puzzlebox','memoryultra','laser','tron','sudoku','chessultra','asteroidsultra','wordleultra'].includes(game)){
        setIf('collector50', gamesPlayedDistinct + (plays[game]===0?1:0))
      }
      return na
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active, highScores, plays, totalPlays, gamesPlayedDistinct, level, coins, streak, dailyList, dailyDone])

  const handleShare = useCallback(async ()=>{
    const url = 'https://wilmerf17.github.io/Neo-Arcade/'
    const text = `Neo Elite 250 — Nivel ${level} • ${totalScore.toLocaleString()} pts • ${gamesPlayedDistinct}/250 cabinas • ¡Juega ${GAMES[active].title} conmigo!`
    try{
      if(navigator.share){ await navigator.share({title:'Neo Elite 250', text, url}); addToast('¡Compartido!','Link copiado a tus apps') }
      else if(navigator.clipboard){ await navigator.clipboard.writeText(`${text} ${url}`); addToast('¡Link copiado!','Pégalo en WhatsApp/Twitter') }
      else { addToast(url, text.slice(0,60)) }
    }catch{}
    playClick()
  },[level, totalScore, gamesPlayedDistinct, active, playClick])

  // Sistema monetario virtual 18+ — sin dinero real
  const handleBet = useCallback((amount:number)=>{
    if(coins < amount){ addToast('Sin monedas','Juega arcade para ganar más'); return false }
    setCoins(c=>c-amount)
    return true
  },[coins])
  const handleWin = useCallback((amount:number)=>{
    if(amount>0){
      setCoins(c=>c+amount)
      addToast(`+${amount} 💰`, 'Ganancia casino virtual')
      // también cuenta como score para progresión
      handleScore(amount)
    } else {
      handleScore(0)
    }
  },[handleScore])

  const filteredGames = useMemo(()=>{
    const term=search.toLowerCase()
    return (Object.keys(GAMES) as GameId[]).filter(id=>{
      const g=GAMES[id]
      if(filter!=='ALL' && g.cat!==filter) return false
      if(term && !g.title.toLowerCase().includes(term) && !g.subtitle.toLowerCase().includes(term)) return false
      return true
    })
  },[filter, search])

  const cur = GAMES[active]

  return (
    <div className="min-h-screen relative crt overflow-hidden selection:bg-cyan-400 selection:text-black">
      <a href="#arcade" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-full focus:font-black">Saltar al juego</a>
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#040510]" />
        <div className="absolute inset-0 opacity-40" style={{background:`radial-gradient(900px 600px at 18% 8%, rgba(0,255,255,0.16), transparent 60%), radial-gradient(800px 600px at 92% 92%, rgba(255,0,255,0.18), transparent 60%), radial-gradient(700px 700px at 50% 45%, rgba(120,0,255,0.13), transparent 70%)`}}/>
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 h-[420px] opacity-25" style={{background:`linear-gradient(to top, rgba(0,255,255,0.1), transparent), repeating-linear-gradient(90deg, rgba(255,0,255,0.05) 0 1px, transparent 1px 80px)`}}/>
        <div className={`absolute w-[420px] h-[420px] rounded-full blur-[90px] opacity-20 animate-float ${rgbMode?'rgb-animate':''}`} style={{background:'#00ffff', left:'4%', top:'16%'}}/>
        <div className={`absolute w-[560px] h-[560px] rounded-full blur-[120px] opacity-14 animate-float ${rgbMode?'rgb-animate':''}`} style={{background:'#ff00ff', right:'-60px', top:'38%', animationDelay:'2s'}}/>
      </div>

      {!globalReady && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="absolute inset-0 opacity-30" style={{background:`radial-gradient(600px 400px at 50% 30%, rgba(0,255,255,0.22), transparent 70%), radial-gradient(500px 500px at 80% 80%, rgba(255,0,255,0.18), transparent 70%)`}}/>
          <div className="relative glass rounded-[28px] border border-cyan-400/30 max-w-[560px] w-full p-8 sm:p-10 text-center shadow-[0_0_50px_rgba(0,255,255,0.25)]">
            <img src="/icon.png" alt="NEO ARCADE" className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-[0_0_24px_rgba(0,255,255,0.6)] border border-white/10 animate-float" onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'}} />
            <h2 className="mt-5 font-black text-white text-2xl sm:text-3xl tracking-widest" style={{fontFamily:'Orbitron'}}>NEO ELITE 250</h2>
            <p className="text-[11px] tracking-[0.38em] font-mono text-cyan-300 mt-1">SALÓN INMERSIVO • 250 CABINAS • RGB • 2026</p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff88]"/>
              <span className="text-xs font-mono tracking-widest text-white/70">250 JUEGOS • RGB • PROGRESO • LOGROS • DIARIO • CASINO</span>
            </div>
            <div className="mt-8">
              <p className="font-black text-cyan-300 tracking-widest text-sm animate-pulse" style={{fontFamily:'Orbitron'}}>— PRESIONA ENTER PARA JUGAR —</p>
              <p className="text-xs font-mono text-white/50 mt-2">o haz click en JUGAR</p>
              <button onClick={()=>{ setGlobalReady(true); playClick() }} className="mt-5 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black tracking-widest hover:scale-105 transition shadow-[0_0_20px_rgba(0,255,255,0.4)]" style={{fontFamily:'Orbitron'}}>ENTRAR AL ARCADE [ENTER]</button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] font-mono">
              <span className="glass rounded-full py-1.5 text-white/60">WASD / Flechas</span>
              <span className="glass rounded-full py-1.5 text-white/60">ENTER Jugar</span>
              <span className="glass rounded-full py-1.5 text-white/60">ESC Pausa</span>
            </div>
            <p className="text-[11px] font-mono text-white/30 mt-4">Consejo: usa audífonos para audio neón • R reinicia • P pausa</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/30 border-b border-white/10 shine-sweep">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="NEO" className={`w-10 h-10 rounded-xl object-cover shadow-[0_0_22px_rgba(0,255,255,0.6)] border border-white/10 ${rgbMode?'rgb-animate':''}`} style={{background:'linear-gradient(135deg, #00ffff, #ff00ff)'}} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; const n=(e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement; if(n) n.style.display='flex'}} />
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 hidden items-center justify-center font-black text-black text-lg shadow-[0_0_22px_rgba(0,255,255,0.6)] ${rgbMode?'rgb-animate':''}`} style={{fontFamily:'Orbitron'}}>N</div>
            <div>
              <h1 className="font-black tracking-widest leading-none text-white text-[18px] sm:text-[22px]" style={{fontFamily:'Orbitron'}}>NEO ELITE 250</h1>
              <p className="text-[11px] tracking-[0.32em] text-cyan-300 font-mono -mt-1">SALÓN INMERSIVO • 250 CABINAS RGB</p>
            </div>
            <span className="hidden xl:inline-flex ml-2 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest bg-white/10 border border-white/10 text-white/60">v4.0 • ELITE 250</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="glass rounded-full px-3 py-1.5 flex items-center gap-3 min-w-[210px]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center font-black text-black text-xs" style={{fontFamily:'Orbitron'}}>{level}</div>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-mono tracking-widest"><span className="text-white/60">NIVEL {level}</span><span className="text-cyan-300">{xp}/{xpToNext} XP</span></div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1"><div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all" style={{width:`${xpPct}%`}}/></div>
              </div>
            </div>
            <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2">
              <span className="text-amber-300">💰</span><span className="font-black text-white text-sm" style={{fontFamily:'Orbitron'}}>{coins.toLocaleString()}</span>
              <span className="w-px h-4 bg-white/10 mx-1"/>
              <span className="text-orange-400">🔥</span><span className="font-bold text-white text-sm">{streak}</span>
              <span className="text-[11px] font-mono text-white/50">días</span>
            </div>
            <div className="hidden sm:flex glass rounded-full px-2 py-1 items-center gap-1.5">
              <span className="text-[11px] font-mono tracking-widest text-white/60">TOTAL</span>
              <span className="font-black text-cyan-300 text-sm" style={{fontFamily:'Orbitron'}}>{totalScore.toLocaleString()}</span>
              <span className="text-[11px] font-mono text-white/45">• {gamesPlayedDistinct}/250</span>
            </div>
              <button onClick={()=>{setShowDaily(true); playClick()}} aria-label="Ver desafíos diarios" className="relative px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs tracking-widest">🎯 DIARIO {dailyList.filter(d=> dailyDone[d.id]).length}/3</button>
            <button onClick={()=>{setShowAch(true); playClick()}} aria-label="Ver logros" className="px-3 py-1.5 rounded-full glass font-mono text-xs tracking-widest text-white/80 hover:bg-white/10">🏆 LOGROS {Object.values(achUnlocked).filter(Boolean).length}/{ACHIEVEMENTS.length}</button>
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest border ${syncStatus==='ok'?'bg-emerald-500/15 border-emerald-400/30 text-emerald-300': syncStatus==='syncing'?'bg-amber-500/15 border-amber-400/30 text-amber-300 animate-pulse': syncStatus==='error'?'bg-red-500/10 border-red-400/20 text-red-300':'glass border-white/10 text-white/45'}`} title={syncStatus==='ok'?'Sincronizado con terminal': syncStatus==='syncing'?'Sincronizando...': 'Sin conexión terminal'}>● {syncStatus==='ok'?'SYNC': syncStatus==='syncing'?'SYNC...': syncStatus==='error'?'OFFLINE':'SYNC'}</span>
            <button onClick={()=>setRgbMode(!rgbMode)} aria-label="Alternar modo RGB" className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-sm border ${rgbMode?'bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-black border-white/20 neon-pulse':'glass text-white/80 border-white/10'}`} title="RGB Mode">🌈</button>
            <button onClick={handleShare} aria-label="Compartir puntuación NEO ARCADE" className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10 text-white/80 text-xs border border-white/10" title="Compartir puntuación">↗</button>
            <button onClick={()=>setMuted(!muted)} aria-label={muted?'Activar sonido':'Silenciar'} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10 text-white/80 text-sm">{muted?'🔇':'🔊'}</button>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 pb-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between border-t border-white/5 pt-3 mt-1">
          <div className="flex gap-1.5 flex-wrap">
            {(['ALL','ARCADE','BRAIN','PULSE','SKILL','CASINO'] as const).map(cat=>(
              <button key={cat} onClick={()=>setFilter(cat as any)} className={`px-3 py-1.5 rounded-full text-[11px] font-mono tracking-widest border transition ${filter===cat?'bg-cyan-400 text-black border-cyan-400 font-black':'glass text-white/60 border-white/10 hover:bg-white/10'}`}>{cat}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cabina..." className="glass rounded-full pl-8 pr-3 py-1.5 text-sm font-mono text-white placeholder:text-white/30 outline-none border border-white/10 w-[220px]"/>
              <span className="absolute left-2.5 top-2 text-white/45 text-xs">🔍</span>
            </div>
            <button onClick={()=>setShowStats(!showStats)} className="px-3 py-1.5 rounded-full glass text-xs font-mono tracking-widest text-white/70 hover:bg-white/10">{showStats?'OCULTAR':'STATS'}</button>
          </div>
        </div>
      </header>

      {/* HERO — Contenido + Apariencia ELITE */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-4 mt-6">
        <div className="glass rounded-[24px] p-[1.5px] shine-sweep" style={{background:'linear-gradient(135deg, #00ffff40, #ff00ff40, #ffdd0040)'}}>
          <div className="rounded-[22px] bg-[#0a0a18]/80 backdrop-blur-xl p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1">
              <p className="text-[11px] tracking-[0.3em] font-mono text-cyan-300">NEO ELITE 250 • SALA INMERSIVA 2026 • BRILLA</p>
              <h2 className="mt-2 font-black text-white text-2xl sm:text-3xl leading-tight" style={{fontFamily:'Orbitron'}}>250 CABINAS. <span className="rgb-text">1 SALA.</span> INFINITAS PARTIDAS.</h2>
              <p className="text-sm text-white/70 mt-3 leading-relaxed">Juega 50 arcade clásicos + 10 CASINO virtual (18+ sin dinero real) + 190 ELITE únicos. Sistema monetario, XP, logros y desafíos diarios. Instalable en PC, Opera GX y móvil.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="#arcade" onClick={()=>{ setActive('slots'); playClick() }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-xs tracking-widest hover:scale-105 transition">🎰 PROBAR CASINO</a>
                <button onClick={()=>setShowAch(true)} className="px-5 py-2.5 rounded-full glass text-white font-bold text-xs border border-white/10 hover:bg-white/10">🏆 VER LOGROS</button>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full glass text-xs font-mono text-white/60"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>250 ELITE • 60fps</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="glass rounded-xl p-3"><p className="font-black text-white" style={{fontFamily:'Orbitron'}}>{totalScore.toLocaleString()}</p><p className="text-[11px] font-mono text-white/50">PTS TOTALES</p></div>
                <div className="glass rounded-xl p-3"><p className="font-black text-white" style={{fontFamily:'Orbitron'}}>{gamesPlayedDistinct}/250</p><p className="text-[11px] font-mono text-white/50">CABINAS</p></div>
                <div className="glass rounded-xl p-3"><p className="font-black text-white" style={{fontFamily:'Orbitron'}}>{Object.values(achUnlocked).filter(Boolean).length}</p><p className="text-[11px] font-mono text-white/50">LOGROS</p></div>
              </div>
            </div>
            <div className="w-full lg:w-[380px] glass rounded-2xl p-4 border border-white/10">
              <p className="text-[11px] tracking-widest font-mono text-cyan-300">DESTACADOS HOY</p>
              <div className="mt-3 space-y-2">
                {(['slots','blackjack','snake','neon'] as any).slice(0,3).map((id:any)=>{ const g=GAMES[id]||GAMES['slots']; return (
                  <div key={id} className="flex gap-3 items-center glass rounded-xl p-2.5 border border-white/5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${g.color}14`, border:`1px solid ${g.color}30`}}><GameIcon id={g.title.includes('SLOTS')?'slots': id==='slots'?'slots':'snake'} color={g.color} size={18}/></div>
                    <div className="flex-1"><p className="font-bold text-white text-xs" style={{fontFamily:'Orbitron'}}>{g.title}</p><p className="text-[11px] font-mono text-white/50">{g.cat} • {g.mech}</p></div>
                    <span className="text-[11px] font-mono px-2 py-1 rounded-full bg-white/10 text-white/60">{g.diff===1?'FÁCIL':'ELITE'}</span>
                  </div>
                )})}
                <button onClick={()=>setFilter('CASINO')} className="w-full mt-2 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs">EXPLORAR 10 CASINO →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showStats && (
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass rounded-2xl p-4"><p className="text-[11px] font-mono tracking-widest text-cyan-300">PARTIDAS</p><p className="font-black text-2xl text-white" style={{fontFamily:'Orbitron'}}>{totalPlays}</p><p className="text-xs font-mono text-white/50">{gamesPlayedDistinct} juegos tocados</p></div>
          <div className="glass rounded-2xl p-4"><p className="text-[11px] font-mono tracking-widest text-fuchsia-300">RÉCORD TOTAL</p><p className="font-black text-2xl text-white" style={{fontFamily:'Orbitron'}}>{totalScore.toLocaleString()}</p><p className="text-xs font-mono text-white/50">Suma de highscores</p></div>
          <div className="glass rounded-2xl p-4"><p className="text-[11px] font-mono tracking-widest text-amber-300">LOGROS</p><p className="font-black text-2xl text-white" style={{fontFamily:'Orbitron'}}>{Object.values(achUnlocked).filter(Boolean).length}/{ACHIEVEMENTS.length}</p><div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1"><div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{width:`${(Object.values(achUnlocked).filter(Boolean).length/ACHIEVEMENTS.length)*100}%`}}/></div></div>
          <div className="glass rounded-2xl p-4"><p className="text-[11px] font-mono tracking-widest text-emerald-300">DIARIO HOY</p><p className="font-black text-2xl text-white" style={{fontFamily:'Orbitron'}}>{dailyList.filter(d=> dailyDone[d.id]).length}/3</p><p className="text-xs font-mono text-white/50">{todayStr}</p></div>
        </div>
      )}

      <main id="arcade" className="max-w-[1400px] mx-auto px-3 sm:px-4 py-6 grid lg:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-3">
          <p className="text-[11px] tracking-[0.3em] font-mono text-white/50 px-1">CABINAS ({filteredGames.length}/250) <span className="rgb-text font-black">RGB ELITE</span></p>
          <div className="grid grid-cols-1 gap-2.5 max-h-[68vh] overflow-auto pr-1 scrollbar-thin">
            {filteredGames.map(id=>{
              const g=GAMES[id]
              const isActive=id===active
              const hi=highScores[id]||0
              const pl=plays[id]||0
              return (
                <button key={id} onClick={()=>{ setActive(id); playClick() }}
                  className={`text-left rounded-2xl p-[1.5px] transition-all ${isActive?'scale-[1.02]':''}`}
                  style={{background: isActive? `linear-gradient(135deg, ${g.color}, #ffffff)` : 'rgba(255,255,255,0.08)'}}>
                  <div className={`rounded-[15px] p-3 flex gap-3 items-center ${isActive?'bg-[#0b0b1e]':'glass hover:bg-white/[0.08]'} transition`}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background:`${g.color}14`, border:`1px solid ${g.color}38`, boxShadow: isActive? `0 0 16px ${g.color}60`: `0 0 10px ${g.color}18`}}><GameIcon id={id} color={g.color} size={26} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white leading-none text-[13px] tracking-wide" style={{fontFamily:'Orbitron'}}>{g.title}</p>
                      <p className="text-[11px] font-mono tracking-widest mt-0.5" style={{color:g.color}}>{g.subtitle}</p>
                      <p className="text-[11px] text-white/45 font-mono truncate">{g.cat} • {g.diff===1?'FÁCIL':g.diff===2?'MEDIO':'DIFÍCIL'} • {g.lang}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-mono text-white/45">HI</p>
                      <p className="font-black text-white text-sm" style={{fontFamily:'Orbitron'}}>{hi}</p>
                      <p className="text-[10px] font-mono text-white/30">{pl} plays</p>
                      {isActive && <span className="inline-block mt-1 w-2 h-2 rounded-full animate-pulse" style={{background:g.color, boxShadow:`0 0 8px ${g.color}`}}/>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {filteredGames.length===0 && <p className="text-sm font-mono text-white/45 text-center py-8">Sin resultados</p>}
        </div>

        <div className="space-y-4">
          <div className={`rounded-[24px] p-[1.5px] ${rgbMode?'neon-pulse':''}`} style={{background:`linear-gradient(135deg, ${cur.color}80, transparent 60%, ${cur.color}40)`}}>
            <div className="rounded-[22px] bg-[#0a0a18]/90 backdrop-blur-xl border border-white/10 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10" style={{background:`linear-gradient(90deg, ${cur.color}14, transparent)`}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${cur.color}14`, border:`1px solid ${cur.color}45`, boxShadow:`0 0 12px ${cur.color}40`}}><GameIcon id={active} color={cur.color} size={24} /></div>
                  <div>
                    <h2 className="font-black text-white tracking-wide leading-none" style={{fontFamily:'Orbitron'}}>{cur.title}</h2>
                    <p className="text-xs font-mono tracking-widest" style={{color:cur.color}}>{cur.subtitle} — {cur.lang.toUpperCase()} • {cur.cat}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-mono tracking-widest border" style={{borderColor:`${cur.color}40`, color:cur.color, background:`${cur.color}12`}}>{cur.mech.toUpperCase()}</span>
                  <span className="px-2 py-1 rounded-full bg-white/10 text-[11px] font-mono text-white/70">HI {highScores[active]||0}</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex justify-center bg-gradient-to-b from-transparent to-black/20 min-h-[420px] relative overflow-hidden">
                {!started && globalReady && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-[#07091a]/78 backdrop-blur-[6px]">
                    <div className="glass rounded-2xl border max-w-[420px] w-full p-5 sm:p-6 text-center shadow-[0_0_30px_rgba(0,0,0,0.4)]" style={{borderColor:`${cur.color}40`, boxShadow:`0 0 24px ${cur.color}22`}}>
                      <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center" style={{background:`${cur.color}14`, border:`1px solid ${cur.color}45`, boxShadow:`0 0 16px ${cur.color}55`}}><GameIcon id={active} color={cur.color} size={28} /></div>
                      <h3 className="mt-3 font-black text-white tracking-widest" style={{fontFamily:'Orbitron'}}>{cur.title}</h3>
                      <p className="text-[11px] font-mono tracking-widest" style={{color:cur.color}}>{cur.subtitle}</p>
                      <p className="text-xs font-mono text-white/55 mt-2 leading-relaxed">{cur.desc}</p>
                      <div className="mt-4">
                        <p className="font-black tracking-widest text-sm animate-pulse" style={{fontFamily:'Orbitron', color:cur.color}}>— PRESIONA ENTER PARA JUGAR —</p>
                        <p className="text-[11px] font-mono text-white/45 mt-1">o haz click en JUGAR</p>
                      </div>
                      <button onClick={()=>{ setStarted(true); playClick() }} className="mt-4 px-6 py-2.5 rounded-full font-black tracking-widest hover:scale-105 transition text-black shadow-lg" style={{background:`linear-gradient(135deg, ${cur.color}, #ffffff)`, fontFamily:'Orbitron'}}>JUGAR [ENTER]</button>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <span className="glass rounded-full py-1.5 text-white/60">ENTER Jugar</span>
                        <span className="glass rounded-full py-1.5 text-white/60">ESC Pausa / Salir</span>
                        <span className="glass rounded-full py-1.5 text-white/60">R Reiniciar</span>
                        <span className="glass rounded-full py-1.5 text-white/60">P Pausar</span>
                      </div>
                      <p className="text-[11px] font-mono text-white/30 mt-3">Tip: {cur.cat==='ARCADE'?'Reacción rápida':cur.cat==='BRAIN'?'Piensa 2 pasos adelante':cur.cat==='PULSE'?'Sigue el ritmo': 'Precisión milimétrica'} • HI {highScores[active]||0}</p>
                    </div>
                  </div>
                )}
                {started && (
                  <button onClick={()=>{ setStarted(false); playClick() }} className="absolute top-2 right-2 z-10 hidden sm:inline-flex px-2.5 py-1 rounded-full glass text-[11px] font-mono tracking-widest text-white/60 hover:bg-white/10 border border-white/10">ESC Pausa</button>
                )}
                <GameErrorBoundary game={cur.title} key={active}>
                <div className={`w-full flex justify-center items-start transition ${!started?'blur-[2px] scale-[0.98] opacity-60 pointer-events-none select-none':''}`}>
                  {active==='snake' && <SnakeGame onScore={handleScore} isStarted={started}/>}
                  {active==='breakout' && <BreakoutGame onScore={handleScore} isStarted={started}/>}
                  {active==='shooter' && <ShooterGame onScore={handleScore} isStarted={started}/>}
                  {active==='memory' && <MemoryGame onScore={handleScore} isStarted={started}/>}
                  {active==='stack' && <StackGame onScore={handleScore} isStarted={started}/>}
                  {active==='runner' && <RunnerGame onScore={handleScore} isStarted={started}/>}
                  {active==='rhythm' && <RhythmGame onScore={handleScore} isStarted={started}/>}
                  {active==='fusion' && <Game2048 onScore={handleScore} isStarted={started}/>}
                  {active==='tetris' && <TetrisGame onScore={handleScore} isStarted={started}/>}
                  {active==='flappy' && <FlappyGame onScore={handleScore} isStarted={started}/>}
                  {active==='miner' && <MinerGame onScore={handleScore} isStarted={started}/>}
                  {active==='words' && <WordsGame onScore={handleScore} isStarted={started}/>}
                  {active==='aim' && <AimGame onScore={handleScore} isStarted={started}/>}
                  {active==='maze' && <MazeGame onScore={handleScore} isStarted={started}/>}
                  {active==='plinko' && <PlinkoGame onScore={handleScore} isStarted={started}/>}
                  {active==='pong' && <PongGame onScore={handleScore} isStarted={started}/>}
                  {active==='color' && <ColorGame onScore={handleScore} isStarted={started}/>}
                  {active==='dodge' && <DodgeGame onScore={handleScore} isStarted={started}/>}
                  {active==='typing' && <TypingGame onScore={handleScore} isStarted={started}/>}
                  {active==='gravity' && <GravityGame onScore={handleScore} isStarted={started}/>}
                  {active==='slide' && <SlideGame onScore={handleScore} isStarted={started}/>}
                  {active==='defense' && <DefenseGame onScore={handleScore} isStarted={started}/>}
                  {active==='rider' && <RiderGame onScore={handleScore} isStarted={started}/>}
                  {active==='hex' && <HexGame onScore={handleScore} isStarted={started}/>}
                  {active==='chess' && <ChessGame onScore={handleScore} isStarted={started}/>}
                  {active==='frogger' && <FroggerGame onScore={handleScore} isStarted={started}/>}
                  {active==='pinball' && <PinballGame onScore={handleScore} isStarted={started}/>}
                  {active==='bubble' && <BubbleGame onScore={handleScore} isStarted={started}/>}
                  {active==='racing' && <RacingGame onScore={handleScore} isStarted={started}/>}
                  {active==='ninja' && <NinjaGame onScore={handleScore} isStarted={started}/>}
                  {active==='harvest' && <HarvestGame onScore={handleScore} isStarted={started}/>}
                  {active==='jetpack' && <JetpackGame onScore={handleScore} isStarted={started}/>}
                  {active==='match' && <MatchGame onScore={handleScore} isStarted={started}/>}
                  {active==='survival' && <SurvivalGame onScore={handleScore} isStarted={started}/>}
                  {active==='laser' && <LaserGame onScore={handleScore} isStarted={started}/>}
                  {active==='invaders' && <InvadersGame onScore={handleScore} isStarted={started}/>}
                  {active==='dungeon' && <DungeonGame onScore={handleScore} isStarted={started}/>}
                  {active==='snakeduel' && <SnakeDuelGame onScore={handleScore} isStarted={started}/>}
                  {active==='puzzlebox' && <PuzzleBoxGame onScore={handleScore} isStarted={started}/>}
                  {active==='memoryultra' && <MemoryUltraGame onScore={handleScore} isStarted={started}/>}
                  {active==='towerelite' && <TowerEliteGame onScore={handleScore} isStarted={started}/>}
                  {active==='flappyultra' && <FlappyUltraGame onScore={handleScore} isStarted={started}/>}
                  {active==='snakeultra' && <SnakeUltraGame onScore={handleScore} isStarted={started}/>}
                  {active==='pongultra' && <PongUltraGame onScore={handleScore} isStarted={started}/>}
                  {active==='racingelite' && <RacingEliteGame onScore={handleScore} isStarted={started}/>}
                  {active==='tron' && <TronGame onScore={handleScore} isStarted={started}/>}
                  {active==='sudoku' && <SudokuGame onScore={handleScore} isStarted={started}/>}
                  {active==='chessultra' && <ChessUltraGame onScore={handleScore} isStarted={started}/>}
                  {active==='asteroidsultra' && <AsteroidsUltraGame onScore={handleScore} isStarted={started}/>}
                  {active==='wordleultra' && <WordleUltraGame onScore={handleScore} isStarted={started}/>}
                  {active==='slots' && <SlotsGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='roulette' && <RouletteGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='blackjack' && <BlackjackGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='poker' && <PokerGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='dice' && <DiceGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='coinflip' && <CoinFlipGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='scratch' && <ScratchGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='lottery' && <LotteryGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='crash' && <CrashGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active==='mines' && <MinesGame onScore={handleScore} isStarted={started} onBet={handleBet} onWin={handleWin}/>}
                  {active.startsWith('ph') && <ElitePhGame onScore={handleScore} isStarted={started} title={GAMES[active]?.title} color={GAMES[active]?.color}/>}
                </div>
                </GameErrorBoundary>
              </div>

              <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-2 border-t border-white/5 bg-black/20">
                <span className="text-[11px] font-mono tracking-widest text-white/45">MECÁNICA:</span>
                <span className="text-xs font-mono text-white/75">{cur.desc}</span>
                <span className="ml-auto text-[11px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-white/50">Plays {plays[active]||0} • {cur.lang}</span>
              </div>
              <div className="px-4 sm:px-6 py-2.5 flex flex-wrap gap-2 items-center justify-center bg-black/30 border-t border-white/5">
                {!started ? (
                  <span className="text-xs font-mono tracking-widest text-white/70"><span className="text-cyan-300 font-black" style={{fontFamily:'Orbitron'}}>ENTER</span> Jugar • <span className="text-white/50">Click JUGAR</span> • <span className="text-white/50">ESC Pausa</span> • <span className="text-white/50">R Reiniciar</span></span>
                ) : (
                  <span className="text-xs font-mono tracking-widest text-white/50"><span className="text-white/70">Jugando</span> • <span className="text-amber-300">ESC</span> Pausa • <span className="text-cyan-300">R</span> Reiniciar • <span className="text-fuchsia-300">P</span> Pausar • Cambia cabina con la lista</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] tracking-widest font-mono text-cyan-300">PROGRESIÓN</p>
              <p className="text-sm text-white/75 mt-1">XP, monedas, niveles y racha diaria. Cada récord te sube de nivel y desbloquea recompensas.</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] tracking-widest font-mono text-fuchsia-300">DESAFÍOS DIARIOS</p>
              <p className="text-sm text-white/75 mt-1">3 retos cada día. Completa para ganar XP bonus y monedas. Se reinician a medianoche.</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] tracking-widest font-mono text-amber-300">LOGROS</p>
              <p className="text-sm text-white/75 mt-1">{ACHIEVEMENTS.length} logros coleccionables con progreso. ¡Hazte Dios del Arcade!</p>
            </div>
          </div>
        </div>
      </main>

      {/* Contenido SEO: por qué jugar + cómo jugar + FAQ */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-4 mt-8 grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-black text-white tracking-widest" style={{fontFamily:'Orbitron'}}>POR QUÉ NEO ARCADE</h3>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">250 cabinas RGB a 60fps con física real, sistema monetario virtual, progresión con XP y monedas, 50+ logros y 3 desafíos diarios. 10 cabinas CASINO con apuestas simuladas (18+ sin dinero real). PWA instalable, offline y sin anuncios.</p>
          <ul className="mt-3 space-y-1.5 text-xs font-mono text-white/55 list-disc list-inside">
            <li>60fps Canvas 2D + Web Audio</li>
            <li>Progreso guardado + sync terminal</li>
            <li>Instala en PC y móvil en 1 click</li>
          </ul>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-black text-white tracking-widest" style={{fontFamily:'Orbitron'}}>CÓMO JUGAR</h3>
          <ol className="mt-2 space-y-1.5 text-sm text-white/70 list-decimal list-inside font-mono">
            <li>Elige cabina (FÁCIL/MEDIO/DIFÍCIL) por categoría ARCADE/BRAIN/PULSE/SKILL/CASINO</li>
            <li>Pulsa <span className="text-cyan-300 font-black">JUGAR [ENTER]</span> → WASD/Flechas, Espacio, R/P</li>
            <li>Supera tu HI → ganas monedas + XP → subes nivel y desbloqueas logros</li>
          </ol>
          <p className="text-xs font-mono text-white/45 mt-3">Controles: WASD/Flechas, Mouse/Touch, Enter jugar, Esc pausar, R reiniciar.</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="font-black text-white tracking-widest" style={{fontFamily:'Orbitron'}}>FAQ</h3>
          <details className="mt-2 group"><summary className="cursor-pointer text-sm font-bold text-white/80">¿Es gratis y seguro?</summary><p className="text-xs font-mono text-white/60 mt-1">Sí, 100% gratis, sin anuncios, sin permisos raros. PWA verificada, CSP y HTTPS.</p></details>
          <details className="group mt-2"><summary className="cursor-pointer text-sm font-bold text-white/80">¿Funciona offline?</summary><p className="text-xs font-mono text-white/60 mt-1">Sí, tras instalar se precachean 39 archivos con Workbox. Juega sin internet.</p></details>
          <details className="group mt-2"><summary className="cursor-pointer text-sm font-bold text-white/80">¿Cómo instalar en iPhone?</summary><p className="text-xs font-mono text-white/60 mt-1">Safari → Compartir ⎙ → Añadir a pantalla de inicio. En Android/PC: menú ⋮ → Instalar.</p></details>
          <details className="group mt-2"><summary className="cursor-pointer text-sm font-bold text-white/80">¿Dónde se guarda mi progreso?</summary><p className="text-xs font-mono text-white/60 mt-1">En tu navegador (localStorage) y sync a arcade-stats.json si usas el terminal local.</p></details>
        </div>
      </section>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t=>(
          <div key={t.id} className="glass rounded-xl px-4 py-3 border border-cyan-400/30 shadow-[0_0_20px_rgba(0,255,255,0.2)] min-w-[260px]">
            <p className="font-black text-white text-sm" style={{fontFamily:'Orbitron'}}>{t.text}</p>
            <p className="text-xs font-mono text-white/60">{t.sub}</p>
          </div>
        ))}
      </div>

      {showDaily && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={()=>setShowDaily(false)}/>
          <div className="relative glass rounded-[22px] border border-amber-400/30 max-w-[560px] w-full p-6 shadow-[0_0_40px_rgba(255,170,0,0.15)]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-white text-lg" style={{fontFamily:'Orbitron'}}>DESAFÍOS DIARIOS</h3>
                <p className="text-xs font-mono tracking-widest text-amber-300">{todayStr} • Reinicio 00:00</p>
              </div>
              <button onClick={()=>setShowDaily(false)} className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:bg-white/10">✕</button>
            </div>
            <div className="mt-4 space-y-3">
              {dailyList.map(ch=>{
                const prog=dailyProgress[ch.id]||0
                const done=dailyDone[ch.id]
                const pct=Math.min(100, (prog/ch.target)*100)
                return (
                  <div key={ch.id} className={`rounded-xl p-3 border ${done?'border-emerald-400/30 bg-emerald-400/10':'border-white/10 bg-white/[0.04]'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 items-center">
                        <span className="text-lg">{ch.icon}</span>
                        <div>
                          <p className="font-bold text-white text-sm" style={{fontFamily:'Orbitron'}}>{ch.title}</p>
                          <p className="text-xs font-mono text-white/60">{ch.desc}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-black ${done?'bg-emerald-400 text-black':'glass text-white/60'}`}>{done?'COMPLETADO':`${prog}/${ch.target}`}</span>
                    </div>
                    <div className="h-1.5 bg-black/30 rounded-full overflow-hidden mt-2"><div className={`h-full transition-all ${done?'bg-emerald-400':'bg-gradient-to-r from-amber-400 to-orange-500'}`} style={{width:`${pct}%`}}/></div>
                    <p className="text-[11px] font-mono text-white/45 mt-1">Recompensa: +{ch.rewardXp} XP +{ch.rewardCoins} 💰</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-xs font-mono text-white/50">{dailyList.filter(d=> dailyDone[d.id]).length}/3 completados</p>
              <button onClick={()=>setShowDaily(false)} className="px-4 py-2 rounded-full bg-white text-black font-black text-xs">CERRAR</button>
            </div>
          </div>
        </div>
      )}

      {showAch && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={()=>setShowAch(false)}/>
          <div className="relative glass rounded-[22px] border border-cyan-400/30 max-w-[720px] w-full max-h-[78vh] overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,255,255,0.15)]">
            <div className="p-6 border-b border-white/10 flex justify-between items-start">
              <div>
                <h3 className="font-black text-white text-lg" style={{fontFamily:'Orbitron'}}>LOGROS ({Object.values(achUnlocked).filter(Boolean).length}/{ACHIEVEMENTS.length})</h3>
                <p className="text-xs font-mono tracking-widest text-cyan-300">Colecciónalos todos — progreso guardado</p>
              </div>
              <button onClick={()=>setShowAch(false)} className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/70 hover:bg-white/10">✕</button>
            </div>
            <div className="overflow-auto p-4 grid sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map(a=>{
                const prog=achProg[a.id]||0
                const unlocked=achUnlocked[a.id]
                const pct=Math.min(100, (prog/a.target)*100)
                return (
                  <div key={a.id} className={`rounded-xl p-3 border flex gap-3 ${unlocked?'border-emerald-400/30 bg-emerald-400/10':'border-white/10 bg-white/[0.04] opacity-90'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${unlocked?'bg-emerald-400 text-black':'glass text-white/45'}`}>{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm leading-none" style={{fontFamily:'Orbitron'}}>{a.title}</p>
                      <p className="text-xs font-mono text-white/60 leading-tight mt-1">{a.desc}</p>
                      <div className="h-1 bg-black/30 rounded-full overflow-hidden mt-2"><div className={`h-full ${unlocked?'bg-emerald-400':'bg-cyan-400'}`} style={{width:`${pct}%`}}/></div>
                      <p className="text-[11px] font-mono text-white/45 mt-1">{prog}/{a.target} • +{a.xp} XP +{a.coins}💰 {unlocked?'✓':''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Interfaz móvil: nav inferior para uso de espacios */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/10 px-2 py-2 flex justify-around items-center pb-[env(safe-area-inset-bottom)]">
        <button onClick={()=>{ setFilter('ALL'); window.scrollTo({top:0, behavior:'smooth'}) }} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl ${filter==='ALL'?'bg-white text-black':'text-white/60'}`}><span className="text-sm">🎮</span><span className="text-[10px] font-mono">JUGAR</span></button>
        <button onClick={()=>{ setFilter('CASINO'); window.scrollTo({top:0, behavior:'smooth'}) }} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl ${filter==='CASINO'?'bg-amber-400 text-black':'text-white/60'}`}><span className="text-sm">🎰</span><span className="text-[10px] font-mono">CASINO</span></button>
        <button onClick={()=>{ const el=document.querySelector('input[placeholder=\"Buscar cabina...\"]') as HTMLElement; el?.focus(); window.scrollTo({top:0, behavior:'smooth'}) }} className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-white/60"><span className="text-sm">🔍</span><span className="text-[10px] font-mono">BUSCAR</span></button>
        <button onClick={()=>setShowDaily(true)} className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-white/60"><span className="text-sm">🎯</span><span className="text-[10px] font-mono">DIARIO</span></button>
      </nav>

      <PWAInstall />

      <footer className="max-w-[1400px] mx-auto px-4 pb-20 lg:pb-8 pt-2 text-center">
        <p className="text-[11px] font-mono tracking-widest text-white/30">Neo Elite 250 v5.0 © 2026 — 250 juegos • Casino virtual • Monetario 18+ sin dinero real • BRILLA</p>
        <p className="text-[11px] font-mono text-white/20 mt-1">Instalable en PC (Chrome/Edge/Opera GX → Instalar) y móvil • Funciona offline • <a href="https://github.com/WilmerF17/Neo-Arcade" target="_blank" rel="noreferrer" className="underline hover:text-cyan-300">GitHub</a> • <button onClick={handleShare} className="underline hover:text-cyan-300">Compartir ↗</button> • <span className="text-white/25">v5.0 Neo Elite 250 • {totalScore.toLocaleString()} pts totales</span></p>
      </footer>
    </div>
  )
}
