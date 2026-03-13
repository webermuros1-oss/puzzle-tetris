// ── Colisiones ─────────────────────────────────────────────────────────────

/** AABB overlap */
export function overlaps(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

/**
 * Resuelve colisión de un objeto móvil contra una lista de plataformas.
 * Devuelve si está en suelo.
 */
export function resolvePlatforms(obj, platforms) {
  let onGround = false;

  for (const p of platforms) {
    if (!overlaps(obj, p)) continue;

    // Calcular penetración en cada eje
    const overlapLeft  = (obj.x + obj.w) - p.x;
    const overlapRight = (p.x + p.w) - obj.x;
    const overlapTop   = (obj.y + obj.h) - p.y;
    const overlapBot   = (p.y + p.h) - obj.y;

    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop,  overlapBot);

    if (minY < minX) {
      // Resolver verticalmente
      if (overlapTop < overlapBot) {
        // Choca por arriba → cae sobre plataforma
        obj.y = p.y - obj.h;
        if (obj.vy > 0) obj.vy = 0;
        onGround = true;
      } else {
        // Choca por abajo → rebota cabeza
        obj.y = p.y + p.h;
        if (obj.vy < 0) obj.vy = 0;
      }
    } else {
      // Resolver horizontalmente
      if (overlapLeft < overlapRight) {
        obj.x = p.x - obj.w;
      } else {
        obj.x = p.x + p.w;
      }
      obj.vx = 0;
    }
  }

  return onGround;
}

/** Balas del jugador vs enemigos */
export function checkBulletsVsEnemies(bullets, enemies, onHit) {
  for (const b of bullets) {
    if (!b.active || b.owner !== 'player') continue;
    for (const e of enemies) {
      if (e.state === 'dead') continue;
      if (overlaps(b, e)) {
        b.active = false;
        onHit(e, b.damage);
        break;
      }
    }
  }
}

/** Balas del enemigo vs jugador */
export function checkBulletsVsPlayer(bullets, player, onHit) {
  if (player.invincible) return;
  for (const b of bullets) {
    if (!b.active || b.owner !== 'enemy') continue;
    if (overlaps(b, player)) {
      b.active = false;
      onHit(player, b.damage);
    }
  }
}

/** Granadas vs enemigos (radio de explosión) */
export function checkExplosionsVsEnemies(explosions, enemies, onHit) {
  for (const ex of explosions) {
    if (!ex.active || ex.dmgDealt) continue;
    for (const e of enemies) {
      if (e.state === 'dead') continue;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const dx = cx - ex.x;
      const dy = cy - ex.y;
      if (Math.hypot(dx, dy) < ex.r) {
        onHit(e, ex.damage);
      }
    }
    ex.dmgDealt = true;
  }
}

/** Jugador vs prisioneros */
export function checkPlayerVsPrisoners(player, prisoners, onRescue) {
  for (const p of prisoners) {
    if (p.rescued) continue;
    if (overlaps(player, p)) {
      p.rescued = true;
      onRescue(p);
    }
  }
}

/** Jugador vs boss por contacto */
export function checkPlayerVsEnemyContact(player, enemies, onHit) {
  if (player.invincible) return;
  for (const e of enemies) {
    if (e.state === 'dead') continue;
    if (overlaps(player, e)) {
      onHit(player, 1);
      break;
    }
  }
}
