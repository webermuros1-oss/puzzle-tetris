// ── Bucle de juego ─────────────────────────────────────────────────────────
// Exporta funciones de update e inicialización del estado de juego.

import { LEVEL_1, LEVELS }           from './levelData.js';
import { createPlayer, updatePlayer, tryShoot, tryGrenade, damagePlayer, getPlayerFrame } from './player.js';
import { createEnemy, updateEnemy, tryEnemyShoot, damageEnemy }                           from './enemies.js';
import { updateBullets, updateGrenades, updateExplosions, cleanup }                        from './bullets.js';
import { createCamera, updateCamera }                                                      from './camera.js';
import {
  resolvePlatforms,
  checkBulletsVsEnemies,
  checkBulletsVsPlayer,
  checkExplosionsVsEnemies,
  checkPlayerVsPrisoners,
  checkPlayerVsEnemyContact,
} from './collisions.js';

export { getPlayerFrame };

export const CANVAS_W = 480;
export const CANVAS_H = 270;

/** Crea el estado inicial de juego para un nivel. */
export function createGameState(levelIndex = 0) {
  const lvl = LEVELS[levelIndex] ?? LEVEL_1;
  return {
    level:      lvl,
    levelIndex,
    player:     createPlayer(60, lvl.platforms[0].y - 28),
    enemies:    lvl.enemies.map(e => createEnemy(e)),
    prisoners:  lvl.prisoners?.map(p => ({ ...p, w: 14, h: 24, rescued: false })) ?? [],
    bullets:    [],
    grenades:   [],
    explosions: [],
    camera:     createCamera(),
    tick:       0,
    over:       false,
    won:        false,
  };
}

/**
 * Ejecutar un tick del juego.
 * @param {Object} gs       - estado mutable del juego
 * @param {Object} keys     - { left, right, jump, jumpPressed, shoot, grenade }
 * @param {number} now      - performance.now()
 * @param {Function} onScore - callback(score)
 * @param {Function} onDie
 * @param {Function} onWin
 */
export function tickGame(gs, keys, now, onScore, onDie, onWin) {
  if (gs.over || gs.won) return;

  const { player, enemies, bullets, grenades, explosions, level, camera } = gs;

  // ── Jugador: movimiento y acciones ──
  updatePlayer(player, keys, now, level.width);

  // Disparar
  if (keys.shoot) {
    const b = tryShoot(player, now);
    if (b) bullets.push(b);
  }

  // Granada
  if (keys.grenadePressed) {
    keys.grenadePressed = false;
    const g = tryGrenade(player, now);
    if (g) grenades.push(g);
  }

  // ── Plataformas jugador ──
  const wasOnGround = player.onGround;
  player.onGround = resolvePlatforms(player, level.platforms);
  if (!wasOnGround && player.onGround) {
    // Aterrizó
  }
  // Evitar caer al vacío (límite inferior del canvas)
  if (player.y + player.h > CANVAS_H + 100) {
    damagePlayer(player, 1, now);
    player.x  = Math.max(camera.x + 40, player.x);
    player.y  = level.platforms[0].y - player.h - 4;
    player.vy = 0;
  }

  // ── Enemigos ──
  for (const e of enemies) {
    updateEnemy(e, player, now, level.width);
    e.onGround = resolvePlatforms(e, level.platforms);

    const b = tryEnemyShoot(e, player, now);
    if (b) bullets.push(b);
  }

  // ── Balas ──
  updateBullets(bullets, level.width);

  // ── Granadas ──
  updateGrenades(grenades, level.platforms, explosions, now);

  // ── Explosiones ──
  updateExplosions(explosions, now);

  // ── Colisiones balas→enemigos ──
  checkBulletsVsEnemies(bullets, enemies, (e, dmg) => {
    damageEnemy(e, dmg);
    if (e.state === 'dead' && !e._scored) {
      e._scored = true;
      const pts = e.type === 'boss' ? 5000 : e.type === 'gunner' ? 300 : 100;
      player.score += pts;
      onScore?.(player.score);
    }
  });

  // ── Colisiones explosiones→enemigos ──
  checkExplosionsVsEnemies(explosions, enemies, (e, dmg) => {
    damageEnemy(e, dmg);
    if (e.state === 'dead' && !e._scored) {
      e._scored = true;
      const pts = e.type === 'boss' ? 5000 : e.type === 'gunner' ? 300 : 100;
      player.score += pts;
      onScore?.(player.score);
    }
  });

  // ── Colisiones balas→jugador ──
  checkBulletsVsPlayer(bullets, player, (p, dmg) => {
    damagePlayer(p, dmg, now);
  });

  // ── Contacto enemigo→jugador ──
  checkPlayerVsEnemyContact(player, enemies.filter(e => e.type === 'boss'), (p) => {
    damagePlayer(p, 1, now);
  });

  // ── Prisioneros ──
  checkPlayerVsPrisoners(player, gs.prisoners, (p) => {
    player.score += 500;
    onScore?.(player.score);
  });

  // ── Limpieza ──
  cleanup(bullets);
  cleanup(grenades);
  cleanup(explosions);

  // ── Cámara ──
  updateCamera(camera, player, level.width, CANVAS_W, CANVAS_H);

  // ── Condición de victoria: llegar a la bandera ──
  if (player.x + player.w >= level.flagX && !gs.won) {
    // Solo si el boss está muerto (o no hay boss)
    const boss = enemies.find(e => e.type === 'boss');
    if (!boss || boss.state === 'dead') {
      gs.won = true;
      onWin?.();
    }
  }

  // ── Condición de derrota ──
  if (player.state === 'dead' && !gs.over) {
    // Esperar un poco antes de game over para ver la animación
    setTimeout(() => { gs.over = true; onDie?.(); }, 1500);
  }

  gs.tick++;
}
