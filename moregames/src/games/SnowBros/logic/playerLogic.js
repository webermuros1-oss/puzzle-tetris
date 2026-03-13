import { landOnPlatforms } from './collisionLogic.js';
import { CANVAS_W } from './levelData.js';

const GRAVITY     = 0.52;
const JUMP_FORCE  = -11.5;
const MOVE_SPEED  = 2.4;
const THROW_CD    = 280; // ms entre disparos

export function createPlayer() {
  return {
    x: 200, y: 300,
    w: 28,  h: 32,
    vx: 0,  vy: 0,
    dir: 1,          // 1 = derecha, -1 = izquierda
    onGround: false,
    anim: 'idle',
    lastThrow: 0,
    animTick: 0,
    soundEvent: null, // 'jump' | 'shoot' — consumido por GameCanvas
  };
}

export function updatePlayer(player, keys, platforms, now) {
  // ── Horizontal ──
  if (keys.left) {
    player.vx  = -MOVE_SPEED;
    player.dir = -1;
  } else if (keys.right) {
    player.vx  = MOVE_SPEED;
    player.dir = 1;
  } else {
    player.vx = 0;
  }

  // ── Salto ──
  if (keys.jump && player.onGround) {
    player.vy         = JUMP_FORCE;
    player.onGround   = false;
    player.soundEvent = 'jump';
  }

  // ── Gravedad y posición ──
  player.vy += GRAVITY;
  player.x  += player.vx;
  player.y  += player.vy;

  // Límites horizontales — paredes sólidas
  if (player.x < 0)                   player.x = 0;
  if (player.x + player.w > CANVAS_W) player.x = CANVAS_W - player.w;

  // Colisión plataformas
  landOnPlatforms(player, platforms);

  // ── Animación ──
  if (player.anim === 'throw' && now - player.lastThrow > 250) {
    player.anim = player.onGround ? 'idle' : 'jump';
  } else if (player.anim !== 'throw' && player.anim !== 'celebrate') {
    if (!player.onGround) {
      player.anim = 'jump';
    } else if (player.vx !== 0) {
      player.anim = 'run';
    } else {
      player.anim = 'idle';
    }
  }

  player.animTick++;
}

// Crea un proyectil si el cooldown lo permite
export function tryThrow(player, projectiles, now) {
  if (now - player.lastThrow < THROW_CD) return;
  player.lastThrow  = now;
  player.anim       = 'throw';
  player.soundEvent = 'shoot';

  // Proyectil más grande = más fácil acertar
  // Parte desde el centro-lateral del jugador
  const projW = 20;
  const projH = 20;
  projectiles.push({
    x:      player.dir > 0 ? player.x + player.w : player.x - projW,
    y:      player.y + player.h / 2 - projH / 2,
    w:      projW,
    h:      projH,
    vx:     player.dir * 7,
    vy:     -1.8,   // ángulo de salida ligeramente hacia arriba
    active: true,
  });
}
