import { landOnPlatforms, overlaps } from './collisionLogic.js';
import { CANVAS_W } from './levelData.js';

const GRAVITY        = 0.52;
const BLOB_SPEED     = 0.75;   // reducido
const RED_SPEED      = 1.2;    // reducido
const BOSS_SPEED     = 1.6;    // reducido
const SUPERBOSS_SPEED = 1.4;
const BALL_SPEED     = 5;
const BOSS_RECOVER   = 3500;
const BOSS_RECOVER_SB = 2000;
const RECOVER_TIME   = 6000;

const JUMP_CHANCE_BLOB = 0.007;
const JUMP_CHANCE_RED  = 0.011;
const JUMP_CHANCE_BOSS = 0.018;
const JUMP_FORCE       = -10.5;

const BOSS_SHOOT_CD = 2800;  // ms entre disparos del boss

const MAX_HITS = { blob: 1, red: 2, boss: 8, superboss: 20 };

export function createEnemy(def, id) {
  const isBoss      = def.type === 'boss';
  const isSuperboss = def.type === 'superboss';
  const isRed       = def.type === 'red';
  const spd = isBoss ? BOSS_SPEED : isSuperboss ? SUPERBOSS_SPEED : isRed ? RED_SPEED : BLOB_SPEED;
  return {
    id,
    type:      def.type,
    x: def.x,  y: def.y,
    w: isBoss ? 82 : isSuperboss ? 110 : isRed ? 30 : 26,
    h: isBoss ? 100 : isSuperboss ? 130 : isRed ? 38 : 26,
    vx: spd * (Math.random() < 0.5 ? 1 : -1),
    vy: 0,
    onGround:    false,
    state:       'normal',
    hits:        0,
    maxHits:     MAX_HITS[def.type] ?? 2,
    ballVx:      0,
    recoverAt:   0,
    lastShot:    0,
    lastLightning: 0,
  };
}

export function hitEnemy(enemy, now) {
  if (enemy.state === 'dead' || enemy.state === 'snowball') return false;

  enemy.hits++;

  if (enemy.hits >= enemy.maxHits) {
    enemy.state     = 'snowball';
    enemy.vx        = 0;
    enemy.ballVx    = 0;
    const recTime = enemy.type === 'boss' ? BOSS_RECOVER
                  : enemy.type === 'superboss' ? BOSS_RECOVER_SB
                  : RECOVER_TIME;
    enemy.recoverAt = now + recTime;
  } else {
    const frac = enemy.hits / enemy.maxHits;
    enemy.state = frac < 0.5 ? 'snowed1' : 'snowed2';
  }
  return true;
}

export function tryPushBall(enemy, player) {
  if (enemy.state !== 'snowball') return;
  if (Math.abs(enemy.ballVx) > 1) return;

  const vertOk = player.y + player.h > enemy.y + 4 && player.y < enemy.y + enemy.h - 4;
  if (!vertOk) return;

  const margin = 8;

  if (player.x + player.w >= enemy.x - margin &&
      player.x + player.w / 2 < enemy.x + enemy.w / 2) {
    enemy.ballVx = BALL_SPEED;
    return;
  }

  if (player.x <= enemy.x + enemy.w + margin &&
      player.x + player.w / 2 > enemy.x + enemy.w / 2) {
    enemy.ballVx = -BALL_SPEED;
  }
}

// El boss lanza bolas de nieve hacia el jugador
export function tryBossShoot(boss, player, bossProjectiles, now) {
  if (boss.state !== 'normal' && boss.state !== 'snowed1') return;
  if (now - boss.lastShot < BOSS_SHOOT_CD) return;
  boss.lastShot = now;

  // Dirección hacia el jugador
  const cx   = boss.x + boss.w / 2;
  const cy   = boss.y + boss.h / 3;
  const tx   = player.x + player.w / 2;
  const ty   = player.y + player.h / 2;
  const dx   = tx - cx;
  const dy   = ty - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const spd  = 3.5;

  bossProjectiles.push({
    x:      cx - 12,
    y:      cy - 12,
    w:      24,
    h:      24,
    vx:     (dx / dist) * spd,
    vy:     (dy / dist) * spd - 1.5,  // ligero arco hacia arriba
    active: true,
  });
}

export function updateEnemies(enemies, platforms, _player, particles, now) {
  for (const e of enemies) {
    if (e.state === 'dead') continue;

    e.vy += GRAVITY;
    e.y  += e.vy;
    landOnPlatforms(e, platforms);

    // ── Bola rodando ──
    if (e.state === 'snowball') {
      e.x += e.ballVx;

      if (e.x <= 0 || e.x + e.w >= CANVAS_W) {
        e.state = 'dead';
        const color = e.type === 'boss' ? '#ffd700' : '#a8d8ff';
        spawnParticles(particles, e.x + e.w / 2, e.y + e.h / 2, color, e.type === 'boss' ? 20 : 12);
        continue;
      }

      e.ballVx *= 0.997;

      if (now >= e.recoverAt) {
        e.state   = 'normal';
        e.hits    = 0;
        e.ballVx  = 0;
        const spd = e.type === 'boss' ? BOSS_SPEED
                  : e.type === 'superboss' ? SUPERBOSS_SPEED
                  : e.type === 'red' ? RED_SPEED : BLOB_SPEED;
        e.vx = spd * (Math.random() < 0.5 ? 1 : -1);
      }
      continue;
    }

    // ── Movimiento normal / snowed ──
    const baseSpeed = e.type === 'boss' ? BOSS_SPEED
                    : e.type === 'superboss' ? SUPERBOSS_SPEED
                    : e.type === 'red' ? RED_SPEED : BLOB_SPEED;
    const speed     = e.state === 'normal' ? baseSpeed : baseSpeed * 0.35;
    e.x += e.vx > 0 ? speed : -speed;

    if (e.x <= 0)              { e.x = 0;            e.vx =  Math.abs(e.vx); }
    if (e.x + e.w >= CANVAS_W) { e.x = CANVAS_W-e.w; e.vx = -Math.abs(e.vx); }

    // ── Salto aleatorio ──
    if (e.onGround && e.state === 'normal') {
      const chance = e.type === 'boss' ? JUMP_CHANCE_BOSS
                   : e.type === 'red'  ? JUMP_CHANCE_RED
                   :                     JUMP_CHANCE_BLOB;
      if (Math.random() < chance) {
        const bossBoost = e.type === 'boss' ? 1.15 : 1;
        e.vy       = JUMP_FORCE * (0.85 + Math.random() * 0.3) * bossBoost;
        e.onGround = false;
        if (Math.random() < 0.3) e.vx = -e.vx;
      }
    }
  }

  // ── Bola rodando mata otros enemigos ──
  for (const ball of enemies) {
    if (ball.state !== 'snowball') continue;
    if (Math.abs(ball.ballVx) < 0.8) continue;

    for (const target of enemies) {
      if (target === ball || target.state === 'dead') continue;
      if (overlaps(ball, target)) {
        target.state   = 'dead';
        target._killedByBall = true;
        spawnParticles(particles, target.x + target.w / 2, target.y + target.h / 2, '#a8d8ff', 10);
      }
    }
  }
}

export function trySuperbossLightning(boss, lightnings, now) {
  if (boss.state !== 'normal' && boss.state !== 'snowed1' && boss.state !== 'snowed2') return;
  if (now - boss.lastLightning < 2200) return;
  boss.lastLightning = now;

  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const x = 40 + Math.random() * 400;
    lightnings.push({
      x,
      w: 14,
      warningUntil: now + 700,
      strikeUntil:  now + 1050,
      active: true,
      _dmgDealt: false,
      _warned:   false,
    });
  }
}

export function spawnParticles(particles, cx, cy, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 30 + Math.random() * 25,
      maxLife: 55,
      color,
      r: 2 + Math.random() * 3,
    });
  }
}
