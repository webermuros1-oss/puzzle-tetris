import { useEffect, useRef, useCallback } from 'react';
import { createGameState, tickGame, CANVAS_W, CANVAS_H } from './logic/gameLoop.js';
import { FLOOR_Y, TETILLA_SIZES } from './logic/tetillas.js';
import { PLAYER_DRAW_W, PLAYER_DRAW_H, PLAYER_FRAMES } from './spritesConfig/playerSprites.js';
import { TETILLA_DRAW_SIZE, TETILLA_FRAMES, TETILLA_FRAME_W, TETILLA_FRAME_H,
         MEXILLON_FRAME, MEXILLON_FRAME_W, MEXILLON_FRAME_H } from './spritesConfig/tetillaSprites.js';
import { audio } from './logic/audioManager.js';

// Importaciones de sprites (coloca tus imágenes reales en ./img/)
import sprMestra        from './img/mestra.png';
import sprMestraEspaldas from './img/maestraEspaldas.png';
import sprQueso         from './img/queso.png';
import sprMexillon      from './img/mexillon.png';
import sprBg0           from './img/faroFisterra.avif';
import sprBg1           from './img/montelouro.jpg';

// ── Eliminar fondo blanco/gris de spritesheets ────────────────────────────
function processSheet(img, threshold = 238) {
  const c   = document.createElement('canvas');
  c.width   = img.naturalWidth;
  c.height  = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id  = ctx.getImageData(0, 0, c.width, c.height);
  const d   = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] >= threshold && d[i+1] >= threshold && d[i+2] >= threshold) d[i+3] = 0;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

// ── Colores de fallback por tamaño ────────────────────────────────────────
const TETILLA_COLORS = {
  large:  '#e8c84a',
  medium: '#f0a030',
  small:  '#e87040',
  tiny:   '#d04060',
};

// ══════════════════════════════════════════════════════════════════════════
export default function TetillasCanvas({ levelIndex, onScore, onDie, onWin, paused }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const keysRef   = useRef({ left: false, right: false, shoot: false, jump: false, _shootConsumed: false, _jumpConsumed: false });
  const imgsRef   = useRef({});
  const rafRef    = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // ── Carga de sprites ──────────────────────────────────────────────────
  useEffect(() => {
    const imgs = imgsRef.current;

    // Carga imagen sin procesar (para fondos con canal alpha correcto)
    const raw = (src) => { const i = new Image(); i.src = src; return i; };
    // Carga y elimina el fondo blanco del sheet
    const proc = (key, src, thr = 238) => {
      const i = new Image();
      i.onload = () => { imgs[key] = processSheet(i, thr); };
      i.src = src;
    };

    imgs.bg0     = raw(sprBg0);
    imgs.bg1     = raw(sprBg1);
    proc('mestra',         sprMestra,         240);
    proc('mestraEspaldas', sprMestraEspaldas, 240);
    proc('queso',          sprQueso,          240);
    proc('mexillon',       sprMexillon,       240);

    stateRef.current = createGameState(levelIndex);
    audio.preload();
    audio.playBgMusic(levelIndex);

    return () => audio.stopBgMusic();
  }, [levelIndex]);

  // ── Teclado ───────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      const k = keysRef.current;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') k.left  = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = true;
      if ((e.code === 'Space' || e.code === 'KeyJ') && !e.repeat) {
        k.shoot = true;
        audio.playShoot();
      }
      if ((e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) {
        k.jump = true;
        audio.playJump();
      }
      if (['Space','ArrowLeft','ArrowRight','ArrowUp'].includes(e.code)) e.preventDefault();
    };
    const up = (e) => {
      const k = keysRef.current;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') k.left  = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = false;
      if (e.code === 'Space' || e.code === 'KeyJ')      k.shoot = false;
      if (e.code === 'ArrowUp'    || e.code === 'KeyW') k.jump  = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  // ── Botones táctiles ──────────────────────────────────────────────────
  const press = useCallback((k) => {
    const ks = keysRef.current;
    if (k === 'left')  ks.left  = true;
    if (k === 'right') ks.right = true;
    if (k === 'shoot') { ks.shoot = true; audio.playShoot(); }
    if (k === 'jump')  { ks.jump  = true; audio.playJump(); }
  }, []);
  const release = useCallback((k) => {
    const ks = keysRef.current;
    if (k === 'left')  ks.left  = false;
    if (k === 'right') ks.right = false;
    if (k === 'shoot') ks.shoot = false;
    if (k === 'jump')  ks.jump  = false;
  }, []);

  // ── Bucle principal ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    let   last   = performance.now();

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (pausedRef.current || !stateRef.current) return;

      const now = performance.now();
      const dt  = Math.min((now - last) / 1000, 0.05); // cap 50ms para evitar tunneling
      last      = now;

      const prevTetillas = stateRef.current?.tetillas.filter(t => t.alive).length ?? 0;
      tickGame(stateRef.current, keysRef.current, now, dt, {
        onScore: (s) => { audio.playPop(); onScore?.(s); },
        onDie:   ()  => { audio.playHitPlayer(); setTimeout(() => audio.playGameOver(), 800); onDie?.(); },
        onWin:   ()  => { audio.playLevelClear(); onWin?.(); },
      });
      // Tiny tetillas (no split further) emit destroy sound
      const newAlive = stateRef.current?.tetillas.filter(t => t.alive).length ?? 0;
      void prevTetillas; void newAlive;

      renderFrame(ctx, stateRef.current, imgsRef.current, now);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onScore, onDie, onWin]);

  return (
    <div className="tetillas-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="tetillas-canvas"
      />

      {/* Controles táctiles */}
      <div className="tetillas-controls">
        {/* Cruceta Nintendo */}
        <div className="tt-dpad">
          {/* Fila 1 */}
          <div className="tt-dpad-empty" />
          <button className="tt-btn tt-dpad-up"
            onPointerDown={() => press('jump')}
            onPointerUp={() => release('jump')}
            onPointerLeave={() => release('jump')}>▲</button>
          <div className="tt-dpad-empty" />
          {/* Fila 2 */}
          <button className="tt-btn tt-dpad-left"
            onPointerDown={() => press('left')}
            onPointerUp={() => release('left')}
            onPointerLeave={() => release('left')}>◀</button>
          <div className="tt-dpad-center" />
          <button className="tt-btn tt-dpad-right"
            onPointerDown={() => press('right')}
            onPointerUp={() => release('right')}
            onPointerLeave={() => release('right')}>▶</button>
          {/* Fila 3 */}
          <div className="tt-dpad-empty" />
          <button className="tt-btn tt-dpad-down" disabled>▼</button>
          <div className="tt-dpad-empty" />
        </div>
        {/* Botón de disparo */}
        <div className="tt-action-btns">
          <button className="tt-shoot"
            onPointerDown={() => press('shoot')}
            onPointerUp={() => release('shoot')}
            onPointerLeave={() => release('shoot')}>🐚</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════════════════
function renderFrame(ctx, gs, imgs, now) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  drawBackground(ctx, imgs, gs.level?.bgIndex ?? 0);
  drawFloor(ctx);

  // Tetillas (solo las vivas)
  for (const t of gs.tetillas) {
    if (t.alive) drawTetilla(ctx, t, imgs);
  }

  // Cables/disparos activos
  for (const shot of gs.shots) {
    if (shot.active) drawShot(ctx, shot, imgs);
  }

  // Explosiones
  for (const ex of gs.explosions) {
    if (ex.active) drawExplosion(ctx, ex);
  }

  // Jugador
  drawPlayer(ctx, gs.player, imgs, now);

  // Overlays de fase
  drawPhaseOverlay(ctx, gs, now);
}

// ── Fondo ─────────────────────────────────────────────────────────────────
function drawBackground(ctx, imgs, bgIndex) {
  const bg = bgIndex === 1 ? imgs.bg1 : imgs.bg0;
  if (bg?.complete && bg.naturalWidth > 1) {
    // Estirar para cubrir el canvas completo (sin barras)
    ctx.drawImage(bg, 0, 0, CANVAS_W, CANVAS_H);
    return;
  }
  // Fallback: degradado gallego (verdes y azules del paisaje)
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0,    '#4a8fc4');   // cielo azul atlántico
  grad.addColorStop(0.55, '#7ec88e');   // verde galego
  grad.addColorStop(0.85, '#5a9a4a');
  grad.addColorStop(1,    '#4a7a3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ── Suelo ─────────────────────────────────────────────────────────────────
function drawFloor(ctx) {
  // Franja de hierba
  ctx.fillStyle = '#4a7a2a';
  ctx.fillRect(0, FLOOR_Y, CANVAS_W, CANVAS_H - FLOOR_Y);
  ctx.fillStyle = '#5a9a3a';
  ctx.fillRect(0, FLOOR_Y, CANVAS_W, 4);
  ctx.fillStyle = '#3a6020';
  ctx.fillRect(0, FLOOR_Y + 4, CANVAS_W, CANVAS_H - FLOOR_Y - 4);
  // Línea de separación
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y); ctx.lineTo(CANVAS_W, FLOOR_Y);
  ctx.stroke();
}

// ── Tetilla ───────────────────────────────────────────────────────────────
function drawTetilla(ctx, t, imgs) {
  const drawSize = TETILLA_DRAW_SIZE[t.size];
  const dx = Math.round(t.x - drawSize / 2);
  const dy = Math.round(t.y - drawSize / 2);

  const sp     = imgs.queso;
  const frames = TETILLA_FRAMES[t.size];

  if (sp?.width > 1 && frames) {
    const f = frames[t.frame % frames.length];
    ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh,
      Math.round(t.x - drawSize / 2), Math.round(t.y - drawSize / 2), drawSize, drawSize);
    return;
  }

  // Fallback: círculo de color con degradado 3D
  const color = TETILLA_COLORS[t.size] ?? '#e0c040';
  const grad  = ctx.createRadialGradient(
    t.x - drawSize * 0.2, t.y - drawSize * 0.2, drawSize * 0.05,
    t.x, t.y, drawSize * 0.6
  );
  grad.addColorStop(0, '#ffffff80');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, _darken(color, 0.4));

  ctx.beginPath();
  ctx.arc(t.x, t.y, drawSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Borde
  ctx.strokeStyle = _darken(color, 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Mini letra para identificar tamaño
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font      = `bold ${Math.max(7, drawSize * 0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.size[0].toUpperCase(), t.x, t.y);
}

// ── Cable de disparo (mexillóns en fila) ──────────────────────────────────
function drawShot(ctx, shot, imgs) {
  const cx = Math.round(shot.x + shot.w / 2);
  const sp = imgs.mexillon;

  if (sp?.width > 1 && shot.h > 0) {
    // Repetir el sprite de mexillón a lo largo del cable
    const mh = MEXILLON_FRAME_H;
    const mw = MEXILLON_FRAME_W;
    const { sx, sy, sw, sh } = MEXILLON_FRAME;
    let iy = Math.round(shot.baseY) - mh;
    while (iy >= Math.round(shot.y) - mh) {
      ctx.drawImage(sp, sx, sy, sw, sh, cx - mw/2, iy, mw, mh);
      iy -= mh;
    }
    return;
  }

  // Fallback: línea azul turquesa semitransparente
  ctx.save();
  ctx.strokeStyle = 'rgba(120,220,255,0.85)';
  ctx.lineWidth   = shot.w;
  ctx.lineCap     = 'round';
  ctx.shadowColor = '#60d0ff';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.moveTo(cx, shot.baseY);
  ctx.lineTo(cx, Math.round(shot.y));
  ctx.stroke();
  ctx.restore();
}

// ── Explosión ─────────────────────────────────────────────────────────────
function drawExplosion(ctx, ex) {
  const pct = ex.frame / ex.maxFrames;
  const r   = ex.r * (0.3 + pct * 0.8);

  ctx.save();
  ctx.globalAlpha = 1 - pct;

  // Onda de choque
  const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, r);
  grad.addColorStop(0,   '#ffffff');
  grad.addColorStop(0.25,'#ffe070');
  grad.addColorStop(0.6, '#ff8820');
  grad.addColorStop(1,   'rgba(200,60,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Partículas pequeñas
  if (pct < 0.6) {
    const numP = 6;
    for (let i = 0; i < numP; i++) {
      const angle = (i / numP) * Math.PI * 2 + pct * 3;
      const dist  = r * 0.8;
      const px    = ex.x + Math.cos(angle) * dist;
      const py    = ex.y + Math.sin(angle) * dist;
      ctx.fillStyle = '#ffe090';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Jugador ───────────────────────────────────────────────────────────────
function drawPlayer(ctx, player, imgs, now) {
  const sp  = imgs.mestra;
  const vw  = PLAYER_DRAW_W;
  const vh  = PLAYER_DRAW_H;

  // Parpadeo durante invincibilidad (flash each 80ms)
  if (player.invincible && Math.floor(now / 80) % 2 === 0) return;

  // Posición visual: centrada en el hitbox, pies en y + h
  const vx = Math.round(player.x + (player.w - vw) / 2);
  const vy = Math.round(player.y + player.h - vh);

  const isShooting = player.state === 'shoot';

  // Cuando dispara: usar maestraEspaldas (imagen completa, sin spritesheet)
  if (isShooting) {
    const spE = imgs.mestraEspaldas;
    if (spE?.width > 1) {
      ctx.save();
      if (!player.alive) ctx.globalAlpha = 0.45;
      ctx.drawImage(spE, 0, 0, spE.width, spE.height, vx, vy, vw, vh);
      ctx.restore();
      return;
    }
  }

  // Elegir estado de animación (usar 'shootUp' como fallback si no hay mestraEspaldas)
  const stKey  = isShooting ? 'shootUp'
               : (PLAYER_FRAMES[player.state] ? player.state : 'idle');
  const frames = PLAYER_FRAMES[stKey];
  const fi     = Math.floor(now / 120) % frames.length;
  const f      = frames[fi];

  // Intentar dibujar con sprite
  const spW = sp?.width ?? 0;
  if (sp && spW > 1) {
    ctx.save();
    const alpha = player.alive ? 1 : 0.45;
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (player.facing === -1) {
      // Espejo horizontal
      ctx.translate(vx + vw, vy);
      ctx.scale(-1, 1);
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, 0, 0, vw, vh);
    } else {
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, vx, vy, vw, vh);
    }
    ctx.restore();
    return;
  }

  // Fallback: figura esquemática de A Mestra con sus colores reales
  _drawPlayerFallback(ctx, vx, vy, vw, vh, player.facing, player.alive);
}

function _drawPlayerFallback(ctx, vx, vy, vw, vh, facing, alive) {
  ctx.save();
  if (!alive) ctx.globalAlpha = 0.45;

  // Cuerpo (vestido rojo gallego)
  const cx = vx + vw / 2;
  ctx.fillStyle = '#c8282a';   // rojo vestido
  ctx.beginPath();
  ctx.ellipse(cx, vy + vh * 0.65, vw * 0.42, vh * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Blusa blanca
  ctx.fillStyle = '#f0ece0';
  ctx.fillRect(cx - vw * 0.22, vy + vh * 0.3, vw * 0.44, vh * 0.28);
  // Chaleco negro
  ctx.fillStyle = '#2a2218';
  ctx.fillRect(cx - vw * 0.15, vy + vh * 0.32, vw * 0.30, vh * 0.24);
  // Cabeza
  ctx.fillStyle = '#d4936a';
  ctx.beginPath();
  ctx.ellipse(cx, vy + vh * 0.18, vw * 0.22, vh * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pelo oscuro
  ctx.fillStyle = '#3a2010';
  ctx.beginPath();
  ctx.ellipse(cx, vy + vh * 0.11, vw * 0.22, vh * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Gaita (lado según facing)
  const gx = facing === 1 ? cx + vw * 0.1 : cx - vw * 0.35;
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(gx, vy + vh * 0.38, vw * 0.28, vh * 0.12);

  ctx.restore();
}

// ── Overlay de fase ───────────────────────────────────────────────────────
function drawPhaseOverlay(ctx, gs, now) {
  if (gs.phase === 'ready') {
    const secs = Math.ceil(gs.readyTimer);
    const blink = Math.floor(now / 400) % 2 === 0;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, CANVAS_H / 2 - 28, CANVAS_W, 56);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (secs <= 0 || blink) {
      ctx.font      = 'bold 26px "Poppins", sans-serif';
      ctx.fillStyle = '#ffe060';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 12;
      ctx.fillText(secs > 0 ? `¡PREPÁRATE!  ${secs}` : '¡AGORA!', CANVAS_W / 2, CANVAS_H / 2);
    }
    ctx.restore();
    return;
  }

  if (gs.phase === 'levelClear') {
    const pulse = 1 + Math.sin(now * 0.008) * 0.06;
    ctx.save();
    ctx.fillStyle = 'rgba(10,40,20,0.55)';
    ctx.fillRect(0, CANVAS_H / 2 - 32, CANVAS_W, 64);
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.scale(pulse, pulse);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 24px "Poppins", sans-serif';
    ctx.fillStyle    = '#6aee88';
    ctx.shadowColor  = '#00ff80';
    ctx.shadowBlur   = 14;
    ctx.fillText('✓ NIVEL SUPERADO!', 0, 0);
    ctx.restore();
    return;
  }

  if (gs.phase === 'gameOver') {
    ctx.save();
    ctx.fillStyle = 'rgba(30,0,0,0.6)';
    ctx.fillRect(0, CANVAS_H / 2 - 32, CANVAS_W, 64);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 24px "Poppins", sans-serif';
    ctx.fillStyle    = '#ff4444';
    ctx.shadowColor  = '#ff0000';
    ctx.shadowBlur   = 16;
    ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2);
    ctx.restore();
  }
}

// ── Utilidades de color ────────────────────────────────────────────────────
function _darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amount)) | 0;
  const g = Math.max(0, ((n >>  8) & 0xff) * (1 - amount)) | 0;
  const b = Math.max(0, ( n        & 0xff) * (1 - amount)) | 0;
  return `rgb(${r},${g},${b})`;
}
