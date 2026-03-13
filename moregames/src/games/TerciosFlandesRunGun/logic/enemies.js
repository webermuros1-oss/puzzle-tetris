// ── Enemigos ───────────────────────────────────────────────────────────────

const GRAVITY     = 0.35;
const SIGHT_RANGE = 220;   // px — distancia a la que detectan al jugador
const SHOOT_CD    = { soldier: 1200, gunner: 700, boss: 900 };
const SPEED       = { soldier: 1.0,  gunner: 0,   boss: 1.4  };
const MAX_HP      = { soldier: 2,    gunner: 3,   boss: 20   };

export function createEnemy({ type, x, y, patrolRange = 80 }) {
  return {
    type,
    x, y,
    w: type === 'boss' ? 40 : 20,
    h: type === 'boss' ? 48 : 28,
    vx: 0, vy: 0,
    facing: -1,
    state: 'patrol',   // patrol | alert | shoot | hit | dead
    hp: MAX_HP[type] ?? 2,
    maxHp: MAX_HP[type] ?? 2,
    onGround: false,
    shootCd: 0,
    animFrame: 0,
    animTimer: 0,
    patrolLeft:  x - patrolRange,
    patrolRight: x + patrolRange,
    _scored: false,
    // Sprite frames – ajustar según enemies.png cuando se añada
    // Fila 0: soldier, Fila 1: gunner, Fila 2: boss
    spriteRow: type === 'boss' ? 2 : type === 'gunner' ? 1 : 0,
    // boss: ataque especial (carga)
    chargeTimer: 0,
    chargeCooldown: 0,
  };
}

export function updateEnemy(enemy, player, now, levelW) {
  if (enemy.state === 'dead') {
    // Caída tras morir
    enemy.vy += GRAVITY;
    enemy.y  += enemy.vy;
    return;
  }

  // ── Gravedad ──
  if (!enemy.onGround) {
    enemy.vy += GRAVITY;
  }
  enemy.y += enemy.vy;

  // ── Distancia al jugador ──
  const dx   = player.x - enemy.x;
  const dist = Math.abs(dx);
  const sameDir = (dx > 0 && enemy.facing === 1) || (dx < 0 && enemy.facing === -1);
  const inSight  = dist < SIGHT_RANGE && player.state !== 'dead';

  // ── IA según tipo ──
  if (enemy.type === 'boss') {
    updateBoss(enemy, player, dx, dist, inSight, now);
  } else if (enemy.type === 'gunner') {
    // Gunner: no se mueve, solo dispara cuando el jugador está cerca
    if (inSight) {
      enemy.facing = dx > 0 ? 1 : -1;
      enemy.state  = 'alert';
    } else {
      enemy.state  = 'patrol';
    }
  } else {
    // Soldier: patrulla y dispara
    if (inSight) {
      enemy.facing = dx > 0 ? 1 : -1;
      enemy.state  = 'alert';
      // Caminar hacia el jugador si está lejos
      if (dist > 80) {
        enemy.vx = SPEED.soldier * enemy.facing;
      } else {
        enemy.vx = 0;
      }
    } else {
      // Patrulla
      enemy.state = 'patrol';
      enemy.vx    = SPEED.soldier * enemy.facing;
      if (enemy.x <= enemy.patrolLeft)  enemy.facing =  1;
      if (enemy.x + enemy.w >= enemy.patrolRight) enemy.facing = -1;
    }
    enemy.x += enemy.vx;
    // Clamp nivel
    enemy.x = Math.max(0, Math.min(levelW - enemy.w, enemy.x));
  }

  // ── Animación ──
  enemy.animTimer++;
  const frameSpeed = enemy.state === 'patrol' ? 8 : 6;
  if (enemy.animTimer >= frameSpeed) {
    enemy.animTimer = 0;
    enemy.animFrame = (enemy.animFrame + 1) % 4;
  }
}

function updateBoss(boss, player, dx, dist, inSight, now) {
  if (!inSight) { boss.state = 'patrol'; boss.vx = 0; return; }

  boss.facing = dx > 0 ? 1 : -1;

  // Carga si ha pasado el cooldown y está un poco lejos
  if (dist > 100 && now > boss.chargeCooldown) {
    boss.state        = 'alert';
    boss.vx           = SPEED.boss * 2.5 * boss.facing;
    boss.chargeCooldown = now + 2500;
  } else if (dist <= 80) {
    // Cerca: quieto y dispara más rápido
    boss.vx    = 0;
    boss.state = 'shoot';
  } else {
    boss.vx = SPEED.boss * boss.facing;
  }

  boss.x += boss.vx;
}

/** Intentar disparar un enemigo. Devuelve bala o null. */
export function tryEnemyShoot(enemy, player, now) {
  if (enemy.state === 'dead') return null;
  if (enemy.state !== 'alert' && enemy.state !== 'shoot') return null;

  const cd = SHOOT_CD[enemy.type] ?? 1200;
  if (now < enemy.shootCd) return null;

  const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  if (dist > SIGHT_RANGE) return null;

  enemy.shootCd = now + cd;

  const bx = enemy.facing === 1 ? enemy.x + enemy.w : enemy.x - 6;
  const by = enemy.y + enemy.h * 0.4;
  const spd = enemy.type === 'boss' ? 5 : 3.5;

  // Boss dispara en arco hacia el jugador
  let vx = spd * enemy.facing;
  let vy = 0;
  if (enemy.type === 'boss') {
    const ddx = player.x - bx;
    const ddy = player.y - by;
    const mag  = Math.hypot(ddx, ddy) || 1;
    vx = (ddx / mag) * spd;
    vy = (ddy / mag) * spd;
  }

  return {
    x: bx, y: by, w: 6, h: 4,
    vx, vy,
    owner: 'enemy', damage: 1, active: true,
    frame: { sx: 0, sy: 8, sw: 6, sh: 4 }, // fila 1 en bullets.png
  };
}

export function damageEnemy(enemy, amount) {
  if (enemy.state === 'dead') return;
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    enemy.hp    = 0;
    enemy.state = 'dead';
    enemy.vy    = -4;
    enemy.vx    = 0;
  } else {
    enemy.state = 'hit';
    // Recuperación tras hit — se resetea en el siguiente frame
    setTimeout(() => {
      if (enemy.state === 'hit') enemy.state = 'alert';
    }, 150);
  }
}
