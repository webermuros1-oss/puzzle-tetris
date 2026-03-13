// ── Jugador ────────────────────────────────────────────────────────────────

export const PLAYER_W = 20;
export const PLAYER_H = 28;

const SPEED       = 2.2;   // px/frame
const JUMP_VY     = -6.5;
const GRAVITY     = 0.35;
const SHOOT_CD    = 220;   // ms
const GRENADE_CD  = 800;   // ms
const INVINCIBLE_MS = 1800;
const MAX_HP      = 3;

export function createPlayer(x, y) {
  return {
    x, y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,       // 1 = derecha, -1 = izquierda
    state: 'idle',   // idle | run | jump | fall | shoot | dead
    hp: MAX_HP,
    grenades: 5,
    score: 0,
    onGround: false,
    invincible: false,
    invincibleUntil: 0,
    shootCd: 0,
    grenadeCd: 0,
    animFrame: 0,
    animTimer: 0,
    // Sprite frames: { idle:[...], run:[...], jump:[...], shoot:[...] }
    // Cada frame: { sx, sy, sw:24, sh:32 }
    // (Ajustar cuando se añada el spritesheet player.png)
    spriteFrames: {
      idle:  [{ sx: 0,  sy: 0,  sw: 24, sh: 32 }],
      run:   [{ sx: 24, sy: 0,  sw: 24, sh: 32 },
              { sx: 48, sy: 0,  sw: 24, sh: 32 },
              { sx: 72, sy: 0,  sw: 24, sh: 32 },
              { sx: 96, sy: 0,  sw: 24, sh: 32 }],
      jump:  [{ sx: 0,  sy: 32, sw: 24, sh: 32 }],
      fall:  [{ sx: 24, sy: 32, sw: 24, sh: 32 }],
      shoot: [{ sx: 48, sy: 32, sw: 24, sh: 32 }],
      dead:  [{ sx: 72, sy: 32, sw: 24, sh: 32 }],
    },
  };
}

export function updatePlayer(player, keys, now, levelW) {
  if (player.state === 'dead') return;

  const prevOnGround = player.onGround;

  // ── Movimiento horizontal ──
  let moving = false;
  if (keys.left) {
    player.vx    = -SPEED;
    player.facing = -1;
    moving = true;
  } else if (keys.right) {
    player.vx    = SPEED;
    player.facing = 1;
    moving = true;
  } else {
    player.vx = 0;
  }

  // ── Salto ──
  if ((keys.jump || keys.jumpPressed) && player.onGround) {
    player.vy = JUMP_VY;
    player.onGround = false;
    keys.jumpPressed = false;
  }

  // ── Gravedad ──
  player.vy += GRAVITY;
  if (player.vy > 12) player.vy = 12;

  // ── Aplicar velocidad ──
  player.x += player.vx;
  player.y += player.vy;

  // ── Límites del nivel ──
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > levelW) player.x = levelW - player.w;

  // Devolver al suelo si sale por abajo (fail-safe)
  if (player.y > 500) { player.y = 500; player.vy = 0; }

  // ── Invencibilidad ──
  if (player.invincible && now >= player.invincibleUntil) {
    player.invincible = false;
  }

  // ── Cooldowns ──
  if (now > player.shootCd)   player.shootCd   = 0;
  if (now > player.grenadeCd) player.grenadeCd = 0;

  // ── Estado de animación ──
  if (!player.onGround) {
    player.state = player.vy < 0 ? 'jump' : 'fall';
  } else if (moving) {
    player.state = 'run';
  } else {
    player.state = player.state === 'shoot' ? 'shoot' : 'idle';
  }

  // ── Animación (avanzar frame) ──
  player.animTimer++;
  const fps = { idle: 12, run: 6, jump: 20, fall: 20, shoot: 8, dead: 10 };
  const speed = fps[player.state] || 10;
  if (player.animTimer >= speed) {
    player.animTimer = 0;
    const frames = player.spriteFrames[player.state] || player.spriteFrames.idle;
    player.animFrame = (player.animFrame + 1) % frames.length;
    if (player.state === 'shoot') player.state = 'idle';
  }

  return player;
}

/** Intentar disparar. Devuelve bala o null. */
export function tryShoot(player, now) {
  if (player.state === 'dead') return null;
  if (player.shootCd > now) return null;
  player.shootCd = now + SHOOT_CD;
  player.state   = 'shoot';
  player.animFrame = 0;

  const bx = player.facing === 1 ? player.x + player.w : player.x - 8;
  const by = player.y + player.h * 0.4;
  return {
    x: bx, y: by, w: 8, h: 4,
    vx: 7 * player.facing, vy: 0,
    owner: 'player', damage: 1, active: true,
    // Frame sprite de bala (bala_mosquete fila 0 col 0 de bullets.png)
    frame: { sx: 0, sy: 0, sw: 8, sh: 4 },
  };
}

/** Intentar lanzar granada. Devuelve granada o null. */
export function tryGrenade(player, now) {
  if (player.state === 'dead') return null;
  if (player.grenadeCd > now) return null;
  if (player.grenades <= 0) return null;
  player.grenadeCd = now + GRENADE_CD;
  player.grenades--;

  const gx = player.x + player.w / 2;
  const gy = player.y;
  return {
    x: gx, y: gy, w: 8, h: 8,
    vx: 4.5 * player.facing,
    vy: -5,
    active: true,
    explodeAt: 0,      // se fija al tocar suelo
    exploded: false,
    timer: 0,          // frames de vida
    maxLife: 120,      // si no toca suelo en 2s explota igual
  };
}

/** Dañar al jugador */
export function damagePlayer(player, amount, now) {
  if (player.invincible || player.state === 'dead') return;
  player.hp -= amount;
  if (player.hp <= 0) {
    player.hp    = 0;
    player.state = 'dead';
    player.vx    = 0;
    player.vy    = -3;
  } else {
    player.invincible     = true;
    player.invincibleUntil = now + INVINCIBLE_MS;
  }
}

export function getPlayerFrame(player) {
  const frames = player.spriteFrames[player.state] || player.spriteFrames.idle;
  return frames[player.animFrame % frames.length];
}
