import { useEffect, useRef, useCallback } from 'react';
import { createGameState, tickGame, CANVAS_W, CANVAS_H, getPlayerFrame } from './logic/gameLoop.js';
import { GROUND_Y } from './logic/levelData.js';

// ── Imports de sprites ────────────────────────────────────────────────────
import sprPlayer    from './img/tercioProtagonista.png';
import sprPikeman   from './img/enemigoPica.png';
import sprArcher    from './img/enemigoArco-removebg-preview.png';
import sprEffects   from './img/efectosDisparos-removebg-preview.png';
import sprBarrel    from './img/barril-removebg-preview.png';
import sprCannon    from './img/cañon-removebg-preview.png';
import sprBridge    from './img/puente-removebg-preview.png';
import sprMusket    from './img/mosqueton-removebg-preview.png';
import sprBg        from './img/tiles2.png';

// ── Eliminar fondo blanco de un sprite ────────────────────────────────────
function processSheet(img, threshold = 240) {
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height);
  const d    = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] >= threshold && d[i+1] >= threshold && d[i+2] >= threshold) {
      d[i+3] = 0;
    }
  }
  x.putImageData(data, 0, 0);
  return c;
}

// ── Paleta fallback ───────────────────────────────────────────────────────
const PAL = {
  sky1: '#7ec8e3', sky2: '#c9e8f5',
  ground: '#5a4a2a', grassTop: '#4a7c2f',
  player: '#c8a050', playerArmor: '#556b2f',
  enemySold: '#8b1a1a', enemyGun: '#6b1a4a', boss: '#3a0a0a',
  bullet: '#ffdd44', eBullet: '#ff4444',
  grenade: '#5a4020',
  explosion1: '#ff8800', explosion2: '#ffdd00',
  houseWall: '#c8a87a', houseRoof: '#8b3a1a',
  tree: '#2d5a1b', treeTrunk: '#5a3a1a',
  tower: '#888880', flag: '#cc3333', prisoner: '#ddcc88',
};

export default function TerciosCanvas({ onScore, onDie, onWin, paused }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const keysRef    = useRef({ left:false, right:false, jump:false, jumpPressed:false, shoot:false, grenadePressed:false });
  const imgsRef    = useRef({});
  const rafRef     = useRef(null);
  const pausedRef  = useRef(paused);
  pausedRef.current = paused;

  // ── Carga y procesado de imágenes ────────────────────────────────────
  useEffect(() => {
    const imgs = imgsRef.current;

    const loadRaw = (src) => {
      const img = new Image();
      img.src = src;
      return img;
    };
    const loadProcessed = (src, threshold = 240) => {
      const img = new Image();
      img.onload = () => { imgs[src] = processSheet(img, threshold); };
      img.src = src;
    };

    // Fondo: sin procesado (ya tiene transparencia / colores oscuros)
    imgs.bg     = loadRaw(sprBg);
    imgs.cannon = loadRaw(sprCannon);
    imgs.bridge = loadRaw(sprBridge);
    imgs.musket = loadRaw(sprMusket);

    // Sprites con fondo blanco: eliminar blanco
    loadProcessed(sprPlayer,  235);
    loadProcessed(sprPikeman, 235);
    loadProcessed(sprArcher,  235);
    loadProcessed(sprEffects, 240);
    loadProcessed(sprBarrel,  235);

    // Usar las claves de src como referencia
    imgs._keys = { player: sprPlayer, pikeman: sprPikeman, archer: sprArcher,
                   effects: sprEffects, barrel: sprBarrel };

    stateRef.current = createGameState(0);
  }, []);

  // ── Teclado ───────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      const k = keysRef.current;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') k.left  = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = true;
      if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && !e.repeat) {
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
      if (e.code === 'ArrowUp'    || e.code === 'KeyW' || e.code === 'Space') k.jump = false;
      if (e.code === 'KeyJ' || e.code === 'KeyZ') k.shoot = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Controles táctiles ────────────────────────────────────────────────
  const pressKey   = useCallback((k) => {
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

  // ── Bucle principal ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (pausedRef.current || !stateRef.current) return;
      const gs  = stateRef.current;
      const now = performance.now();
      tickGame(gs, keysRef.current, now, onScore, onDie, onWin);
      render(ctx, gs, imgsRef.current, now);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onScore, onDie, onWin]);

  return (
    <div className="tercios-wrapper">
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="tercios-canvas" />

      <div className="tercios-controls">
        <div className="tc-dpad">
          <button className="tc-btn tc-left"
            onPointerDown={() => pressKey('left')}   onPointerUp={() => releaseKey('left')}
            onPointerLeave={() => releaseKey('left')}>◀</button>
          <button className="tc-btn tc-right"
            onPointerDown={() => pressKey('right')}  onPointerUp={() => releaseKey('right')}
            onPointerLeave={() => releaseKey('right')}>▶</button>
        </div>
        <div className="tc-actions">
          <button className="tc-btn tc-jump"
            onPointerDown={() => pressKey('jump')}   onPointerUp={() => releaseKey('jump')}
            onPointerLeave={() => releaseKey('jump')}>↑</button>
          <button className="tc-btn tc-shoot"
            onPointerDown={() => pressKey('shoot')}  onPointerUp={() => releaseKey('shoot')}
            onPointerLeave={() => releaseKey('shoot')}>🔫</button>
          <button className="tc-btn tc-grenade"
            onPointerDown={() => pressKey('grenade')}>💣</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════════════════
function getImg(imgs, key) {
  // Las imágenes procesadas se guardan con su src como clave
  const k = imgs._keys?.[key];
  return k ? imgs[k] : null;
}

function render(ctx, gs, imgs, now) {
  const { player, enemies, bullets, grenades, explosions, camera, level, prisoners } = gs;
  const cx = Math.round(camera.x);

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  drawBackground(ctx, imgs, cx, level, now);

  for (const d of level.decorations) drawDecoration(ctx, d, cx, imgs);
  for (const p of level.platforms)   drawPlatform(ctx, p, cx);

  drawFlag(ctx, level.flagX - cx, GROUND_Y - 60);

  for (const p of prisoners)  { if (!p.rescued) drawPrisoner(ctx, p, cx, now); }
  for (const e of enemies)    drawEnemy(ctx, e, cx, imgs, now);
  drawPlayer(ctx, player, cx, imgs, now);
  for (const b of bullets)    { if (b.active) drawBullet(ctx, b, cx, imgs); }
  for (const g of grenades)   { if (g.active) drawGrenade(ctx, g, cx, imgs); }
  for (const ex of explosions){ if (ex.active) drawExplosion(ctx, ex, cx, imgs, now); }
}

// ── Fondo ─────────────────────────────────────────────────────────────────
function drawBackground(ctx, imgs, cx, level, now) {
  const bg = imgs.bg;
  if (bg?.complete && bg.naturalWidth > 1) {
    // tiles2.png es vertical — lo escalamos a CANVAS_H y repetimos horizontalmente
    const scaledW = (bg.naturalWidth / bg.naturalHeight) * CANVAS_H;
    // Parallax: fondo se mueve a 0.35x velocidad de cámara
    let bx = -(cx * 0.35) % scaledW;
    if (bx > 0) bx -= scaledW;
    // Dibuja suficientes copias para cubrir el ancho
    for (let x = bx; x < CANVAS_W; x += scaledW) {
      ctx.drawImage(bg, x, 0, scaledW, CANVAS_H);
    }
  } else {
    // Fallback: cielo degradado
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.7);
    grad.addColorStop(0, PAL.sky2);
    grad.addColorStop(1, PAL.sky1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Nubes
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const clouds = [[80,30],[240,20],[400,40],[620,25],[820,35]];
    for (const [bxc, by] of clouds) {
      const x = ((bxc - cx * 0.3) % (CANVAS_W * 3) + CANVAS_W * 3) % (CANVAS_W * 3);
      if (x < CANVAS_W + 80) {
        ctx.beginPath();
        ctx.ellipse(x % CANVAS_W, by, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// ── Plataforma ────────────────────────────────────────────────────────────
function drawPlatform(ctx, p, cx) {
  const px = p.x - cx;
  if (px + p.w < 0 || px > CANVAS_W) return;

  const isGround = p.h >= 24;
  ctx.fillStyle = PAL.grassTop;
  ctx.fillRect(px, p.y, p.w, isGround ? 5 : 3);
  ctx.fillStyle = PAL.ground;
  ctx.fillRect(px, p.y + (isGround ? 5 : 3), p.w, p.h - (isGround ? 5 : 3));
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
}

// ── Decoraciones ──────────────────────────────────────────────────────────
function drawDecoration(ctx, d, cx, imgs) {
  const x = d.x - cx;
  if (x + d.w < -80 || x > CANVAS_W + 80) return;

  switch (d.type) {
    case 'cannon': {
      const img = imgs.cannon;
      if (img?.complete && img.naturalWidth > 1) {
        ctx.drawImage(img, x, d.y, d.w, d.h);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, d.y + d.h * 0.3, d.w * 0.75, d.h * 0.4);
      }
      break;
    }
    case 'tower':
      ctx.fillStyle = PAL.tower;
      ctx.fillRect(x, d.y, d.w, d.h);
      for (let i = 0; i < 3; i++) ctx.fillRect(x + i * (d.w / 3), d.y - 8, d.w / 3 - 2, 8);
      ctx.fillStyle = '#334';
      ctx.fillRect(x + d.w * 0.25, d.y + d.h * 0.3, d.w * 0.5, d.h * 0.25);
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
      ctx.fillStyle = '#ccddff';
      ctx.fillRect(x + 8, d.y + d.h * 0.5, 14, 12);
      ctx.fillRect(x + d.w - 22, d.y + d.h * 0.5, 14, 12);
      break;
    case 'tree':
      ctx.fillStyle = PAL.treeTrunk;
      ctx.fillRect(x + d.w * 0.35, d.y + d.h * 0.5, d.w * 0.3, d.h * 0.5);
      ctx.fillStyle = PAL.tree;
      ctx.beginPath();
      ctx.ellipse(x + d.w / 2, d.y + d.h * 0.35, d.w * 0.55, d.h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default: break;
  }
}

// ── Jugador ───────────────────────────────────────────────────────────────
function drawPlayer(ctx, player, cx, imgs, now) {
  const px = Math.round(player.x - cx);
  const py = Math.round(player.y);

  if (player.invincible && Math.floor(now / 80) % 2 === 0) return;

  const sp = getImg(imgs, 'player');
  if (sp?.width > 1) {
    // tercioProtagonista.png: 4 frames de carrera en fila superior.
    // Frame aproximado: 1/5 del ancho total (dejar margen derecho para la referencia).
    // Fila 0 (y=0..~64): run frames.  Ajustar sw/sh cuando se midan los píxeles exactos.
    const totalFrames = 4;
    const fw = Math.floor(sp.width  * 0.19);   // ~1/5 del ancho
    const fh = Math.floor(sp.height * 0.30);   // ~1/3 del alto
    const animIdx = player.state === 'idle' ? 0
                  : Math.floor(now / 120) % totalFrames;
    const sx = animIdx * fw;
    const sy = 0;

    ctx.save();
    if (player.facing === -1) {
      ctx.translate(px + player.w, py);
      ctx.scale(-1, 1);
      ctx.drawImage(sp, sx, sy, fw, fh, 0, 0, player.w, player.h);
    } else {
      ctx.drawImage(sp, sx, sy, fw, fh, px, py, player.w, player.h);
    }
    ctx.restore();
  } else {
    drawPlayerFallback(ctx, player, px, py);
  }
}

function drawPlayerFallback(ctx, p, px, py) {
  ctx.save();
  if (p.facing === -1) { ctx.translate(px + p.w, py); ctx.scale(-1, 1); ctx.translate(-p.w, 0); }
  else ctx.translate(px, py);
  ctx.fillStyle = PAL.player;     ctx.fillRect(4, 10, 12, 12);
  ctx.fillStyle = PAL.playerArmor;ctx.fillRect(3, 10, 14, 8);
  ctx.fillStyle = '#d4a870';      ctx.fillRect(5, 2, 10, 9);
  ctx.fillStyle = '#667';         ctx.fillRect(4, 0, 12, 5); ctx.fillRect(2, 3, 16, 2);
  ctx.fillStyle = '#4a3a1a';      ctx.fillRect(4, 22, 5, 6); ctx.fillRect(11, 22, 5, 6);
  ctx.fillStyle = '#4a3a1a';      ctx.fillRect(16, 12, 6, 2); ctx.fillRect(14, 11, 4, 4);
  ctx.restore();
}

// ── Enemigos ──────────────────────────────────────────────────────────────
function drawEnemy(ctx, e, cx, imgs, now) {
  if (e.state === 'dead' && e.y > CANVAS_H + 40) return;
  const px = Math.round(e.x - cx);
  const py = Math.round(e.y);
  if (px + e.w < -20 || px > CANVAS_W + 20) return;

  // Elegir sprite según tipo de enemigo
  const sprKey = e.type === 'boss' ? 'pikeman' : e.type === 'gunner' ? 'archer' : 'pikeman';
  const sp = getImg(imgs, sprKey);

  if (sp?.width > 1) {
    const totalFrames = e.type === 'boss' ? 2 : 4;
    const fw = Math.floor(sp.width  / totalFrames);
    const fh = sp.height;
    // Para boss: usa frames de la fila inferior (más grande)
    const rowH  = e.type === 'boss' ? Math.floor(fh * 0.5) : fh;
    const rowY  = e.type === 'boss' ? Math.floor(fh * 0.5) : 0;
    const animIdx = e.state === 'dead' ? 0
                  : Math.floor(now / 150) % totalFrames;
    const sx = animIdx * fw;

    ctx.save();
    if (e.state === 'dead') ctx.globalAlpha = 0.5;
    if (e.facing === -1) {
      ctx.translate(px + e.w, py);
      ctx.scale(-1, 1);
      ctx.drawImage(sp, sx, rowY, fw, rowH, 0, 0, e.w, e.h);
    } else {
      ctx.drawImage(sp, sx, rowY, fw, rowH, px, py, e.w, e.h);
    }
    ctx.restore();
  } else {
    drawEnemyFallback(ctx, e, px, py);
  }

  // Barra de vida
  if (e.maxHp > 1 && e.state !== 'dead') {
    const pct = e.hp / e.maxHp;
    ctx.fillStyle = '#550000';
    ctx.fillRect(px, py - 6, e.w, 3);
    ctx.fillStyle = e.type === 'boss' ? '#ff4400' : '#ff8866';
    ctx.fillRect(px, py - 6, e.w * pct, 3);
  }
}

function drawEnemyFallback(ctx, e, px, py) {
  const color = e.type === 'boss' ? PAL.boss : e.type === 'gunner' ? PAL.enemyGun : PAL.enemySold;
  ctx.save();
  if (e.state === 'dead') ctx.globalAlpha = 0.4;
  if (e.facing === -1) { ctx.translate(px + e.w, py); ctx.scale(-1, 1); ctx.translate(-e.w, 0); }
  else ctx.translate(px, py);
  ctx.fillStyle = color;  ctx.fillRect(3, 10, 14, 12);
  ctx.fillStyle = '#cc8870'; ctx.fillRect(5, 2, 10, 9);
  ctx.fillStyle = '#888';  ctx.fillRect(4, 0, 12, 5);
  ctx.fillStyle = '#3a2a0a'; ctx.fillRect(4, e.h - 8, 5, 8); ctx.fillRect(11, e.h - 8, 5, 8);
  ctx.restore();
}

// ── Bala ──────────────────────────────────────────────────────────────────
function drawBullet(ctx, b, cx, imgs) {
  const px = Math.round(b.x - cx);
  const py = Math.round(b.y);
  const sp = getImg(imgs, 'effects');

  if (sp?.width > 1 && b.owner === 'player') {
    // efectosDisparos.png fila inferior (fila 2): balas, ~1/3 ancho c/u, 1/3 alto
    const fw = Math.floor(sp.width  / 3);
    const fh = Math.floor(sp.height / 3);
    // Primera bala (musket ball): columna 0, fila 2
    ctx.drawImage(sp, 0, fh * 2, fw, fh, px - 4, py - 4, 12, 8);
  } else {
    ctx.fillStyle = b.owner === 'player' ? PAL.bullet : PAL.eBullet;
    ctx.fillRect(px, py, b.w, b.h);
    ctx.fillStyle = b.owner === 'player' ? 'rgba(255,255,200,0.5)' : 'rgba(255,100,100,0.4)';
    ctx.fillRect(px - 1, py - 1, b.w + 2, b.h + 2);
  }
}

// ── Granada ───────────────────────────────────────────────────────────────
function drawGrenade(ctx, g, cx, imgs) {
  const px = Math.round(g.x - cx);
  const py = Math.round(g.y);
  const sp = getImg(imgs, 'barrel');

  if (sp?.width > 1) {
    ctx.drawImage(sp, px - 4, py - 4, 16, 16);
  } else {
    ctx.fillStyle = PAL.grenade;
    ctx.beginPath();
    ctx.arc(px + 4, py + 4, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Explosión ──────────────────────────────────────────────────────────────
function drawExplosion(ctx, ex, cx, imgs, now) {
  const px  = ex.x - cx;
  const pct = ex.frame / ex.maxFrames;
  const sp  = getImg(imgs, 'effects');

  if (sp?.width > 1) {
    // efectosDisparos.png: 3 columnas × 3 filas
    // Fila 0: explosiones fuego (3 frames)
    // Fila 1: humo (3 frames)
    const fw   = Math.floor(sp.width  / 3);
    const fh   = Math.floor(sp.height / 3);
    const col  = Math.min(2, ex.frame);
    const row  = ex.frame < 3 ? 0 : 1;   // fuego primero, luego humo
    const size = ex.r * (0.6 + pct * 0.8);
    ctx.save();
    ctx.globalAlpha = 1 - pct * 0.7;
    ctx.drawImage(sp, col * fw, row * fh, fw, fh, px - size / 2, ex.y - size / 2, size, size);
    ctx.restore();
  } else {
    const alpha = 1 - pct;
    const r     = ex.r * (0.3 + pct * 0.7);
    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(px, ex.y, 0, px, ex.y, r);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.2, PAL.explosion2);
    grad.addColorStop(0.6, PAL.explosion1);
    grad.addColorStop(1, 'rgba(180,40,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, ex.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Bandera fin de nivel ───────────────────────────────────────────────────
function drawFlag(ctx, fx, fy) {
  if (fx < -20 || fx > CANVAS_W + 20) return;
  ctx.fillStyle = '#8a7050';
  ctx.fillRect(Math.round(fx), fy, 3, 60);
  ctx.fillStyle = '#cc3333';
  ctx.fillRect(Math.round(fx) + 3, fy, 22, 14);
  ctx.fillStyle = '#ddaa00';
  ctx.fillRect(Math.round(fx) + 3, fy + 14, 22, 7);
}

// ── Prisionero ────────────────────────────────────────────────────────────
function drawPrisoner(ctx, p, cx, now) {
  const px = Math.round(p.x - cx);
  const py = Math.round(p.y);
  ctx.fillStyle = PAL.prisoner;
  ctx.fillRect(px + 2, py, 10, 14);
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(px + 3, py - 8, 8, 8);
  ctx.fillStyle = '#cc8800';
  ctx.fillRect(px, py + 2, 4, 2);
  ctx.fillRect(px + 10, py + 2, 4, 2);
  if (Math.floor(now / 500) % 2 === 0) {
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', px + 7, py - 10);
  }
}
