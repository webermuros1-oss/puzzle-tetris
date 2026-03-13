import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_W, CANVAS_H, GROUND_Y, LEVELS } from './logic/levelData.js';
import { SPR, getPlayerFrame, getEnemyFrame, getBossFrame } from './logic/sprites.js';
import { createPlayer, updatePlayer, tryThrow } from './logic/playerLogic.js';
import { createEnemy, hitEnemy, tryPushBall, updateEnemies, spawnParticles, tryBossShoot } from './logic/enemyLogic.js';
import { overlaps, bounceProjectileWalls } from './logic/collisionLogic.js';
import {
  playJump, playShoot, playEnemyHit, playSnowball,
  playBossHit, playPlayerDamage, playLevelClear, playDeath, playBossDeath,
} from './logic/soundManager.js';

import spritesheetSrc from './img/tiletPersonages.png';
import bgSrc          from './img/mundoSnow.png';
import bossSrc        from './img/badLevel10.png';

// ────────────────────────────────────────────────────────────────
// GameCanvas: toda la lógica y renderizado del juego en <canvas>
// ────────────────────────────────────────────────────────────────
export default function GameCanvas({ levelIndex, paused, onScoreChange, onLivesChange, onLevelClear, onGameOver, onReady }) {
  const canvasRef    = useRef(null);
  const stateRef     = useRef(null);   // estado mutable del juego (no triggers re-render)
  const rafRef       = useRef(null);
  const keysRef      = useRef({ left: false, right: false, jump: false, shoot: false });
  const imagesRef    = useRef({ sheet: null, bg: null, boss: null, loaded: 0 });
  const pausedRef    = useRef(paused);
  pausedRef.current  = paused;

  // ── Inicializa / reinicia el nivel ──────────────────────────
  const initLevel = useCallback((lvlIdx, opts = {}) => {
    const lvl    = LEVELS[lvlIdx] ?? LEVELS[LEVELS.length - 1];
    const player = createPlayer();
    const enemies = lvl.enemies.map((def, i) => createEnemy(def, i));

    stateRef.current = {
      player,
      enemies,
      projectiles:     [],
      bossProjectiles: [],
      particles:       [],
      platforms:      lvl.platforms,
      bgColor:        lvl.bgColor,
      bgStrip:        lvl.bgStrip,
      tileRow:        lvl.tileRow,
      tick:           0,
      phase:          'playing',
      phaseTimer:     0,
      invincibleUntil: opts.invincibleUntil ?? 0,
      score:          opts.score  ?? stateRef.current?.score ?? 0,
      lives:          opts.lives  ?? stateRef.current?.lives ?? 3,
    };
  }, []);

  // ── Carga imágenes ──────────────────────────────────────────
  useEffect(() => {
    const imgs = imagesRef.current;

    // Procesa el spritesheet: elimina el fondo blanco → transparente
    // así los sprites se ven bien sobre el fondo oscuro del juego
    const processSheet = (img) => {
      const oc    = document.createElement('canvas');
      oc.width    = img.naturalWidth;
      oc.height   = img.naturalHeight;
      const octx  = oc.getContext('2d');
      octx.drawImage(img, 0, 0);
      const idata = octx.getImageData(0, 0, oc.width, oc.height);
      const d     = idata.data;
      for (let i = 0; i < d.length; i += 4) {
        // Solo píxeles casi puros blancos (≥248) → transparente
        // Umbral más alto para no borrar partes claras del sprite
        if (d[i] >= 248 && d[i+1] >= 248 && d[i+2] >= 248) {
          d[i+3] = 0;
        }
      }
      octx.putImageData(idata, 0, 0);
      return oc; // devuelve un OffscreenCanvas/HTMLCanvasElement ya procesado
    };

    const onLoad = () => {
      imgs.loaded++;
      if (imgs.loaded >= 2) onReady?.();
    };

    const rawSheet     = new Image();
    rawSheet.src       = spritesheetSrc;
    rawSheet.onload    = () => {
      imgs.sheet = processSheet(rawSheet); // canvas procesado sin fondo blanco
      onLoad();
    };

    imgs.bg          = new Image();
    imgs.bg.src      = bgSrc;
    imgs.bg.onload   = onLoad;

    const rawBoss    = new Image();
    rawBoss.src      = bossSrc;
    rawBoss.onload   = () => {
      imgs.boss = processSheet(rawBoss); // quita fondo blanco igual que el spritesheet
    };
  }, [onReady]);

  // ── Teclado ─────────────────────────────────────────────────
  useEffect(() => {
    const k = keysRef.current;
    const down = (e) => {
      if (['ArrowLeft','a','A'].includes(e.key))              k.left  = true;
      if (['ArrowRight','d','D'].includes(e.key))             k.right = true;
      if (['ArrowUp','w','W',' '].includes(e.key))            { k.jump = true; e.preventDefault(); }
      if (['j','J','k','K','z','Z','x','X'].includes(e.key))  k.shoot = true;
    };
    const up = (e) => {
      if (['ArrowLeft','a','A'].includes(e.key))              k.left  = false;
      if (['ArrowRight','d','D'].includes(e.key))             k.right = false;
      if (['ArrowUp','w','W',' '].includes(e.key))            k.jump  = false;
      if (['j','J','k','K','z','Z','x','X'].includes(e.key))  k.shoot = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── Disparo táctil (botones virtuales llaman esto) ──────────
  const virtualKey = useCallback((key, pressed) => {
    keysRef.current[key] = pressed;
  }, []);

  // Expón virtualKey al contenedor padre vía ref de canvas data
  useEffect(() => {
    if (canvasRef.current) canvasRef.current._virtualKey = virtualKey;
  }, [virtualKey]);

  // ── Nivel ───────────────────────────────────────────────────
  useEffect(() => {
    initLevel(levelIndex);
  }, [levelIndex, initLevel]);

  // ── Game Loop ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (timestamp) => {
      rafRef.current = requestAnimationFrame(loop);
      const gs = stateRef.current;
      if (!gs) return;

      const { player, enemies, projectiles, bossProjectiles, particles, platforms } = gs;
      const now = timestamp;
      gs.tick++;

      // ── Pausa (pantalla READY) — solo renderiza, no actualiza ──
      if (pausedRef.current) {
        render(ctx, gs, imagesRef.current, timestamp);
        return;
      }

      // ── Fase del juego ──
      if (gs.phase === 'clear' || gs.phase === 'dead') {
        gs.phaseTimer -= 16;
        if (gs.phaseTimer <= 0) {
          if (gs.phase === 'clear') onLevelClear?.();
          else                      onGameOver?.();
        }
        render(ctx, gs, imagesRef.current, timestamp);
        return;
      }

      // ── Input ──
      const keys = keysRef.current;
      updatePlayer(player, keys, platforms, now);
      if (keys.shoot) tryThrow(player, projectiles, now);

      // Sonidos del jugador
      if (player.soundEvent) {
        if (player.soundEvent === 'jump')  playJump();
        if (player.soundEvent === 'shoot') playShoot();
        player.soundEvent = null;
      }

      // ── Proyectiles (con parábola) ──
      for (const proj of projectiles) {
        if (!proj.active) continue;
        proj.vy  += 0.18;      // gravedad suave → arco parabólico
        proj.x   += proj.vx;
        proj.y   += proj.vy;
        // Muere al tocar suelo o paredes
        if (proj.y + proj.h >= GROUND_Y) proj.active = false;
        bounceProjectileWalls(proj, CANVAS_W);

        // Impacto con enemigos
        for (const e of enemies) {
          if (e.state === 'dead') continue;
          // Expandimos el hitbox del enemigo para que sea más fácil acertar
          const hitbox = { x: e.x - 4, y: e.y - 4, w: e.w + 8, h: e.h + 8 };
          if (overlaps(proj, hitbox)) {
            proj.active = false;
            const prevState = e.state;
            if (hitEnemy(e, now)) {
              const isBoss      = e.type === 'boss';
              const hitPts      = isBoss ? 150 : 50;
              const snowballPts = isBoss ? 1000 : 200;
              const turnedBall  = e.state === 'snowball' && prevState !== 'snowball';
              gs.score += hitPts + (turnedBall ? snowballPts : 0);
              const pColor = isBoss ? '#ffd700' : '#c7f0ff';
              spawnParticles(particles, e.x + e.w / 2, e.y + e.h / 2, pColor, isBoss ? 12 : 6);
              onScoreChange?.(gs.score);
              if (isBoss) playBossHit(); else playEnemyHit();
              if (turnedBall) playSnowball();
            }
          }
        }
      }
      // Limpia proyectiles inactivos
      gs.projectiles = projectiles.filter(p => p.active);

      // ── Enemigos ──
      updateEnemies(enemies, platforms, player, particles, now);

      // Empuje de bola al tocarla
      for (const e of enemies) tryPushBall(e, player);

      // ── Boss dispara bolas de nieve ──
      for (const e of enemies) {
        if (e.type === 'boss') tryBossShoot(e, player, bossProjectiles, now);
      }

      // ── Proyectiles del boss ──
      for (const bp of bossProjectiles) {
        if (!bp.active) continue;
        bp.vy += 0.22;
        bp.x  += bp.vx;
        bp.y  += bp.vy;
        if (bp.y + bp.h >= GROUND_Y || bp.x < 0 || bp.x > CANVAS_W) {
          bp.active = false;
          continue;
        }
        // Daña al jugador
        if (!gs.invincibleUntil || now > gs.invincibleUntil) {
          if (overlaps(bp, player)) {
            bp.active = false;
            gs.lives--;
            onLivesChange?.(gs.lives);
            spawnParticles(particles, player.x + player.w / 2, player.y, '#7dd3fc', 10);
            playPlayerDamage();
            if (gs.lives <= 0) {
              gs.phase = 'dead'; gs.phaseTimer = 2200; playDeath();
            } else {
              initLevel(levelIndex, { score: gs.score, lives: gs.lives, invincibleUntil: now + 2000 });
            }
          }
        }
      }
      gs.bossProjectiles = bossProjectiles.filter(p => p.active);

      // Puntuación por bola que elimina a otro
      const justDied = enemies.filter(e => e.state === 'dead' && !e._scored);
      if (justDied.length) {
        gs.score += justDied.reduce((sum, e) => sum + (e.type === 'boss' ? 2000 : 100), 0);
        justDied.forEach(e => { e._scored = true; });
        onScoreChange?.(gs.score);
      }

      // ── Colisión jugador-enemigo (con invencibilidad temporal tras daño) ──
      if (!gs.invincibleUntil || now > gs.invincibleUntil) {
        for (const e of enemies) {
          if (e.state === 'dead' || e.state === 'snowball') continue;
          if (overlaps(player, e)) {
            gs.lives--;
            onLivesChange?.(gs.lives);
            spawnParticles(particles, player.x + player.w / 2, player.y, '#ff6666', 12);
            if (gs.lives <= 0) {
              gs.phase      = 'dead';
              gs.phaseTimer = 2200;
              playDeath();
            } else {
              playPlayerDamage();
              // Respawn manteniendo score/lives, con invencibilidad 2 seg
              initLevel(levelIndex, {
                score:           gs.score,
                lives:           gs.lives,
                invincibleUntil: now + 2000,
              });
            }
            break;
          }
        }
      }

      // ── Level Clear ──
      const alive = enemies.filter(e => e.state !== 'dead');
      if (alive.length === 0 && gs.phase === 'playing') {
        gs.phase      = 'clear';
        gs.phaseTimer = 2000;
        player.anim   = 'celebrate';
        gs.score      += 500;
        onScoreChange?.(gs.score);
        playLevelClear();
      }

      // ── Partículas ──
      for (const p of particles) {
        p.x    += p.vx;
        p.y    += p.vy;
        p.vy   += 0.15;
        p.life--;
      }
      gs.particles = particles.filter(p => p.life > 0);

      // ── Render ──
      render(ctx, gs, imagesRef.current, timestamp);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onScoreChange, onLivesChange, onLevelClear, onGameOver]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="snow-canvas"
    />
  );
}

// ── Controladores táctiles expuestos ──────────────────────────
GameCanvas.triggerKey = (canvas, key, pressed) => {
  canvas?._virtualKey?.(key, pressed);
};

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
function render(ctx, gs, imgs, timestamp) {
  const { player, enemies, projectiles, bossProjectiles, particles, platforms, bgColor, bgStrip, tileRow, phase } = gs;
  const { sheet, bg, boss: bossImg } = imgs;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Fondo ──
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // mundoSnow.png: franja decorativa específica del nivel
  if (bg?.complete && bgStrip) {
    ctx.globalAlpha = 0.45;
    const bgW = bg.naturalWidth ?? bg.width;
    ctx.drawImage(bg, 0, bgStrip.sy, bgW, bgStrip.sh, 0, 0, CANVAS_W, 50);
    ctx.globalAlpha = 1;
  }

  // Estrellas/copos de fondo (CSS animation alternativa)
  drawSnowflakes(ctx, timestamp);

  // ── Plataformas ──
  for (const p of platforms) {
    drawPlatform(ctx, sheet, p, tileRow);
  }

  // ── Suelo ──
  drawGround(ctx, sheet, tileRow);

  // ── Partículas ──
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = Math.min(alpha, 1);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r ?? 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Proyectiles (siempre visibles: sprite + fallback) ──
  for (const proj of projectiles) {
    if (!proj.active) continue;
    if (sheet) {
      drawSprite(ctx, sheet, SPR.projectile, proj.x, proj.y, proj.w, proj.h);
    } else {
      // Fallback: bola azul brillante
      ctx.save();
      ctx.shadowColor = '#7dd3fc';
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = '#bfefff';
      ctx.beginPath();
      ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Proyectiles del boss (bolas de hielo azul oscuro) ──
  if (bossProjectiles) {
    for (const bp of bossProjectiles) {
      if (!bp.active) continue;
      ctx.save();
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = '#003080';
      ctx.beginPath();
      ctx.arc(bp.x + bp.w / 2, bp.y + bp.h / 2, bp.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Enemigos ──
  for (const e of enemies) {
    if (e.state === 'dead') continue;
    const frame = getEnemyFrame(e);
    const flip  = e.vx < 0 || e.ballVx < 0;
    const isBoss = e.type === 'boss';

    // Glow: dorado pulsante para boss, azul para snowball
    if (isBoss) {
      const pulse = 0.5 + 0.5 * Math.sin(timestamp / 200);
      ctx.shadowColor = e.state === 'snowball' ? '#a8d8ff' : `hsl(45,100%,${50 + pulse * 20}%)`;
      ctx.shadowBlur  = isBoss ? 18 : 8;
    } else if (e.state === 'snowball') {
      ctx.shadowColor = '#a8d8ff';
      ctx.shadowBlur  = 8;
    }

    if (isBoss && e.state !== 'snowball' && bossImg) {
      // Recortar frame exacto del sprite sheet del boss
      const bf = getBossFrame(e, gs.tick);
      try {
        if (flip) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(bossImg, bf.sx, bf.sy, bf.sw, bf.sh, -e.x - e.w, e.y, e.w, e.h);
          ctx.restore();
        } else {
          ctx.drawImage(bossImg, bf.sx, bf.sy, bf.sw, bf.sh, e.x, e.y, e.w, e.h);
        }
      } catch(_) {}
    } else {
      drawSpriteFlip(ctx, sheet, frame, e.x, e.y, e.w, e.h, flip);
    }
    ctx.shadowBlur = 0;

    // Corona ♛ sobre el boss
    if (isBoss && e.state !== 'snowball') {
      ctx.font      = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♛', e.x + e.w / 2, e.y - 4);
      ctx.textAlign = 'left';
    }

    // Barra de vida
    if (e.state === 'snowed1' || e.state === 'snowed2') {
      const pct    = e.hits / e.maxHits;
      const barH   = isBoss ? 6 : 4;
      const barY   = e.y - (isBoss ? 10 : 6);
      ctx.fillStyle = isBoss ? '#6b0000' : '#1a6fb5';
      ctx.fillRect(e.x, barY, e.w, barH);
      ctx.fillStyle = isBoss ? '#ff4400' : '#7dd3fc';
      ctx.fillRect(e.x, barY, e.w * pct, barH);
    } else if (isBoss && e.state === 'normal') {
      // Boss siempre muestra barra de vida
      ctx.fillStyle = '#6b0000';
      ctx.fillRect(e.x, e.y - 10, e.w, 6);
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(e.x, e.y - 10, e.w, 6); // full cuando está normal
    }
  }

  // ── Jugador (parpadea durante invencibilidad) ──
  const isInvincible = gs.invincibleUntil && timestamp < gs.invincibleUntil;
  if (!isInvincible || Math.floor(timestamp / 100) % 2 === 0) {
    const pFrame = getPlayerFrame(player, gs.tick);
    drawSpriteFlip(ctx, sheet, pFrame, player.x, player.y, player.w, player.h, player.dir < 0);
  }

  // ── Overlay de fase ──
  if (phase === 'clear') {
    drawOverlay(ctx, 'LEVEL CLEAR!', '#ffd700', '#ff8c00');
  } else if (phase === 'dead') {
    drawOverlay(ctx, 'GAME OVER', '#ff4444', '#cc0000');
  }
}

// ── Helpers de dibujo ────────────────────────────────────────

function drawSprite(ctx, sheet, spr, dx, dy, dw, dh) {
  if (!spr) return;
  // sheet puede ser HTMLCanvasElement (procesado) o HTMLImageElement
  if (sheet) {
    try {
      ctx.drawImage(sheet, spr.sx, spr.sy, spr.sw, spr.sh, dx, dy, dw, dh);
    } catch (_) { /* si el canvas todavía no está listo, fallback */ }
  }
}

function drawSpriteFlip(ctx, sheet, spr, dx, dy, dw, dh, flip) {
  if (!spr) return;
  if (flip) {
    ctx.save();
    ctx.scale(-1, 1);
    drawSprite(ctx, sheet, spr, -dx - dw, dy, dw, dh);
    ctx.restore();
  } else {
    drawSprite(ctx, sheet, spr, dx, dy, dw, dh);
  }
}

const TILE_DRAW = 32; // tamaño al que pintamos cada tile en el canvas

function drawPlatform(ctx, sheet, p, tileRow = 97) {
  const rowTiles = SPR.tiles[tileRow] ?? SPR.tiles[97];
  const tileKey  = p.type === 'solid' ? rowTiles.solid
                 : p.type === 'snow'  ? rowTiles.snow
                 :                      rowTiles.ice;

  if (sheet) {
    for (let tx = p.x; tx < p.x + p.w; tx += TILE_DRAW) {
      const tw = Math.min(TILE_DRAW, p.x + p.w - tx);
      try {
        ctx.drawImage(sheet, tileKey.sx, tileKey.sy, tileKey.sw * (tw / TILE_DRAW), tileKey.sh,
          tx, p.y, tw, p.h);
      } catch (_) {}
    }
  } else {
    const colors = { ice: '#7dd3fc', snow: '#e0f2fe', solid: '#94a3b8' };
    ctx.fillStyle = colors[p.type] ?? '#7dd3fc';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
}

function drawGround(ctx, sheet, tileRow = 97) {
  const groundH  = CANVAS_H - GROUND_Y;
  const rowTiles = SPR.tiles[tileRow] ?? SPR.tiles[97];
  const t        = rowTiles.solid;
  if (sheet) {
    for (let tx = 0; tx < CANVAS_W; tx += TILE_DRAW) {
      try {
        ctx.drawImage(sheet, t.sx, t.sy, t.sw, t.sh, tx, GROUND_Y, TILE_DRAW, groundH);
      } catch (_) {}
    }
  } else {
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, groundH);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);
  }
}

function drawOverlay(ctx, text, color1, color2) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, CANVAS_H / 2 - 40, CANVAS_W, 80);

  ctx.font         = 'bold 36px "Press Start 2P", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor  = color2;
  ctx.shadowBlur   = 12;
  ctx.fillStyle    = color1;
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
  ctx.shadowBlur   = 0;
  ctx.textAlign    = 'left';
}

// Copos de nieve decorativos en el fondo
const flakes = Array.from({ length: 22 }, (_, i) => ({
  x: Math.random() * 480,
  y: Math.random() * 400,
  r: 1 + Math.random() * 2,
  speed: 0.4 + Math.random() * 0.8,
  drift: (Math.random() - 0.5) * 0.3,
}));

function drawSnowflakes(ctx, ts) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const f of flakes) {
    f.y = (f.y + f.speed) % CANVAS_H;
    f.x = ((f.x + f.drift) + CANVAS_W) % CANVAS_W;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
