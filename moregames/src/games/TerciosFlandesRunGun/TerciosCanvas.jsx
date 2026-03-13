import { useEffect, useRef, useCallback } from 'react';
import { createGameState, tickGame, CANVAS_W, CANVAS_H, getPlayerFrame } from './logic/gameLoop.js';
import { GROUND_Y } from './logic/levelData.js';

// ── Rutas de sprites (añadir los PNG a /src/img/tercios/ para activarlos) ──
// Los imports están listos; mientras los archivos no existan se usan
// formas geométricas de color como fallback visual.
const IMG_PATHS = {
  player:     '/img/tercios/player.png',
  enemies:    '/img/tercios/enemies.png',
  tileset:    '/img/tercios/tileset.png',
  explosions: '/img/tercios/explosions.png',
  background1:'/img/tercios/background1.png',
  ui:         '/img/tercios/ui.png',
};

function loadImages(paths) {
  const imgs = {};
  Object.entries(paths).forEach(([k, src]) => {
    const img = new Image();
    img.src = src;
    imgs[k] = img;
  });
  return imgs;
}

// ── Paleta de colores (fallback sin sprites) ──
const PAL = {
  sky1:      '#7ec8e3',
  sky2:      '#c9e8f5',
  ground:    '#5a4a2a',
  grassTop:  '#4a7c2f',
  platform:  '#7c6530',
  player:    '#c8a050',
  playerArmor:'#556b2f',
  enemySold: '#8b1a1a',
  enemyGun:  '#6b1a4a',
  boss:      '#3a0a0a',
  bullet:    '#ffdd44',
  eBullet:   '#ff4444',
  grenade:   '#888800',
  explosion1:'#ff8800',
  explosion2:'#ffdd00',
  houseWall: '#c8a87a',
  houseRoof: '#8b3a1a',
  tree:      '#2d5a1b',
  treeTrunk: '#5a3a1a',
  tower:     '#888880',
  flag:      '#cc3333',
  prisoner:  '#ddcc88',
};

export default function TerciosCanvas({ onScore, onDie, onWin, paused }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const keysRef    = useRef({ left:false, right:false, jump:false, jumpPressed:false, shoot:false, grenadePressed:false });
  const imgsRef    = useRef(null);
  const rafRef     = useRef(null);
  const pausedRef  = useRef(paused);
  pausedRef.current = paused;

  // ── Inicializar imágenes y estado ──
  useEffect(() => {
    imgsRef.current = loadImages(IMG_PATHS);
    stateRef.current = createGameState(0);
  }, []);

  // ── Teclado ──
  useEffect(() => {
    const down = (e) => {
      const k = keysRef.current;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') k.left  = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = true;
      if ((e.code === 'ArrowUp'   || e.code === 'KeyW' || e.code === 'Space') && !e.repeat) {
        k.jump = true; k.jumpPressed = true;
      }
      if (e.code === 'KeyJ' || e.code === 'KeyZ') k.shoot = true;
      if ((e.code === 'KeyK' || e.code === 'KeyX') && !e.repeat) k.grenadePressed = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const up = (e) => {
      const k = keysRef.current;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') k.left  = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = false;
      if (e.code === 'ArrowUp'    || e.code === 'KeyW' || e.code === 'Space') {
        k.jump = false;
      }
      if (e.code === 'KeyJ' || e.code === 'KeyZ') k.shoot = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Botones táctiles ──
  const pressKey  = useCallback((k) => {
    const keys = keysRef.current;
    if (k === 'left')    { keys.left  = true; }
    if (k === 'right')   { keys.right = true; }
    if (k === 'jump')    { keys.jump  = true; keys.jumpPressed = true; }
    if (k === 'shoot')   { keys.shoot = true; }
    if (k === 'grenade') { keys.grenadePressed = true; }
  }, []);
  const releaseKey = useCallback((k) => {
    const keys = keysRef.current;
    if (k === 'left')  keys.left  = false;
    if (k === 'right') keys.right = false;
    if (k === 'jump')  keys.jump  = false;
    if (k === 'shoot') keys.shoot = false;
  }, []);

  // ── Bucle principal ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (pausedRef.current || !stateRef.current) return;
      const gs   = stateRef.current;
      const now  = performance.now();

      tickGame(gs, keysRef.current, now, onScore, onDie, onWin);
      render(ctx, gs, imgsRef.current, now);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onScore, onDie, onWin]);

  return (
    <div className="tercios-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="tercios-canvas"
      />

      {/* Controles táctiles móvil */}
      <div className="tercios-controls">
        <div className="tc-dpad">
          <button className="tc-btn tc-left"
            onPointerDown={() => pressKey('left')}  onPointerUp={() => releaseKey('left')}
            onPointerLeave={() => releaseKey('left')}>◀</button>
          <button className="tc-btn tc-right"
            onPointerDown={() => pressKey('right')} onPointerUp={() => releaseKey('right')}
            onPointerLeave={() => releaseKey('right')}>▶</button>
        </div>
        <div className="tc-actions">
          <button className="tc-btn tc-jump"
            onPointerDown={() => pressKey('jump')}  onPointerUp={() => releaseKey('jump')}
            onPointerLeave={() => releaseKey('jump')}>↑</button>
          <button className="tc-btn tc-shoot"
            onPointerDown={() => pressKey('shoot')} onPointerUp={() => releaseKey('shoot')}
            onPointerLeave={() => releaseKey('shoot')}>🔫</button>
          <button className="tc-btn tc-grenade"
            onPointerDown={() => pressKey('grenade')}>💣</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════════
function render(ctx, gs, imgs, now) {
  const { player, enemies, bullets, grenades, explosions, camera, level, prisoners } = gs;
  const cx = Math.round(camera.x);

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Fondo ──
  drawBackground(ctx, imgs, cx, level);

  // ── Decoraciones ──
  for (const d of level.decorations) {
    drawDecoration(ctx, d, cx);
  }

  // ── Plataformas ──
  for (const p of level.platforms) {
    drawPlatform(ctx, p, cx, imgs);
  }

  // ── Bandera de final de nivel ──
  drawFlag(ctx, level.flagX - cx, GROUND_Y - 60);

  // ── Prisioneros ──
  for (const p of prisoners) {
    if (!p.rescued) drawPrisoner(ctx, p, cx);
  }

  // ── Enemigos ──
  for (const e of enemies) {
    drawEnemy(ctx, e, cx, imgs, now);
  }

  // ── Jugador ──
  drawPlayer(ctx, player, cx, imgs, now);

  // ── Balas ──
  for (const b of bullets) {
    if (!b.active) continue;
    drawBullet(ctx, b, cx, imgs);
  }

  // ── Granadas ──
  for (const g of grenades) {
    if (!g.active) continue;
    drawGrenade(ctx, g, cx);
  }

  // ── Explosiones ──
  for (const ex of explosions) {
    if (!ex.active) continue;
    drawExplosion(ctx, ex, cx, imgs, now);
  }
}

// ── Fondo ──────────────────────────────────────────────────────────
function drawBackground(ctx, imgs, cx, level) {
  const bg = imgs?.background1;
  if (bg?.complete && bg.naturalWidth > 1) {
    // Parallax ligero (bg se mueve a 0.4x velocidad de cámara)
    const bx = -(cx * 0.4) % bg.naturalWidth;
    ctx.drawImage(bg, bx, 0, CANVAS_W, CANVAS_H);
    if (bx < 0) ctx.drawImage(bg, bx + bg.naturalWidth, 0, CANVAS_W, CANVAS_H);
  } else {
    // Fallback: cielo degradado
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.7);
    grad.addColorStop(0, PAL.sky2);
    grad.addColorStop(1, PAL.sky1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Nubes simples (parallax 0.3x)
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const clouds = [[80, 30], [240, 20], [400, 40], [620, 25], [820, 35]];
    for (const [bx, by] of clouds) {
      const x = ((bx - cx * 0.3) % (level.width * 0.3) + level.width * 0.3) % (level.width * 0.3);
      if (x < CANVAS_W + 60) {
        ctx.beginPath();
        ctx.ellipse(x % CANVAS_W, by, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ── Plataforma / suelo ──────────────────────────────────────────────
function drawPlatform(ctx, p, cx, imgs) {
  const px = p.x - cx;
  if (px + p.w < 0 || px > CANVAS_W) return;

  const ts = imgs?.tileset;
  if (ts?.complete && ts.naturalWidth > 1) {
    // Tile 0,0 = suelo, tile 0,32 = plataforma
    const tileRow = p.h >= 32 ? 0 : 1;
    for (let tx = 0; tx < p.w; tx += 32) {
      ctx.drawImage(ts, 0, tileRow * 32, 32, 32, px + tx, p.y, Math.min(32, p.w - tx), Math.min(32, p.h));
    }
  } else {
    // Fallback geométrico
    const isGround = p.h >= 24;
    // Top verde (césped)
    ctx.fillStyle = PAL.grassTop;
    ctx.fillRect(px, p.y, p.w, isGround ? 4 : 3);
    // Cuerpo tierra
    ctx.fillStyle = PAL.ground;
    ctx.fillRect(px, p.y + (isGround ? 4 : 3), p.w, p.h - (isGround ? 4 : 3));
    // Borde
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  }
}

// ── Decoraciones ─────────────────────────────────────────────────────
function drawDecoration(ctx, d, cx) {
  const x = d.x - cx;
  if (x + d.w < -20 || x > CANVAS_W + 20) return;

  switch (d.type) {
    case 'tree':
      ctx.fillStyle = PAL.treeTrunk;
      ctx.fillRect(x + d.w * 0.35, d.y + d.h * 0.5, d.w * 0.3, d.h * 0.5);
      ctx.fillStyle = PAL.tree;
      ctx.beginPath();
      ctx.ellipse(x + d.w / 2, d.y + d.h * 0.35, d.w * 0.55, d.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'house':
      ctx.fillStyle = PAL.houseWall;
      ctx.fillRect(x, d.y + d.h * 0.35, d.w, d.h * 0.65);
      ctx.fillStyle = PAL.houseRoof;
      ctx.beginPath();
      ctx.moveTo(x - 4, d.y + d.h * 0.38);
      ctx.lineTo(x + d.w / 2, d.y);
      ctx.lineTo(x + d.w + 4, d.y + d.h * 0.38);
      ctx.closePath();
      ctx.fill();
      // Ventana
      ctx.fillStyle = '#ccddff';
      ctx.fillRect(x + 8, d.y + d.h * 0.5, 14, 12);
      ctx.fillRect(x + d.w - 22, d.y + d.h * 0.5, 14, 12);
      break;
    case 'tower':
      ctx.fillStyle = PAL.tower;
      ctx.fillRect(x, d.y, d.w, d.h);
      // Almenas
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + i * (d.w / 3), d.y - 8, d.w / 3 - 2, 8);
      }
      // Ventana
      ctx.fillStyle = '#334';
      ctx.fillRect(x + d.w * 0.25, d.y + d.h * 0.3, d.w * 0.5, d.h * 0.25);
      break;
    case 'cannon':
      ctx.fillStyle = '#444';
      ctx.fillRect(x, d.y + d.h * 0.3, d.w * 0.75, d.h * 0.4);
      ctx.beginPath();
      ctx.arc(x + 6, d.y + d.h * 0.7, 8, 0, Math.PI * 2);
      ctx.arc(x + d.w * 0.55, d.y + d.h * 0.7, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#222';
      ctx.fill();
      break;
    default: break;
  }
}

// ── Jugador ─────────────────────────────────────────────────────────
function drawPlayer(ctx, player, cx, imgs, now) {
  const px = Math.round(player.x - cx);
  const py = Math.round(player.y);

  // Parpadeo cuando es invencible
  if (player.invincible && Math.floor(now / 80) % 2 === 0) return;

  const sp = imgs?.player;
  if (sp?.complete && sp.naturalWidth > 1) {
    const f = getPlayerFrame(player);
    ctx.save();
    if (player.facing === -1) {
      ctx.scale(-1, 1);
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, -(px + player.w), py, player.w, player.h);
    } else {
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, px, py, player.w, player.h);
    }
    ctx.restore();
  } else {
    drawPlayerFallback(ctx, player, px, py, now);
  }
}

function drawPlayerFallback(ctx, p, px, py, now) {
  const dir = p.facing;
  ctx.save();
  if (dir === -1) {
    ctx.translate(px + p.w, py);
    ctx.scale(-1, 1);
    ctx.translate(-p.w, 0);
  } else {
    ctx.translate(px, py);
  }

  // Cuerpo (jubón marrón)
  ctx.fillStyle = PAL.player;
  ctx.fillRect(4, 10, 12, 12);
  // Armadura (verde oscuro, típico tercio)
  ctx.fillStyle = PAL.playerArmor;
  ctx.fillRect(3, 10, 14, 8);
  // Cabeza
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(5, 2, 10, 9);
  // Casco morión
  ctx.fillStyle = '#667';
  ctx.fillRect(4, 0, 12, 5);
  ctx.fillRect(2, 3, 16, 2);
  // Piernas
  ctx.fillStyle = '#4a3a1a';
  ctx.fillRect(4, 22, 5, 6);
  ctx.fillRect(11, 22, 5, 6);
  // Mosquete (si disparando o idle derecha)
  if (p.state === 'shoot' || p.state === 'idle' || p.state === 'run') {
    ctx.fillStyle = '#4a3a1a';
    ctx.fillRect(16, 12, 6, 2); // cañón
    ctx.fillRect(14, 11, 4, 4); // culata
  }
  // Pica (si state run, alternar)
  ctx.restore();
}

// ── Enemigos ─────────────────────────────────────────────────────────
function drawEnemy(ctx, e, cx, imgs, now) {
  if (e.state === 'dead' && e.y > CANVAS_H + 40) return;
  const px = Math.round(e.x - cx);
  const py = Math.round(e.y);
  if (px + e.w < -10 || px > CANVAS_W + 10) return;

  const sp = imgs?.enemies;
  if (sp?.complete && sp.naturalWidth > 1) {
    const frameW = e.type === 'boss' ? 40 : 20;
    const frameH = e.type === 'boss' ? 48 : 28;
    const sx = e.animFrame * frameW;
    const sy = e.spriteRow * frameH;
    ctx.save();
    if (e.facing === -1) {
      ctx.scale(-1, 1);
      ctx.drawImage(sp, sx, sy, frameW, frameH, -(px + e.w), py, e.w, e.h);
    } else {
      ctx.drawImage(sp, sx, sy, frameW, frameH, px, py, e.w, e.h);
    }
    ctx.restore();
  } else {
    drawEnemyFallback(ctx, e, px, py, now);
  }

  // Barra de vida (solo si tiene más de 1 vida)
  if (e.maxHp > 1 && e.state !== 'dead') {
    const bw = e.w;
    const pct = e.hp / e.maxHp;
    ctx.fillStyle = '#550000';
    ctx.fillRect(px, py - 6, bw, 3);
    ctx.fillStyle = e.type === 'boss' ? '#ff4400' : '#ff6666';
    ctx.fillRect(px, py - 6, bw * pct, 3);
  }
}

function drawEnemyFallback(ctx, e, px, py, now) {
  const color = e.type === 'boss' ? PAL.boss : e.type === 'gunner' ? PAL.enemyGun : PAL.enemySold;
  ctx.save();
  if (e.facing === -1) { ctx.translate(px + e.w, py); ctx.scale(-1, 1); ctx.translate(-e.w, 0); }
  else ctx.translate(px, py);

  if (e.state === 'dead') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(0, e.h - 8, e.w, 8);
    ctx.restore();
    return;
  }

  const bossScale = e.type === 'boss' ? 1.4 : 1;
  // Cuerpo
  ctx.fillStyle = color;
  ctx.fillRect(3, 10 * bossScale, 14, 12 * bossScale);
  // Cabeza
  ctx.fillStyle = '#cc8870';
  ctx.fillRect(5, 2, 10, 9);
  // Casco (borgoñota)
  ctx.fillStyle = '#888';
  ctx.fillRect(4, 0, 12, 5);
  // Piernas
  ctx.fillStyle = '#3a2a0a';
  ctx.fillRect(4, e.h - 8, 5, 8);
  ctx.fillRect(11, e.h - 8, 5, 8);
  // Arma
  if (e.type === 'boss') {
    // Espada/alabarda
    ctx.fillStyle = '#ccc';
    ctx.fillRect(16, 8, 3, 20);
    ctx.fillRect(13, 8, 9, 3);
  } else {
    ctx.fillStyle = '#5a4a1a';
    ctx.fillRect(16, 13, 6, 2);
  }
  // Alerta: ojos rojos
  if (e.state === 'alert' || e.state === 'shoot') {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(6, 4, 2, 2);
    ctx.fillRect(12, 4, 2, 2);
  }
  ctx.restore();
}

// ── Balas ─────────────────────────────────────────────────────────────
function drawBullet(ctx, b, cx, imgs) {
  const px = b.x - cx;
  ctx.fillStyle = b.owner === 'player' ? PAL.bullet : PAL.eBullet;
  ctx.fillRect(Math.round(px), Math.round(b.y), b.w, b.h);
  // Destello
  ctx.fillStyle = b.owner === 'player' ? 'rgba(255,255,200,0.6)' : 'rgba(255,100,100,0.4)';
  ctx.fillRect(Math.round(px) - 2, Math.round(b.y) - 1, b.w + 4, b.h + 2);
}

// ── Granada ───────────────────────────────────────────────────────────
function drawGrenade(ctx, g, cx) {
  const px = Math.round(g.x - cx);
  ctx.fillStyle = PAL.grenade;
  ctx.beginPath();
  ctx.arc(px + 4, Math.round(g.y) + 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#444';
  ctx.fillRect(px + 3, Math.round(g.y) - 2, 2, 3);
}

// ── Explosión ─────────────────────────────────────────────────────────
function drawExplosion(ctx, ex, cx, imgs, now) {
  const px = ex.x - cx;
  const pct = ex.frame / ex.maxFrames;

  const sp = imgs?.explosions;
  if (sp?.complete && sp.naturalWidth > 1) {
    const fw = 32, fh = 32;
    const fx = ex.frame * fw;
    ctx.drawImage(sp, fx, ex.spriteRow * fh, fw, fh, px - ex.r * 0.5, ex.y - ex.r * 0.5, ex.r, ex.r);
  } else {
    // Fallback: círculos concéntricos
    const alpha = 1 - pct;
    const r     = ex.r * (0.3 + pct * 0.7);
    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(px, ex.y, 0, px, ex.y, r);
    grad.addColorStop(0,   '#fff');
    grad.addColorStop(0.2, PAL.explosion2);
    grad.addColorStop(0.6, PAL.explosion1);
    grad.addColorStop(1,   'rgba(180,40,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, ex.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Bandera de fin de nivel ───────────────────────────────────────────
function drawFlag(ctx, fx, fy) {
  if (fx < -20 || fx > CANVAS_W + 20) return;
  // Mástil
  ctx.fillStyle = '#8a7050';
  ctx.fillRect(Math.round(fx), fy, 3, 60);
  // Banderín (rojo y dorado, Tercios)
  ctx.fillStyle = PAL.flag;
  ctx.fillRect(Math.round(fx) + 3, fy, 24, 16);
  ctx.fillStyle = '#ddaa00';
  ctx.fillRect(Math.round(fx) + 3, fy + 16, 24, 8);
}

// ── Prisionero ────────────────────────────────────────────────────────
function drawPrisoner(ctx, p, cx) {
  const px = Math.round(p.x - cx);
  const py = Math.round(p.y);
  // Parpadeo de llamada de atención
  ctx.fillStyle = PAL.prisoner;
  ctx.fillRect(px + 2, py, 10, 14);  // cuerpo
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(px + 3, py - 8, 8, 8); // cabeza
  // Manos atadas
  ctx.fillStyle = '#cc8800';
  ctx.fillRect(px, py + 2, 4, 2);
  ctx.fillRect(px + 10, py + 2, 4, 2);
  // Texto "!" parpadeante
  if (Math.floor(performance.now() / 500) % 2 === 0) {
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', px + 7, py - 10);
  }
}
