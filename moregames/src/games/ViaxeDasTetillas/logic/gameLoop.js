// ══════════════════════════════════════════════════════════════════════════
//  gameLoop.js — Estado del juego y bucle de actualización principal
// ══════════════════════════════════════════════════════════════════════════

import { createPlayer, updatePlayer, tryShoot, killPlayer } from './player.js';
import { createTetilla, updateTetilla, splitTetilla, FLOOR_Y } from './tetillas.js';
import { checkShotsVsTetillas, checkPlayerVsTetillas } from './collisions.js';
import { LEVELS } from './levelData.js';

export const CANVAS_W = 480;
export const CANVAS_H = 310;

// Puntos por destruir cada tamaño
const SCORE_BY_SIZE = { large: 100, medium: 200, small: 400, tiny: 800 };

// Duración de la transición "nivel superado" antes de llamar onWin (segundos)
const LEVEL_CLEAR_PAUSE = 2.5;

// ── Crear estado inicial ───────────────────────────────────────────────────
export function createGameState(levelIndex = 0) {
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  return {
    level,
    levelIndex,
    player:     createPlayer(),
    tetillas:   level.tetillas.map(t => createTetilla(t.x, t.y, t.size, t.vx)),
    shots:      [],          // cables activos en pantalla
    explosions: [],          // partículas de explosión
    phase:      'ready',     // 'ready' | 'playing' | 'levelClear' | 'gameOver'
    readyTimer: 2.5,         // cuenta atrás de inicio (segundos)
    clearTimer: 0,           // cuenta para pasar al siguiente nivel
    timeLeft:   level.timeLimit ?? null,  // temporizador opcional (segundos)
    score:      0,
  };
}

// ── Tick principal ─────────────────────────────────────────────────────────
/**
 * @param {object}   gs       – estado del juego (mutado in-place)
 * @param {object}   keys     – { left, right, shoot }
 * @param {number}   now      – performance.now()
 * @param {number}   dt       – delta time en segundos
 * @param {object}   cbs      – { onScore, onDie, onWin }
 */
export function tickGame(gs, keys, now, dt, cbs) {
  switch (gs.phase) {
    case 'ready':
      gs.readyTimer -= dt;
      if (gs.readyTimer <= 0) gs.phase = 'playing';
      return;

    case 'levelClear':
      gs.clearTimer -= dt;
      if (gs.clearTimer <= 0) cbs.onWin?.();
      return;

    case 'gameOver':
      return;

    case 'playing':
      _tickPlaying(gs, keys, now, dt, cbs);
      return;
  }
}

// ── Lógica de juego activo ─────────────────────────────────────────────────
function _tickPlaying(gs, keys, now, dt, { onScore, onDie, onWin }) {
  const { player, shots } = gs;

  // ── Jugador ──
  updatePlayer(player, keys, now, dt);

  // ── Disparo (solo al pulsar, no holding) ──
  if (keys.shoot && !keys._shootConsumed) {
    keys._shootConsumed = true;
    const shot = tryShoot(player, now, shots);
    if (shot) {
      shots.push(shot);
    }
  }
  if (!keys.shoot) keys._shootConsumed = false;

  // ── Actualizar cables ──
  for (const shot of shots) {
    if (!shot.active) continue;

    // El cable sube (y decrece, h crece)
    const growth = shot.speed * dt;
    shot.y -= growth;
    shot.h += growth;

    // Al tocar el techo: se queda un instante fijo y luego desaparece
    if (shot.y <= 0) {
      shot.y          = 0;
      shot.h          = shot.baseY;    // cable llena toda la pantalla verticalmente
      shot.hitCeiling = true;
      if (!shot.dieAt) shot.dieAt = now + 280;
    }

    if (shot.hitCeiling && now >= shot.dieAt) {
      shot.active = false;
    }
  }

  // ── Colisiones: disparos vs tetillas ──
  checkShotsVsTetillas(shots, gs.tetillas, (shot, t) => {
    t.alive     = false;
    shot.active = false;

    // Partícula de explosión
    gs.explosions.push({
      x: t.x, y: t.y, r: t.r,
      frame: 0, maxFrames: 14,
      active: true,
    });

    // Dividir
    const children = splitTetilla(t);
    gs.tetillas.push(...children);

    // Puntos
    const pts = SCORE_BY_SIZE[t.size] ?? 100;
    gs.score  += pts;
    onScore?.(gs.score);
  });

  // ── Física de tetillas ──
  for (const t of gs.tetillas) updateTetilla(t, dt);

  // ── Temporizador opcional ──
  if (gs.timeLeft !== null) {
    gs.timeLeft -= dt;
    if (gs.timeLeft <= 0) {
      gs.timeLeft = 0;
      _playerDied(gs, onDie);
      return;
    }
  }

  // ── Colisión jugador vs tetillas ──
  checkPlayerVsTetillas(player, gs.tetillas, () => {
    _playerDied(gs, onDie);
  });

  // ── Explosiones (avanzar frame) ──
  for (const ex of gs.explosions) {
    if (!ex.active) continue;
    ex.frame++;
    if (ex.frame >= ex.maxFrames) ex.active = false;
  }

  // ── Limpiar inactivos ──
  gs.shots      = gs.shots.filter(s => s.active);
  gs.explosions = gs.explosions.filter(e => e.active);

  // ── Victoria de nivel ──
  if (gs.tetillas.every(t => !t.alive)) {
    gs.phase      = 'levelClear';
    gs.clearTimer = LEVEL_CLEAR_PAUSE;
  }
}

function _playerDied(gs, onDie) {
  if (gs.phase !== 'playing') return;
  gs.phase = 'gameOver';
  killPlayer(gs.player);
  // Llamar onDie con un pequeño retraso para que se vea la animación de muerte
  setTimeout(() => onDie?.(), 1200);
}
