// ══════════════════════════════════════════════════════════════════════════
//  player.js — Lógica de A Mestra (jugadora)
// ══════════════════════════════════════════════════════════════════════════

import { FLOOR_Y, WALL_LEFT, WALL_RIGHT, CANVAS_W } from './tetillas.js';

// ── Constantes del jugador ─────────────────────────────────────────────────
export const PLAYER_W          = 26;
export const PLAYER_H          = 46;
const PLAYER_SPEED             = 185;   // px/s horizontal
const PLAYER_JUMP_SPEED        = -360;  // px/s vertical al saltar
const PLAYER_GRAVITY           = 700;   // px/s² (cae rápido, salto snappy)
const SHOT_COOLDOWN_MS         = 150;   // ms entre disparos (muy rápido)
const SHOT_SPEED               = 720;   // px/s que sube el cable
export const SHOT_W            = 8;
const SHOOT_ANIM_MS            = 250;
const FRAMES_PER_STATE         = { idle: 2, run: 4, shoot: 3, dead: 2 };

// ── Crear jugador ──────────────────────────────────────────────────────────
export function createPlayer() {
  return {
    x:       CANVAS_W / 2 - PLAYER_W / 2,
    y:       FLOOR_Y - PLAYER_H,
    w:       PLAYER_W,
    h:       PLAYER_H,
    vx:      0,
    vy:      0,
    onGround: true,
    facing:  1,
    state:   'idle',
    alive:   true,
    invincible:      false,
    invincibleUntil: 0,
    shotCooldown:    0,
    shootAnimUntil:  0,
    frame:     0,
    frameTick: 0,
  };
}

// ── Actualizar jugador ─────────────────────────────────────────────────────
export function updatePlayer(player, keys, now, dt) {
  if (!player.alive) return;

  if (player.invincible && now >= player.invincibleUntil) {
    player.invincible = false;
  }

  // ── Movimiento horizontal ──
  const moving = keys.left !== keys.right;
  if      (keys.left  && !keys.right) { player.vx = -PLAYER_SPEED; player.facing = -1; }
  else if (keys.right && !keys.left)  { player.vx =  PLAYER_SPEED; player.facing =  1; }
  else player.vx = 0;

  player.x += player.vx * dt;
  if (player.x < WALL_LEFT)             player.x = WALL_LEFT;
  if (player.x + player.w > WALL_RIGHT) player.x = WALL_RIGHT - player.w;

  // ── Salto ──
  if (keys.jump && !keys._jumpConsumed && player.onGround) {
    keys._jumpConsumed = true;
    player.vy       = PLAYER_JUMP_SPEED;
    player.onGround = false;
  }
  if (!keys.jump) keys._jumpConsumed = false;

  // ── Gravedad y posición vertical ──
  if (!player.onGround) {
    player.vy += PLAYER_GRAVITY * dt;
    player.y  += player.vy * dt;
    if (player.y + player.h >= FLOOR_Y) {
      player.y     = FLOOR_Y - player.h;
      player.vy    = 0;
      player.onGround = true;
    }
  }

  // ── Estado de animación ──
  const shooting = now < player.shootAnimUntil;
  if      (shooting)           player.state = 'shoot';
  else if (!player.onGround)   player.state = 'run';   // reusar run frames en el aire
  else if (moving)             player.state = 'run';
  else                         player.state = 'idle';

  player.frameTick += dt;
  if (player.frameTick >= 0.125) {
    player.frameTick -= 0.125;
    const total = FRAMES_PER_STATE[player.state] ?? 2;
    player.frame = (player.frame + 1) % total;
  }
}

// ── Intentar disparar ──────────────────────────────────────────────────────
export function tryShoot(player, now, activeShots) {
  if (!player.alive)                   return null;
  if (now < player.shotCooldown)       return null;
  if (activeShots.some(s => s.active)) return null;

  player.shotCooldown   = now + SHOT_COOLDOWN_MS;
  player.shootAnimUntil = now + SHOOT_ANIM_MS;

  return {
    x:          player.x + player.w / 2 - SHOT_W / 2,
    baseY:      FLOOR_Y,
    y:          player.y,
    w:          SHOT_W,
    h:          FLOOR_Y - player.y,
    speed:      SHOT_SPEED,
    active:     true,
    hitCeiling: false,
    dieAt:      null,
  };
}

// ── Recibir daño ───────────────────────────────────────────────────────────
export function killPlayer(player) {
  if (!player.alive || player.invincible) return false;
  player.alive = false;
  player.state = 'dead';
  player.vx    = 0;
  player.vy    = 0;
  return true;
}
