// ══════════════════════════════════════════════════════════════════════════
//  collisions.js — Detección de colisiones (funciones puras)
//
//  Todas las funciones son puras y reciben datos por parámetro.
//  Ninguna modifica estado directamente; eso lo hace el gameLoop.
// ══════════════════════════════════════════════════════════════════════════

// ── Colisión: disparo (rectángulo) vs tetilla (círculo) ───────────────────
/**
 * Comprueba si un disparo (cable vertical) choca con una tetilla.
 *
 * El disparo es un rectángulo fino { x, y, w, h } (esquina superior-izquierda).
 * La tetilla es un círculo { x, y, hr } donde x,y es el CENTRO.
 *
 * Algoritmo: punto-más-cercano del rectángulo al centro del círculo.
 *
 * @param {object} shot – { x, y, w, h, active }
 * @param {object} t    – { x, y, hr, alive }
 * @returns {boolean}
 */
export function shotHitsTetilla(shot, t) {
  if (!shot.active || !t.alive) return false;

  // Punto del rectángulo más cercano al centro de la tetilla
  const nearX = Math.max(shot.x, Math.min(t.x, shot.x + shot.w));
  const nearY = Math.max(shot.y, Math.min(t.y, shot.y + shot.h));

  const dx = t.x - nearX;
  const dy = t.y - nearY;
  return dx * dx + dy * dy <= t.hr * t.hr;
}

// ── Colisión: jugador (rectángulo) vs tetilla (círculo) ───────────────────
/**
 * Comprueba si el hitbox del jugador toca a una tetilla.
 *
 * @param {object} player – { x, y, w, h, alive, invincible }
 * @param {object} t      – { x, y, hr, alive }
 * @returns {boolean}
 */
export function playerHitsTetilla(player, t) {
  if (!t.alive || !player.alive || player.invincible) return false;

  const nearX = Math.max(player.x, Math.min(t.x, player.x + player.w));
  const nearY = Math.max(player.y, Math.min(t.y, player.y + player.h));

  const dx = t.x - nearX;
  const dy = t.y - nearY;
  return dx * dx + dy * dy <= t.hr * t.hr;
}

// ── Batch: todos los disparos vs todas las tetillas ───────────────────────
/**
 * Itera sobre los disparos activos y las tetillas vivas buscando colisiones.
 * Llama a onHit(shot, tetilla) por cada par que colisiona.
 * Cada tetilla solo puede ser golpeada una vez por frame.
 *
 * @param {object[]} shots
 * @param {object[]} tetillas
 * @param {Function} onHit – callback(shot, tetilla)
 */
export function checkShotsVsTetillas(shots, tetillas, onHit) {
  for (const shot of shots) {
    if (!shot.active) continue;
    for (const t of tetillas) {
      if (!t.alive) continue;
      if (shotHitsTetilla(shot, t)) {
        onHit(shot, t);
        break;                // un disparo destruye solo una tetilla
      }
    }
  }
}

// ── Colisión: jugador vs cualquier tetilla ────────────────────────────────
/**
 * Busca la primera tetilla que toque al jugador y llama onHit().
 * Solo se activa una vez por frame (retorna tras el primer hit).
 *
 * @param {object}   player
 * @param {object[]} tetillas
 * @param {Function} onHit – callback()
 */
export function checkPlayerVsTetillas(player, tetillas, onHit) {
  if (!player.alive || player.invincible) return;
  for (const t of tetillas) {
    if (!t.alive) continue;
    if (playerHitsTetilla(player, t)) {
      onHit();
      return;
    }
  }
}
