// ══════════════════════════════════════════════════════════════════════════
//  collisions.test.js
//
//  Tests unitarios para la detección de colisiones.
//
//  Ejecutar con: npx vitest
// ══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';
import {
  shotHitsTetilla,
  playerHitsTetilla,
  checkShotsVsTetillas,
  checkPlayerVsTetillas,
} from '../collisions.js';
import { createTetilla } from '../tetillas.js';

// ── Helpers ───────────────────────────────────────────────────────────────
function makeShot(x, y, w, h, active = true) {
  return { x, y, w, h, active };
}

function makePlayer(x, y, w = 26, h = 46, alive = true, invincible = false) {
  return { x, y, w, h, alive, invincible };
}

// ── shotHitsTetilla ───────────────────────────────────────────────────────
describe('shotHitsTetilla', () => {
  it('disparo centrado sobre tetilla → colisiona', () => {
    const t    = createTetilla(100, 100, 'medium', 0); // hr = 16
    // Cable de 8px de ancho centrado en x=100, justo sobre la tetilla
    const shot = makeShot(96, 50, 8, 50);   // y=50 hasta y=100
    expect(shotHitsTetilla(shot, t)).toBe(true);
  });

  it('disparo lateral que no toca la tetilla → no colisiona', () => {
    const t    = createTetilla(100, 100, 'medium', 0); // hr=16
    const shot = makeShot(200, 50, 8, 60); // lejos a la derecha
    expect(shotHitsTetilla(shot, t)).toBe(false);
  });

  it('disparo inactivo → no colisiona aunque esté encima', () => {
    const t    = createTetilla(100, 100, 'medium', 0);
    const shot = makeShot(96, 50, 8, 55, false); // active=false
    expect(shotHitsTetilla(shot, t)).toBe(false);
  });

  it('tetilla muerta → no colisiona', () => {
    const t    = createTetilla(100, 100, 'medium', 0);
    t.alive    = false;
    const shot = makeShot(96, 50, 8, 55);
    expect(shotHitsTetilla(shot, t)).toBe(false);
  });

  it('borde del hitbox (tangente exacta) → colisiona', () => {
    const t    = createTetilla(100, 100, 'small', 0); // hr=10
    // Cable que toca exactamente el lado izquierdo del hitbox
    // nearX = 90 (borde del cable), t.x = 100
    // dx = 100 - 90 = 10 = hr → debería colidir (hr²=100, dx²+dy²=100)
    const shot = makeShot(82, 50, 8, 55); // extremo derecho en x=90
    expect(shotHitsTetilla(shot, t)).toBe(true);
  });
});

// ── playerHitsTetilla ─────────────────────────────────────────────────────
describe('playerHitsTetilla', () => {
  it('jugadora dentro de la tetilla → colisiona', () => {
    const t = createTetilla(120, 180, 'large', 0); // hr=24
    // Hitbox del jugador solapado con el centro de la tetilla
    const p = makePlayer(110, 170, 26, 46);
    expect(playerHitsTetilla(p, t)).toBe(true);
  });

  it('jugadora lejos de la tetilla → no colisiona', () => {
    const t = createTetilla(300, 100, 'large', 0);
    const p = makePlayer(50, 190, 26, 46);
    expect(playerHitsTetilla(p, t)).toBe(false);
  });

  it('jugadora invencible → no colisiona aunque esté encima', () => {
    const t = createTetilla(120, 180, 'large', 0);
    const p = makePlayer(110, 170, 26, 46, true, true); // invincible=true
    expect(playerHitsTetilla(p, t)).toBe(false);
  });

  it('jugadora muerta → no colisiona', () => {
    const t = createTetilla(120, 180, 'large', 0);
    const p = makePlayer(110, 170, 26, 46, false); // alive=false
    expect(playerHitsTetilla(p, t)).toBe(false);
  });
});

// ── checkShotsVsTetillas ──────────────────────────────────────────────────
describe('checkShotsVsTetillas', () => {
  it('llama onHit cuando hay colisión', () => {
    const t      = createTetilla(100, 100, 'medium', 0);
    const shot   = makeShot(96, 50, 8, 55);
    const onHit  = vi.fn();

    checkShotsVsTetillas([shot], [t], onHit);
    expect(onHit).toHaveBeenCalledWith(shot, t);
  });

  it('no llama onHit cuando no hay colisión', () => {
    const t     = createTetilla(300, 100, 'medium', 0);
    const shot  = makeShot(96, 50, 8, 55);
    const onHit = vi.fn();

    checkShotsVsTetillas([shot], [t], onHit);
    expect(onHit).not.toHaveBeenCalled();
  });

  it('omite disparos inactivos', () => {
    const t     = createTetilla(100, 100, 'medium', 0);
    const shot  = makeShot(96, 50, 8, 55, false);
    const onHit = vi.fn();

    checkShotsVsTetillas([shot], [t], onHit);
    expect(onHit).not.toHaveBeenCalled();
  });

  it('un disparo solo golpea una tetilla por frame', () => {
    const t1    = createTetilla(100, 100, 'medium', 0);
    const t2    = createTetilla(102, 100, 'medium', 0); // casi superpuesta
    const shot  = makeShot(96, 50, 8, 55);
    const onHit = vi.fn();

    checkShotsVsTetillas([shot], [t1, t2], onHit);
    expect(onHit).toHaveBeenCalledTimes(1); // solo la primera
  });
});

// ── checkPlayerVsTetillas ─────────────────────────────────────────────────
describe('checkPlayerVsTetillas', () => {
  it('llama onHit cuando jugadora toca una tetilla', () => {
    const t     = createTetilla(120, 180, 'large', 0);
    const p     = makePlayer(110, 170, 26, 46);
    const onHit = vi.fn();

    checkPlayerVsTetillas(p, [t], onHit);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('solo llama onHit una vez aunque haya varias tetillas solapadas', () => {
    const t1    = createTetilla(120, 180, 'large', 0);
    const t2    = createTetilla(122, 180, 'medium', 0); // superpuesta
    const p     = makePlayer(110, 170, 26, 46);
    const onHit = vi.fn();

    checkPlayerVsTetillas(p, [t1, t2], onHit);
    expect(onHit).toHaveBeenCalledTimes(1);
  });

  it('no llama onHit con jugadora invencible', () => {
    const t     = createTetilla(120, 180, 'large', 0);
    const p     = makePlayer(110, 170, 26, 46, true, true);
    const onHit = vi.fn();

    checkPlayerVsTetillas(p, [t], onHit);
    expect(onHit).not.toHaveBeenCalled();
  });
});
