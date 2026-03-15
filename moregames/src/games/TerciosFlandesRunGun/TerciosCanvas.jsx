import { useEffect, useRef, useCallback } from 'react';
import { createGameState, tickGame, CANVAS_W, CANVAS_H } from './logic/gameLoop.js';
import { GROUND_Y } from './logic/levelData.js';

// ── Sprites ───────────────────────────────────────────────────────────────
import sprPlayer  from './img/tercioProtagonista.png'; // 848×1233 → grid 4×5 → frame 212×246
import sprArco    from './img/enemigoArco-removebg-preview.png'; // arquero + piquero + efectos
import sprBarrel  from './img/barril-removebg-preview.png';
import sprCannon  from './img/cañon-removebg-preview.png';
import sprBg1     from './img/tiles2.png';
import sprBg2     from './img/bg2.png';

// ── Frame coords medidas con PIL ──────────────────────────────────────────
// Protagonista: grid 4 cols × 5 rows, frame 212×246
const PF = { w: 212, h: 246 };
const PLAYER_FRAMES = {
  run:  [0,1,2,3].map(c => ({ sx: c*PF.w, sy: 0,        sw: PF.w, sh: PF.h })),
  idle: [{ sx: 0,        sy: 0,        sw: PF.w, sh: PF.h }],
  jump: [{ sx: 0,        sy: PF.h*2,   sw: PF.w, sh: PF.h }],
  fall: [{ sx: PF.w,     sy: PF.h*2,   sw: PF.w, sh: PF.h }],
  shoot:[{ sx: PF.w*2,   sy: PF.h,     sw: PF.w, sh: PF.h }],
  pike: [{ sx: PF.w*3,   sy: PF.h,     sw: PF.w, sh: PF.h }],
  dead: [{ sx: PF.w*3,   sy: PF.h*3,   sw: PF.w, sh: PF.h }],
};

// Arquero (enemigoArco.png, top-right region x=207-401, y=17-308)
// Bounding boxes obtenidos con PIL: 2 cols × 3 rows (~97×97 px cada celda)
const ARCHER_FRAMES = {
  patrol: [
    { sx: 246, sy:  36, sw: 70, sh:  89 },  // standing 1
    { sx: 321, sy:  37, sw: 70, sh:  89 },  // standing 2
  ],
  alert: [
    { sx: 246, sy:  36, sw: 70, sh:  89 },
  ],
  shoot: [
    { sx: 244, sy: 220, sw: 81, sh:  81 },  // shooting 1
    { sx: 323, sy: 231, sw: 63, sh:  70 },  // shooting 2
  ],
  dead:  [{ sx: 246, sy:  36, sw: 70, sh:  89 }],
};

// Piquero (enemigoArco.png, bottom-left region x=15-206, y=335-592)
const PIKEMAN_FRAMES = {
  patrol: [
    { sx:  99, sy: 400, sw: 50, sh:  90 },  // walk 1
    { sx: 157, sy: 400, sw: 50, sh:  90 },  // walk 2
  ],
  alert:  [{ sx: 27, sy: 335, sw: 59, sh: 155 }],  // standing con pica (alta)
  shoot:  [{ sx: 27, sy: 335, sw: 59, sh: 155 }],
  dead:   [{ sx: 99, sy: 400, sw: 50, sh:  90 }],
};

// Tamaños visuales (separados del hitbox de colisión)
const PL_VW = 70, PL_VH = 81;   // jugador visual
const EN_VW = 50;                // enemigo base visual (alto calculado por frame)
const BS_VW = 96, BS_VH = 110;  // boss visual

// ── Eliminar fondo blanco ─────────────────────────────────────────────────
function processSheet(img, threshold = 238) {
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  const x  = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height);
  const d    = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] >= threshold && d[i+1] >= threshold && d[i+2] >= threshold) d[i+3] = 0;
  }
  x.putImageData(data, 0, 0);
  return c;
}

export default function TerciosCanvas({ onScore, onDie, onWin, paused, levelIndex = 0 }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const keysRef    = useRef({ left:false, right:false, jump:false, jumpPressed:false, shoot:false, pikePressed:false, down:false });
  const imgsRef    = useRef({});
  const rafRef     = useRef(null);
  const pausedRef  = useRef(paused);
  pausedRef.current = paused;

  // ── Carga imágenes ────────────────────────────────────────────────────
  useEffect(() => {
    const imgs = imgsRef.current;

    const raw  = (src) => { const i = new Image(); i.src = src; return i; };
    const proc = (key, src, thr = 238) => {
      const i = new Image();
      i.onload = () => { imgs[key] = processSheet(i, thr); };
      i.src = src;
    };

    imgs.bg1    = raw(sprBg1);
    imgs.bg2    = raw(sprBg2);
    imgs.cannon = raw(sprCannon);

    proc('player',  sprPlayer, 238);
    proc('arco',    sprArco,   240);  // arquero + piquero + efectos
    proc('barrel',  sprBarrel, 238);

    stateRef.current = createGameState(levelIndex);
  }, [levelIndex]);

  // ── Teclado ───────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      const k = keysRef.current;
      if (e.code==='ArrowLeft'  || e.code==='KeyA') k.left  = true;
      if (e.code==='ArrowRight' || e.code==='KeyD') k.right = true;
      if ((e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space') && !e.repeat) { k.jump=true; k.jumpPressed=true; }
      if (e.code==='ArrowDown'  || e.code==='KeyS') k.down  = true;
      if (e.code==='KeyJ'||e.code==='KeyZ') k.shoot = true;
      if ((e.code==='KeyK'||e.code==='KeyX') && !e.repeat) k.pikePressed = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const up = (e) => {
      const k = keysRef.current;
      if (e.code==='ArrowLeft' ||e.code==='KeyA') k.left  = false;
      if (e.code==='ArrowRight'||e.code==='KeyD') k.right = false;
      if (e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space') k.jump = false;
      if (e.code==='ArrowDown' ||e.code==='KeyS') k.down  = false;
      if (e.code==='KeyJ'||e.code==='KeyZ') k.shoot = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown',down); window.removeEventListener('keyup',up); };
  }, []);

  // ── Botones táctiles ──────────────────────────────────────────────────
  const press = useCallback((k) => {
    const ks = keysRef.current;
    if (k==='left')  ks.left  = true;
    if (k==='right') ks.right = true;
    if (k==='up')    { ks.jump=true; ks.jumpPressed=true; }
    if (k==='down')  ks.down  = true;
    if (k==='shoot') ks.shoot = true;
    if (k==='pike')  ks.pikePressed = true;
  }, []);
  const release = useCallback((k) => {
    const ks = keysRef.current;
    if (k==='left')  ks.left  = false;
    if (k==='right') ks.right = false;
    if (k==='up')    ks.jump  = false;
    if (k==='down')  ks.down  = false;
    if (k==='shoot') ks.shoot = false;
  }, []);

  // ── Bucle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const loop   = () => {
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

        {/* D-PAD 4 direcciones en cruz */}
        <div className="tc-dpad">
          <div />
          <button className="tc-btn tc-up"
            onPointerDown={()=>press('up')}   onPointerUp={()=>release('up')}
            onPointerLeave={()=>release('up')}>▲</button>
          <div />
          <button className="tc-btn tc-left"
            onPointerDown={()=>press('left')}  onPointerUp={()=>release('left')}
            onPointerLeave={()=>release('left')}>◀</button>
          <div className="tc-center" />
          <button className="tc-btn tc-right"
            onPointerDown={()=>press('right')} onPointerUp={()=>release('right')}
            onPointerLeave={()=>release('right')}>▶</button>
          <div />
          <button className="tc-btn tc-down"
            onPointerDown={()=>press('down')}  onPointerUp={()=>release('down')}
            onPointerLeave={()=>release('down')}>▼</button>
          <div />
        </div>

        {/* 2 botones de acción */}
        <div className="tc-actions">
          <button className="tc-btn tc-shoot"
            onPointerDown={()=>press('shoot')} onPointerUp={()=>release('shoot')}
            onPointerLeave={()=>release('shoot')}>🔫</button>
          <button className="tc-btn tc-pike"
            onPointerDown={()=>press('pike')}>🗡️</button>
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════════════════
function render(ctx, gs, imgs, now) {
  const { player, enemies, bullets, explosions, camera, level, prisoners } = gs;
  const cx = Math.round(camera.x);

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  drawBackground(ctx, imgs, level.bgIndex ?? 0);

  for (const d of level.decorations) drawDecoration(ctx, d, cx, imgs);
  for (const p of level.platforms)   drawPlatform(ctx, p, cx);

  drawFlag(ctx, level.flagX - cx, GROUND_Y - 60);

  for (const p of prisoners)  { if (!p.rescued) drawPrisoner(ctx, p, cx, now); }
  for (const e of enemies)    drawEnemy(ctx, e, cx, imgs, now);
  drawPlayer(ctx, player, cx, imgs, now);

  for (const b of bullets)    { if (b.active) drawBullet(ctx, b, cx); }
  for (const ex of explosions){ if (ex.active) drawExplosion(ctx, ex, cx, imgs); }

  drawPikeHit(ctx, player, cx);
  drawReloadBar(ctx, player, now);
}

// ── Fondo estático ────────────────────────────────────────────────────────
function drawBackground(ctx, imgs, bgIndex) {
  const bg = bgIndex === 1 ? imgs.bg2 : imgs.bg1;
  if (bg?.complete && bg.naturalWidth > 1) {
    const scale = Math.max(CANVAS_W / bg.naturalWidth, CANVAS_H / bg.naturalHeight);
    const dw = bg.naturalWidth  * scale;
    const dh = bg.naturalHeight * scale;
    ctx.drawImage(bg, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#4a6a8a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

// ── Plataformas con canvas (sin tiles con texto) ──────────────────────────
function drawPlatform(ctx, p, cx) {
  const px = p.x - cx;
  if (px + p.w < -20 || px > CANVAS_W + 20) return;

  if (p.h >= 24) {
    // Suelo principal: tierra oscura + bordes
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(px, p.y + 3, p.w, p.h - 3);
    // Franja de césped/tierra en el top
    ctx.fillStyle = '#4a6a22';
    ctx.fillRect(px, p.y, p.w, 4);
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(px, p.y + 4, p.w, 3);
    // Líneas de textura
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let tx = px + 16; tx < px + p.w; tx += 16) {
      ctx.beginPath(); ctx.moveTo(tx, p.y + 4); ctx.lineTo(tx, p.y + p.h); ctx.stroke();
    }
  } else {
    // Plataforma elevada: tablones de madera
    ctx.fillStyle = '#7a5020';
    ctx.fillRect(px, p.y, p.w, p.h);
    // Tono más claro en la cara superior
    ctx.fillStyle = '#a06828';
    ctx.fillRect(px, p.y, p.w, 3);
    // Separadores de tablas
    ctx.strokeStyle = '#4a2a08';
    ctx.lineWidth = 1;
    for (let tx = px + 18; tx < px + p.w; tx += 18) {
      ctx.beginPath(); ctx.moveTo(tx, p.y); ctx.lineTo(tx, p.y + p.h); ctx.stroke();
    }
    // Postes de soporte
    const postW = 4, postH = Math.min(30, GROUND_Y - p.y - p.h);
    if (postH > 0) {
      ctx.fillStyle = '#5a3a12';
      for (let px2 = px + 8; px2 < px + p.w - 4; px2 += Math.max(40, p.w - 8)) {
        ctx.fillRect(px2, p.y + p.h, postW, postH);
      }
    }
  }
}

// ── Decoraciones ──────────────────────────────────────────────────────────
function drawDecoration(ctx, d, cx, imgs) {
  const x = d.x - cx;
  if (x + d.w < -80 || x > CANVAS_W + 80) return;
  const y = d.y;

  switch (d.type) {
    case 'cannon': {
      const img = imgs.cannon;
      if (img?.complete && img.naturalWidth > 1)
        ctx.drawImage(img, x, y, d.w, d.h);
      else {
        ctx.fillStyle = '#555'; ctx.fillRect(x, y + d.h*0.3, d.w*0.75, d.h*0.4);
      }
      break;
    }
    case 'barrel': {
      const sp = imgs.barrel;
      if (sp?.width > 1) ctx.drawImage(sp, 0, 0, 83, 106, x, y, d.w, d.h);
      else { ctx.fillStyle='#5a4020'; ctx.beginPath(); ctx.arc(x+d.w/2,y+d.h/2,d.w/2,0,Math.PI*2); ctx.fill(); }
      break;
    }
    case 'tower':
      ctx.fillStyle='rgba(70,70,60,0.8)'; ctx.fillRect(x,y,d.w,d.h);
      ctx.fillStyle='rgba(50,50,40,0.9)';
      for (let i=0;i<3;i++) ctx.fillRect(x+i*(d.w/3),y-8,d.w/3-2,8);
      ctx.fillStyle='rgba(10,10,20,0.8)'; ctx.fillRect(x+d.w*0.25,y+d.h*0.3,d.w*0.5,d.h*0.25);
      break;
    case 'house':
      ctx.fillStyle='rgba(150,120,80,0.8)'; ctx.fillRect(x,y+d.h*0.35,d.w,d.h*0.65);
      ctx.fillStyle='rgba(90,35,15,0.85)';
      ctx.beginPath(); ctx.moveTo(x-4,y+d.h*0.38); ctx.lineTo(x+d.w/2,y); ctx.lineTo(x+d.w+4,y+d.h*0.38); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(160,190,220,0.6)'; ctx.fillRect(x+8,y+d.h*0.5,14,12); ctx.fillRect(x+d.w-22,y+d.h*0.5,14,12);
      break;
    case 'tree':
      ctx.fillStyle='rgba(55,35,18,0.8)'; ctx.fillRect(x+d.w*0.38,y+d.h*0.5,d.w*0.25,d.h*0.5);
      ctx.fillStyle='rgba(28,55,18,0.8)';
      ctx.beginPath(); ctx.ellipse(x+d.w/2,y+d.h*0.4,d.w*0.5,d.h*0.48,0,0,Math.PI*2); ctx.fill();
      break;
    default: break;
  }
}

// ── Dibujar sprite con flip y tamaño visual ───────────────────────────────
function drawSprite(ctx, sp, frame, vx, vy, vw, vh, facing, alpha = 1) {
  if (!sp) return false;
  const w = sp.width ?? sp.naturalWidth;
  if (!w || w < 2) return false;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (facing === -1) {
    ctx.translate(vx + vw, vy);
    ctx.scale(-1, 1);
    ctx.drawImage(sp, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, vw, vh);
  } else {
    ctx.drawImage(sp, frame.sx, frame.sy, frame.sw, frame.sh, vx, vy, vw, vh);
  }
  ctx.restore();
  return true;
}

// ── Jugador ───────────────────────────────────────────────────────────────
function drawPlayer(ctx, player, cx, imgs, now) {
  if (player.invincible && Math.floor(now / 80) % 2 === 0) return;

  const sp  = imgs.player;
  const vw  = PL_VW, vh = PL_VH;
  // Pies alineados con el fondo del hitbox, centrado horizontalmente
  const vx  = Math.round(player.x - cx + (player.w - vw) / 2);
  const vy  = Math.round(player.y + player.h - vh);
  const st  = PLAYER_FRAMES[player.state] ? player.state : 'idle';
  const frames = PLAYER_FRAMES[st];
  const fi  = Math.floor(now / 120) % frames.length;

  const ok = drawSprite(ctx, sp, frames[fi], vx, vy, vw, vh, player.facing,
                        player.state === 'dead' ? 0.5 : 1);
  if (!ok) drawPlayerFallback(ctx, player, vx, vy, vw, vh);
}

function drawPlayerFallback(ctx, p, vx, vy, vw, vh) {
  ctx.save();
  ctx.fillStyle = '#c8a050';
  ctx.fillRect(vx + vw*0.2, vy + vh*0.3, vw*0.6, vh*0.5);
  ctx.fillStyle = '#556b2f';
  ctx.fillRect(vx + vw*0.15, vy + vh*0.3, vw*0.7, vh*0.25);
  ctx.fillStyle = '#d4a870';
  ctx.fillRect(vx + vw*0.25, vy + vh*0.05, vw*0.5, vh*0.28);
  ctx.restore();
}

// ── Enemigos ──────────────────────────────────────────────────────────────
function drawEnemy(ctx, e, cx, imgs, now) {
  if (e.state === 'dead' && e.y > CANVAS_H + 40) return;
  const ex = Math.round(e.x - cx);
  const ey = Math.round(e.y);
  if (ex + e.w < -60 || ex > CANVAS_W + 60) return;

  const isBoss    = e.type === 'boss';
  const isArcher  = e.type === 'archer';
  const frameSet  = isArcher ? ARCHER_FRAMES : PIKEMAN_FRAMES;

  const stKey = e.state === 'dead'  ? 'dead'
              : e.state === 'shoot' ? 'shoot'
              : e.state === 'alert' ? 'alert'
              : 'patrol';
  const frames = frameSet[stKey] ?? frameSet.patrol;
  const fi     = Math.floor(now / 180) % frames.length;
  const f      = frames[fi];

  // Tamaño visual basado en proporción del frame fuente
  let vw, vh;
  if (isBoss) {
    vw = BS_VW; vh = BS_VH;
  } else {
    // Mantener proporciones del frame real
    vw = EN_VW;
    vh = Math.round(EN_VW * f.sh / f.sw);
  }

  // Pies alineados con el hitbox, centrado horizontal
  const vx = Math.round(e.x - cx + (e.w - vw) / 2);
  const vy = Math.round(e.y + e.h - vh);
  const alpha = e.state === 'dead' ? 0.4 : 1;

  const ok = drawSprite(ctx, imgs.arco, f, vx, vy, vw, vh, e.facing, alpha);
  if (!ok) drawEnemyFallback(ctx, e, ex, ey, vw, vh);

  // Barra de vida (solo cuando tiene HP y está vivo)
  if (e.maxHp > 1 && e.state !== 'dead') {
    const pct = e.hp / e.maxHp;
    const bx  = Math.round(e.x - cx);
    ctx.fillStyle = 'rgba(60,0,0,0.7)';  ctx.fillRect(bx, ey - 6, e.w, 3);
    ctx.fillStyle = isBoss ? '#ff4400' : '#ee7744';
    ctx.fillRect(bx, ey - 6, e.w * pct, 3);
  }
}

function drawEnemyFallback(ctx, e, ex, ey, vw, vh) {
  const color = e.type === 'boss' ? '#3a0a0a' : e.type === 'archer' ? '#6b1a4a' : '#8b1a1a';
  ctx.save();
  if (e.state === 'dead') ctx.globalAlpha = 0.4;
  ctx.fillStyle = color;
  ctx.fillRect(ex + (e.w - vw) / 2, ey + e.h - vh, vw, vh);
  ctx.restore();
}

// ── Bala ──────────────────────────────────────────────────────────────────
function drawBullet(ctx, b, cx) {
  const px = Math.round(b.x - cx);
  const py = Math.round(b.y);
  if (b.owner === 'player') {
    // Bala de arcabuz: elipse dorada
    ctx.fillStyle = '#ffcc22';
    ctx.beginPath(); ctx.ellipse(px + b.w/2, py + b.h/2, b.w/2 + 2, b.h/2 + 1, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,80,0.5)';
    ctx.beginPath(); ctx.ellipse(px + b.w/2, py + b.h/2, b.w, b.h, 0, 0, Math.PI*2); ctx.fill();
  } else {
    // Flecha enemiga: línea marrón con punta
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(px, py + b.h/2);
    ctx.lineTo(px + b.w, py + b.h/2);
    ctx.stroke();
    // Punta
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    const dir = b.vx > 0 ? 1 : -1;
    const tip = dir > 0 ? px + b.w : px;
    ctx.moveTo(tip, py + b.h/2);
    ctx.lineTo(tip - dir*5, py + b.h/2 - 3);
    ctx.lineTo(tip - dir*5, py + b.h/2 + 3);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Explosión ─────────────────────────────────────────────────────────────
function drawExplosion(ctx, ex, cx, _imgs) {
  const px  = ex.x - cx;
  const pct = ex.frame / ex.maxFrames;
  ctx.save();
  ctx.globalAlpha = 1 - pct;
  const r    = ex.r * (0.3 + pct * 0.7);
  const grad = ctx.createRadialGradient(px, ex.y, 0, px, ex.y, r);
  grad.addColorStop(0,'#fff'); grad.addColorStop(0.2,'#ffdd00');
  grad.addColorStop(0.6,'#ff8800'); grad.addColorStop(1,'rgba(180,40,0,0)');
  ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(px, ex.y, r, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Flash de pica ─────────────────────────────────────────────────────────
function drawPikeHit(ctx, player, cx) {
  if (!player.pikeHit) return;
  const ph = player.pikeHit;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#ffee44';
  ctx.fillRect(Math.round(ph.x - cx), Math.round(ph.y), ph.w, ph.h);
  ctx.restore();
}

// ── Barra de recarga ──────────────────────────────────────────────────────
const ARCABUZ_CD = 1600;
function drawReloadBar(ctx, player, now) {
  if (!player.reloading) return;
  const pct = Math.max(0, Math.min(1, 1 - (player.arcabuzCd - now) / ARCABUZ_CD));
  const bw = 60, bh = 5, bx = CANVAS_W / 2 - 30, by = CANVAS_H - 34;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = pct < 0.6 ? '#ff5533' : '#66ee88';
  ctx.fillRect(bx, by, bw * pct, bh);
  ctx.fillStyle = 'rgba(255,210,60,0.9)';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RECARGANDO', CANVAS_W / 2, by - 2);
}

// ── Bandera ───────────────────────────────────────────────────────────────
function drawFlag(ctx, fx, fy) {
  if (fx < -20 || fx > CANVAS_W + 20) return;
  ctx.fillStyle = '#8a7050'; ctx.fillRect(Math.round(fx), fy, 3, 60);
  ctx.fillStyle = '#cc3333'; ctx.fillRect(Math.round(fx) + 3, fy, 22, 14);
  ctx.fillStyle = '#ddaa00'; ctx.fillRect(Math.round(fx) + 3, fy + 14, 22, 7);
}

// ── Prisionero ────────────────────────────────────────────────────────────
function drawPrisoner(ctx, pris, cx, now) {
  const px = Math.round(pris.x - cx);
  const py = Math.round(pris.y);
  ctx.fillStyle = '#ddcc88'; ctx.fillRect(px + 2, py, 10, 14);
  ctx.fillStyle = '#d4a870'; ctx.fillRect(px + 3, py - 8, 8, 8);
  ctx.fillStyle = '#cc8800'; ctx.fillRect(px, py + 2, 4, 2); ctx.fillRect(px + 10, py + 2, 4, 2);
  if (Math.floor(now / 500) % 2 === 0) {
    ctx.fillStyle = '#ffdd00'; ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('!', px + 7, py - 10);
  }
}
