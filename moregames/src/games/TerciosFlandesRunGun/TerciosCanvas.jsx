import { useEffect, useRef, useCallback } from 'react';
import { createGameState, tickGame, CANVAS_W, CANVAS_H, getPlayerFrame } from './logic/gameLoop.js';
import { GROUND_Y } from './logic/levelData.js';

// ── Sprites ───────────────────────────────────────────────────────────────
import sprPlayer   from './img/tercioProtagonista.png';  // 848×1233 → grid 4×5 → frame 212×246
import sprPikeman  from './img/enemigoPica.png';          // 459×544  → grid 3×4 → frame 153×136
import sprArcher   from './img/enemigoArco-removebg-preview.png'; // 414×602, transparente
import sprEffects  from './img/efectosDisparos-removebg-preview.png'; // 282×401 → grid 3×3 → frame 94×133
import sprBarrel   from './img/barril-removebg-preview.png';  // 83×106
import sprCannon   from './img/cañon-removebg-preview.png';   // 191×102
import sprBridge   from './img/puente-removebg-preview.png';  // 203×106
import sprBg       from './img/tiles2.png';                   // 848×1233 fondo

// ── Frame coords (medidos con PIL) ───────────────────────────────────────
const PL = { fw: 212, fh: 246 };   // player frame
const EN = { fw: 153, fh: 136 };   // pikeman frame
const EF = { fw: 94,  fh: 133 };   // effects frame

// Filas del jugador (tercioProtagonista.png):
//   row 0 (y=0)    : run×4
//   row 1 (y=246)  : idle/ataque×4
//   row 2 (y=492)  : salto×4
//   row 3 (y=738)  : agachado/disparo×4
//   row 4 (y=984)  : variantes×4
const PLAYER_FRAMES = {
  run:  [0,1,2,3].map(c => ({ sx: c*PL.fw, sy: 0,         sw: PL.fw, sh: PL.fh })),
  idle: [{ sx: 0,        sy: 0,         sw: PL.fw, sh: PL.fh }],
  jump: [{ sx: 0,        sy: PL.fh*2,   sw: PL.fw, sh: PL.fh }],
  fall: [{ sx: PL.fw,    sy: PL.fh*2,   sw: PL.fw, sh: PL.fh }],
  shoot:[{ sx: PL.fw*2,  sy: PL.fh,     sw: PL.fw, sh: PL.fh }],
  dead: [{ sx: PL.fw*3,  sy: PL.fh*3,   sw: PL.fw, sh: PL.fh }],
};

// Filas del pikeman (enemigoPica.png):
//   row 0 (y=0)    : patrulla×3
//   row 1 (y=136)  : alerta/idle×3
//   row 2 (y=272)  : disparo/ataque×3
//   row 3 (y=408)  : muerto/caída×3
const PIKEMAN_FRAMES = {
  patrol: [0,1,2].map(c => ({ sx: c*EN.fw, sy: 0,        sw: EN.fw, sh: EN.fh })),
  alert:  [0,1,2].map(c => ({ sx: c*EN.fw, sy: EN.fh,    sw: EN.fw, sh: EN.fh })),
  shoot:  [0,1,2].map(c => ({ sx: c*EN.fw, sy: EN.fh*2,  sw: EN.fw, sh: EN.fh })),
  dead:   [0,1,2].map(c => ({ sx: c*EN.fw, sy: EN.fh*3,  sw: EN.fw, sh: EN.fh })),
};

// Arquero (enemigoArco.png, ya transparente):
//   Cuadrante top-right (x=207..414, y=0..301) = 2 frames de 103×301
const ARCHER_FRAMES = {
  patrol: [{ sx:207, sy:0, sw:103, sh:301 }, { sx:310, sy:0, sw:104, sh:301 }],
  alert:  [{ sx:207, sy:0, sw:103, sh:301 }],
  shoot:  [{ sx:310, sy:0, sw:104, sh:301 }],
  dead:   [{ sx:207, sy:301, sw:103, sh:150 }],
};

// Eliminar fondo blanco
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

export default function TerciosCanvas({ onScore, onDie, onWin, paused }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const keysRef    = useRef({ left:false, right:false, jump:false, jumpPressed:false, shoot:false, grenadePressed:false });
  const imgsRef    = useRef({});
  const rafRef     = useRef(null);
  const pausedRef  = useRef(paused);
  pausedRef.current = paused;

  // ── Carga imágenes ────────────────────────────────────────────────────
  useEffect(() => {
    const imgs = imgsRef.current;

    const raw = (src) => { const i = new Image(); i.src = src; return i; };
    const proc = (key, src, thr = 238) => {
      const i = new Image();
      i.onload = () => { imgs[key] = processSheet(i, thr); };
      i.src = src;
    };

    imgs.bg     = raw(sprBg);      // fondo sin procesar
    imgs.cannon = raw(sprCannon);
    imgs.bridge = raw(sprBridge);
    imgs.archer = raw(sprArcher);  // ya transparente

    proc('player',  sprPlayer,  238);
    proc('pikeman', sprPikeman, 238);
    proc('effects', sprEffects, 240);
    proc('barrel',  sprBarrel,  238);

    stateRef.current = createGameState(0);
  }, []);

  // ── Teclado ───────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      const k = keysRef.current;
      if (e.code==='ArrowLeft'  || e.code==='KeyA') k.left  = true;
      if (e.code==='ArrowRight' || e.code==='KeyD') k.right = true;
      if ((e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space') && !e.repeat) { k.jump=true; k.jumpPressed=true; }
      if (e.code==='KeyJ'||e.code==='KeyZ') k.shoot=true;
      if ((e.code==='KeyK'||e.code==='KeyX')&&!e.repeat) k.grenadePressed=true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const up = (e) => {
      const k = keysRef.current;
      if (e.code==='ArrowLeft' ||e.code==='KeyA') k.left =false;
      if (e.code==='ArrowRight'||e.code==='KeyD') k.right=false;
      if (e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space') k.jump=false;
      if (e.code==='KeyJ'||e.code==='KeyZ') k.shoot=false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown',down); window.removeEventListener('keyup',up); };
  }, []);

  // ── Botones táctiles ──────────────────────────────────────────────────
  const press = useCallback((k) => {
    const ks = keysRef.current;
    if (k==='left')    ks.left  = true;
    if (k==='right')   ks.right = true;
    if (k==='jump')    { ks.jump=true; ks.jumpPressed=true; }
    if (k==='shoot')   ks.shoot = true;
    if (k==='grenade') ks.grenadePressed = true;
  }, []);
  const release = useCallback((k) => {
    const ks = keysRef.current;
    if (k==='left')  ks.left  = false;
    if (k==='right') ks.right = false;
    if (k==='jump')  ks.jump  = false;
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
        <div className="tc-dpad">
          <button className="tc-btn tc-left"
            onPointerDown={()=>press('left')}   onPointerUp={()=>release('left')}
            onPointerLeave={()=>release('left')}>◀</button>
          <button className="tc-btn tc-right"
            onPointerDown={()=>press('right')}  onPointerUp={()=>release('right')}
            onPointerLeave={()=>release('right')}>▶</button>
        </div>
        <div className="tc-actions">
          <button className="tc-btn tc-jump"
            onPointerDown={()=>press('jump')}   onPointerUp={()=>release('jump')}
            onPointerLeave={()=>release('jump')}>↑</button>
          <button className="tc-btn tc-shoot"
            onPointerDown={()=>press('shoot')}  onPointerUp={()=>release('shoot')}
            onPointerLeave={()=>release('shoot')}>🔫</button>
          <button className="tc-btn tc-grenade"
            onPointerDown={()=>press('grenade')}>💣</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════════════════
function render(ctx, gs, imgs, now) {
  const { player, enemies, bullets, grenades, explosions, camera, level, prisoners } = gs;
  const cx = Math.round(camera.x);

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 1. Fondo estático (no se mueve con la cámara)
  drawBackground(ctx, imgs);

  // 2. Decoraciones en primer plano (sobre el fondo, detrás de plataformas)
  for (const d of level.decorations) drawDecoration(ctx, d, cx, imgs);

  // 3. Plataformas con puente
  for (const p of level.platforms) drawPlatform(ctx, p, cx, imgs);

  // 4. Bandera
  drawFlag(ctx, level.flagX - cx, GROUND_Y - 60);

  // 5. Prisioneros, enemigos, jugador
  for (const p of prisoners)  { if (!p.rescued) drawPrisoner(ctx, p, cx, now); }
  for (const e of enemies)    drawEnemy(ctx, e, cx, imgs, now);
  drawPlayer(ctx, player, cx, imgs, now);

  // 6. Proyectiles y efectos
  for (const b of bullets)   { if (b.active) drawBullet(ctx, b, cx, imgs); }
  for (const g of grenades)  { if (g.active) drawGrenade(ctx, g, cx, imgs); }
  for (const ex of explosions){ if (ex.active) drawExplosion(ctx, ex, cx, imgs); }
}

// ── Fondo estático ────────────────────────────────────────────────────────
function drawBackground(ctx, imgs) {
  const bg = imgs.bg;
  if (bg?.complete && bg.naturalWidth > 1) {
    // Escalar para cubrir el canvas manteniendo proporción (cover)
    const scaleW = CANVAS_W / bg.naturalWidth;
    const scaleH = CANVAS_H / bg.naturalHeight;
    const scale  = Math.max(scaleW, scaleH);
    const dw = bg.naturalWidth  * scale;
    const dh = bg.naturalHeight * scale;
    const dx = (CANVAS_W - dw) / 2;
    const dy = (CANVAS_H - dh) / 2;
    ctx.drawImage(bg, dx, dy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#4a6a8a');
    grad.addColorStop(0.6, '#8aaa6a');
    grad.addColorStop(1, '#5a4a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

// ── Plataformas con imagen de puente ──────────────────────────────────────
function drawPlatform(ctx, p, cx, imgs) {
  const px = p.x - cx;
  if (px + p.w < -20 || px > CANVAS_W + 20) return;

  if (p.h >= 24) {
    // Suelo principal: semi-transparente para que se vea el fondo
    ctx.fillStyle = 'rgba(40,28,10,0.55)';
    ctx.fillRect(px, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(60,90,30,0.7)';
    ctx.fillRect(px, p.y, p.w, 4);
  } else {
    // Plataformas elevadas → usar sprite del puente
    const bridge = imgs.bridge;
    if (bridge?.complete && bridge.naturalWidth > 1) {
      // Repetir el puente para cubrir el ancho de la plataforma
      const bw = p.h * (bridge.naturalWidth / bridge.naturalHeight); // ancho escalado a la altura
      for (let x = px; x < px + p.w; x += bw) {
        const drawW = Math.min(bw, px + p.w - x);
        ctx.drawImage(bridge, 0, 0, bridge.naturalWidth * (drawW / bw), bridge.naturalHeight,
                      x, p.y - p.h * 0.3, drawW, p.h * 1.3);
      }
    } else {
      ctx.fillStyle = 'rgba(80,60,20,0.8)';
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = 'rgba(60,90,30,0.9)';
      ctx.fillRect(px, p.y, p.w, 3);
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
      if (img?.complete && img.naturalWidth > 1) {
        ctx.drawImage(img, x, y, d.w, d.h);
      } else {
        ctx.fillStyle = '#444'; ctx.fillRect(x, y + d.h*0.3, d.w*0.75, d.h*0.4);
      }
      break;
    }
    case 'barrel': {
      const sp = imgs.barrel;
      if (sp?.width > 1) {
        ctx.drawImage(sp, 0, 0, 83, 106, x, y, d.w, d.h);
      } else {
        ctx.fillStyle = '#5a4020'; ctx.beginPath(); ctx.arc(x+d.w/2, y+d.h/2, d.w/2, 0, Math.PI*2); ctx.fill();
      }
      break;
    }
    case 'tower':
      ctx.fillStyle = 'rgba(80,80,70,0.7)';
      ctx.fillRect(x, y, d.w, d.h);
      for (let i=0; i<3; i++) { ctx.fillStyle='rgba(80,80,70,0.8)'; ctx.fillRect(x+i*(d.w/3), y-8, d.w/3-2, 8); }
      ctx.fillStyle='rgba(20,20,30,0.8)'; ctx.fillRect(x+d.w*0.25, y+d.h*0.3, d.w*0.5, d.h*0.25);
      break;
    case 'house':
      ctx.fillStyle='rgba(160,130,90,0.75)'; ctx.fillRect(x, y+d.h*0.35, d.w, d.h*0.65);
      ctx.fillStyle='rgba(100,40,20,0.8)';
      ctx.beginPath(); ctx.moveTo(x-4,y+d.h*0.38); ctx.lineTo(x+d.w/2,y); ctx.lineTo(x+d.w+4,y+d.h*0.38); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(180,200,240,0.6)'; ctx.fillRect(x+8,y+d.h*0.5,14,12); ctx.fillRect(x+d.w-22,y+d.h*0.5,14,12);
      break;
    case 'tree':
      ctx.fillStyle='rgba(60,40,20,0.7)'; ctx.fillRect(x+d.w*0.35,y+d.h*0.5,d.w*0.3,d.h*0.5);
      ctx.fillStyle='rgba(30,60,20,0.75)';
      ctx.beginPath(); ctx.ellipse(x+d.w/2,y+d.h*0.35,d.w*0.55,d.h*0.5,0,0,Math.PI*2); ctx.fill();
      break;
    default: break;
  }
}

// ── Jugador ───────────────────────────────────────────────────────────────
function drawPlayer(ctx, player, cx, imgs, now) {
  const px = Math.round(player.x - cx);
  const py = Math.round(player.y);
  if (player.invincible && Math.floor(now / 80) % 2 === 0) return;

  const sp = imgs.player;
  if (sp?.width > 1) {
    const st  = player.state === 'shoot' ? 'shoot'
              : player.state === 'jump'  ? 'jump'
              : player.state === 'fall'  ? 'fall'
              : player.state === 'dead'  ? 'dead'
              : player.state === 'run'   ? 'run'
              : 'idle';
    const frames = PLAYER_FRAMES[st] ?? PLAYER_FRAMES.idle;
    const fi     = Math.floor(now / 130) % frames.length;
    const f      = frames[fi];
    ctx.save();
    if (player.facing === -1) {
      ctx.translate(px + player.w, py);
      ctx.scale(-1, 1);
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, 0, 0, player.w, player.h);
    } else {
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, px, py, player.w, player.h);
    }
    ctx.restore();
  } else {
    drawPlayerFallback(ctx, player, px, py);
  }
}

function drawPlayerFallback(ctx, p, px, py) {
  ctx.save();
  if (p.facing===-1){ctx.translate(px+p.w,py);ctx.scale(-1,1);ctx.translate(-p.w,0);}
  else ctx.translate(px,py);
  ctx.fillStyle='#c8a050'; ctx.fillRect(4,10,12,12);
  ctx.fillStyle='#556b2f'; ctx.fillRect(3,10,14,8);
  ctx.fillStyle='#d4a870'; ctx.fillRect(5,2,10,9);
  ctx.fillStyle='#667';    ctx.fillRect(4,0,12,5); ctx.fillRect(2,3,16,2);
  ctx.fillStyle='#4a3a1a'; ctx.fillRect(4,22,5,6); ctx.fillRect(11,22,5,6);
  ctx.fillStyle='#4a3a1a'; ctx.fillRect(16,12,6,2); ctx.fillRect(14,11,4,4);
  ctx.restore();
}

// ── Enemigos ──────────────────────────────────────────────────────────────
function drawEnemy(ctx, e, cx, imgs, now) {
  if (e.state==='dead' && e.y > CANVAS_H+40) return;
  const px = Math.round(e.x - cx);
  const py = Math.round(e.y);
  if (px+e.w < -20 || px > CANVAS_W+20) return;

  const isBoss   = e.type === 'boss';
  const isArcher = e.type === 'gunner';

  // Seleccionar spritesheet y frames
  let sp, frameSet;
  if (isArcher) {
    sp = imgs.archer;  // ya transparente, sin procesado
    frameSet = ARCHER_FRAMES;
  } else {
    sp = imgs.pikeman;
    frameSet = PIKEMAN_FRAMES;
  }

  const stKey = e.state==='dead'  ? 'dead'
              : e.state==='shoot' ? 'shoot'
              : e.state==='alert' ? 'alert'
              : 'patrol';
  const frames = frameSet[stKey] ?? frameSet.patrol;
  const fi     = Math.floor(now / 160) % frames.length;
  const f      = frames[fi];

  if (sp?.complete && sp.naturalWidth > 1) {
    ctx.save();
    if (e.state==='dead') ctx.globalAlpha = 0.45;
    if (e.facing===-1) {
      ctx.translate(px+e.w, py); ctx.scale(-1,1);
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, 0, 0, e.w, e.h);
    } else {
      ctx.drawImage(sp, f.sx, f.sy, f.sw, f.sh, px, py, e.w, e.h);
    }
    ctx.restore();
  } else {
    drawEnemyFallback(ctx, e, px, py);
  }

  // Barra de vida
  if (e.maxHp > 1 && e.state!=='dead') {
    const pct = e.hp / e.maxHp;
    ctx.fillStyle='rgba(80,0,0,0.7)'; ctx.fillRect(px, py-6, e.w, 3);
    ctx.fillStyle = isBoss ? '#ff4400' : '#ff8866';
    ctx.fillRect(px, py-6, e.w*pct, 3);
  }
}

function drawEnemyFallback(ctx, e, px, py) {
  const color = e.type==='boss' ? '#3a0a0a' : e.type==='gunner' ? '#6b1a4a' : '#8b1a1a';
  ctx.save();
  if (e.state==='dead') ctx.globalAlpha=0.4;
  if (e.facing===-1){ctx.translate(px+e.w,py);ctx.scale(-1,1);ctx.translate(-e.w,0);}
  else ctx.translate(px,py);
  ctx.fillStyle=color; ctx.fillRect(3,10,14,12);
  ctx.fillStyle='#cc8870'; ctx.fillRect(5,2,10,9);
  ctx.fillStyle='#888'; ctx.fillRect(4,0,12,5);
  ctx.fillStyle='#3a2a0a'; ctx.fillRect(4,e.h-8,5,8); ctx.fillRect(11,e.h-8,5,8);
  ctx.restore();
}

// ── Bala ──────────────────────────────────────────────────────────────────
function drawBullet(ctx, b, cx, imgs) {
  const px = Math.round(b.x - cx);
  const py = Math.round(b.y);
  const sp = imgs.effects;

  if (sp?.width > 1 && b.owner==='player') {
    // Fila 2 (y=266), col 0 = bala de mosquete
    ctx.drawImage(sp, 0, EF.fh*2, EF.fw, EF.fh, px-5, py-5, 14, 10);
  } else {
    ctx.fillStyle = b.owner==='player' ? '#ffdd44' : '#ff4444';
    ctx.fillRect(px, py, b.w, b.h);
    ctx.fillStyle = b.owner==='player' ? 'rgba(255,255,200,0.5)' : 'rgba(255,100,100,0.4)';
    ctx.fillRect(px-1,py-1,b.w+2,b.h+2);
  }
}

// ── Granada ───────────────────────────────────────────────────────────────
function drawGrenade(ctx, g, cx, imgs) {
  const px = Math.round(g.x - cx);
  const py = Math.round(g.y);
  const sp = imgs.barrel;
  if (sp?.width > 1) {
    ctx.drawImage(sp, 0,0,83,106, px-5, py-5, 14, 18);
  } else {
    ctx.fillStyle='#5a4020';
    ctx.beginPath(); ctx.arc(px+4,py+4,5,0,Math.PI*2); ctx.fill();
  }
}

// ── Explosión ─────────────────────────────────────────────────────────────
function drawExplosion(ctx, ex, cx, imgs) {
  const px  = ex.x - cx;
  const pct = ex.frame / ex.maxFrames;
  const sp  = imgs.effects;

  if (sp?.width > 1) {
    // Frames 0-2: fuego (fila 0), frames 3-5: humo (fila 1)
    const idx = Math.min(ex.frame, 5);
    const row = idx < 3 ? 0 : 1;
    const col = idx % 3;
    const size = ex.r * (0.5 + pct * 0.8);
    ctx.save();
    ctx.globalAlpha = 1 - pct * 0.7;
    ctx.drawImage(sp, col*EF.fw, row*EF.fh, EF.fw, EF.fh,
                  px - size/2, ex.y - size/2, size, size);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 1 - pct;
    const r    = ex.r * (0.3 + pct * 0.7);
    const grad = ctx.createRadialGradient(px, ex.y, 0, px, ex.y, r);
    grad.addColorStop(0,'#fff'); grad.addColorStop(0.2,'#ffdd00');
    grad.addColorStop(0.6,'#ff8800'); grad.addColorStop(1,'rgba(180,40,0,0)');
    ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(px,ex.y,r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Bandera ───────────────────────────────────────────────────────────────
function drawFlag(ctx, fx, fy) {
  if (fx < -20 || fx > CANVAS_W+20) return;
  ctx.fillStyle='#8a7050'; ctx.fillRect(Math.round(fx),fy,3,60);
  ctx.fillStyle='#cc3333'; ctx.fillRect(Math.round(fx)+3,fy,22,14);
  ctx.fillStyle='#ddaa00'; ctx.fillRect(Math.round(fx)+3,fy+14,22,7);
}

// ── Prisionero ────────────────────────────────────────────────────────────
function drawPrisoner(ctx, p, cx, now) {
  const px = Math.round(p.x - cx);
  const py = Math.round(p.y);
  ctx.fillStyle='#ddcc88'; ctx.fillRect(px+2,py,10,14);
  ctx.fillStyle='#d4a870'; ctx.fillRect(px+3,py-8,8,8);
  ctx.fillStyle='#cc8800'; ctx.fillRect(px,py+2,4,2); ctx.fillRect(px+10,py+2,4,2);
  if (Math.floor(now/500)%2===0) {
    ctx.fillStyle='#ffdd00'; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.fillText('!',px+7,py-10);
  }
}
