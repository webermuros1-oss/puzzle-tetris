// ── Balas y Granadas ────────────────────────────────────────────────────────

const GRENADE_GRAVITY = 0.28;
const EXPLOSION_FRAMES = 8;
const EXPLOSION_DURATION = 400; // ms
const EXPLOSION_R = 48;

/** Actualiza todas las balas. Desactiva las fuera de pantalla/nivel. */
export function updateBullets(bullets, levelW) {
  for (const b of bullets) {
    if (!b.active) continue;
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < 0 || b.x > levelW || b.y < -50 || b.y > 400) {
      b.active = false;
    }
  }
}

/** Actualiza granadas con arco y genera explosiones al tocar el suelo. */
export function updateGrenades(grenades, platforms, explosions, now) {
  for (const g of grenades) {
    if (!g.active) continue;

    g.timer++;

    // Gravedad
    g.vy += GRENADE_GRAVITY;
    g.x  += g.vx;
    g.y  += g.vy;

    // Colisión con plataformas (toca suelo → explota)
    let hit = false;
    for (const p of platforms) {
      if (g.x + g.w > p.x && g.x < p.x + p.w &&
          g.y + g.h >= p.y && g.y + g.h <= p.y + p.h + Math.abs(g.vy) + 2 &&
          g.vy >= 0) {
        hit = true;
        break;
      }
    }

    if (hit || g.timer >= g.maxLife || g.y > 400) {
      explodeGrenade(g, explosions, now);
    }
  }
}

function explodeGrenade(g, explosions, now) {
  if (g.exploded) return;
  g.active   = false;
  g.exploded = true;
  explosions.push({
    x: g.x + g.w / 2,
    y: g.y + g.h / 2,
    r: EXPLOSION_R,
    damage: 2,
    frame: 0,
    maxFrames: EXPLOSION_FRAMES,
    active: true,
    dmgDealt: false,
    startMs: now,
    duration: EXPLOSION_DURATION,
    // Sprite: explosions.png fila 0
    spriteRow: 0,
  });
}

/** Actualiza explosiones (avance de frames). */
export function updateExplosions(explosions, now) {
  for (const ex of explosions) {
    if (!ex.active) continue;
    const age = now - ex.startMs;
    ex.frame = Math.floor((age / ex.duration) * ex.maxFrames);
    if (age >= ex.duration) {
      ex.active = false;
    }
  }
}

/** Limpia arrays de inactivos para no crecer indefinidamente. */
export function cleanup(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (!arr[i].active) arr.splice(i, 1);
  }
}
