// ══════════════════════════════════════════════════════════════════════════
//  tetillas.test.js
//
//  Tests unitarios para la lógica de las tetillas (pura JS, sin DOM).
//
//  Ejecutar con: npx vitest  (o npm test si configuras vitest en package.json)
//  Instalar: npm i -D vitest
// ══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  createTetilla,
  updateTetilla,
  splitTetilla,
  TETILLA_SIZES,
  SPLIT_INTO,
  FLOOR_Y,
  CEILING_Y,
  WALL_LEFT,
  WALL_RIGHT,
  GRAVITY,
} from '../tetillas.js';

// ── createTetilla ─────────────────────────────────────────────────────────
describe('createTetilla', () => {
  it('crea una tetilla large con radio correcto', () => {
    const t = createTetilla(100, 80, 'large', 70);
    expect(t.size).toBe('large');
    expect(t.r).toBe(TETILLA_SIZES.large.r);
    expect(t.hr).toBe(TETILLA_SIZES.large.hr);
    expect(t.vx).toBe(70);
    expect(t.vy).toBe(0);
    expect(t.alive).toBe(true);
    expect(t.x).toBe(100);
    expect(t.y).toBe(80);
  });

  it('usa vxBase cuando no se pasa vx', () => {
    const t = createTetilla(100, 80, 'medium');
    expect(t.vx).toBe(TETILLA_SIZES.medium.vxBase);
  });

  it('crea los 4 tamaños sin errores', () => {
    ['large', 'medium', 'small', 'tiny'].forEach(size => {
      const t = createTetilla(200, 100, size, 80);
      expect(t.size).toBe(size);
      expect(t.r).toBeGreaterThan(0);
    });
  });
});

// ── splitTetilla ──────────────────────────────────────────────────────────
describe('splitTetilla', () => {
  it('large → 2 medium', () => {
    const t    = createTetilla(200, 100, 'large', 70);
    const kids = splitTetilla(t);
    expect(kids).toHaveLength(2);
    expect(kids[0].size).toBe('medium');
    expect(kids[1].size).toBe('medium');
  });

  it('medium → 2 small', () => {
    const kids = splitTetilla(createTetilla(200, 100, 'medium', 70));
    expect(kids).toHaveLength(2);
    kids.forEach(k => expect(k.size).toBe('small'));
  });

  it('small → 2 tiny', () => {
    const kids = splitTetilla(createTetilla(200, 100, 'small', 70));
    expect(kids).toHaveLength(2);
    kids.forEach(k => expect(k.size).toBe('tiny'));
  });

  it('tiny → sin hijos (destruida)', () => {
    const kids = splitTetilla(createTetilla(200, 100, 'tiny', 70));
    expect(kids).toHaveLength(0);
  });

  it('hijas salen en direcciones opuestas', () => {
    const kids = splitTetilla(createTetilla(200, 100, 'large', 70));
    expect(kids[0].vx).toBeLessThan(0);   // izquierda
    expect(kids[1].vx).toBeGreaterThan(0); // derecha
  });

  it('hijas nacen con impulso vertical hacia arriba', () => {
    const kids = splitTetilla(createTetilla(200, 100, 'large', 70));
    kids.forEach(k => expect(k.vy).toBeLessThan(0)); // sube = negativo
  });

  it('hijas heredan la posición de la madre', () => {
    const t    = createTetilla(150, 90, 'medium', 80);
    const kids = splitTetilla(t);
    kids.forEach(k => {
      expect(k.x).toBe(150);
      expect(k.y).toBe(90);
    });
  });
});

// ── updateTetilla — rebotes ───────────────────────────────────────────────
describe('updateTetilla — rebotes', () => {
  it('rebota en el suelo: invertir vy y usar vyBounce fijo', () => {
    const t = createTetilla(200, FLOOR_Y - 1, 'large', 0);
    t.vy = 200;  // cae hacia abajo
    updateTetilla(t, 0.016);
    expect(t.vy).toBe(TETILLA_SIZES.large.vyBounce); // vy fija de rebote
    expect(t.y + t.r).toBeLessThanOrEqual(FLOOR_Y + 0.5); // no traspasa suelo
  });

  it('rebota en el techo: vy se hace positiva', () => {
    const t = createTetilla(200, CEILING_Y + 1, 'medium', 0);
    t.vy = -300;  // sube
    updateTetilla(t, 0.016);
    expect(t.vy).toBeGreaterThanOrEqual(0); // ahora baja
    expect(t.y - t.r).toBeGreaterThanOrEqual(CEILING_Y - 0.5);
  });

  it('rebota en pared izquierda: vx se hace positiva', () => {
    const t = createTetilla(WALL_LEFT + 1, 100, 'small', -80);
    t.vy = 0;
    updateTetilla(t, 0.016);
    expect(t.vx).toBeGreaterThan(0);
    expect(t.x - t.r).toBeGreaterThanOrEqual(WALL_LEFT);
  });

  it('rebota en pared derecha: vx se hace negativa', () => {
    const t = createTetilla(WALL_RIGHT - 1, 100, 'small', 80);
    t.vy = 0;
    updateTetilla(t, 0.016);
    expect(t.vx).toBeLessThan(0);
    expect(t.x + t.r).toBeLessThanOrEqual(WALL_RIGHT + 0.5);
  });

  it('aplica gravedad cuando no toca ningún límite', () => {
    const t    = createTetilla(200, 100, 'medium', 0);
    const vyPrev = t.vy;
    updateTetilla(t, 0.016);
    expect(t.vy).toBeGreaterThan(vyPrev); // gravedad positiva → cae
    expect(t.vy).toBeCloseTo(vyPrev + GRAVITY * 0.016, 3);
  });

  it('tetilla muerta no se mueve', () => {
    const t = createTetilla(200, 100, 'large', 70);
    t.alive = false;
    const xBefore = t.x;
    updateTetilla(t, 0.016);
    expect(t.x).toBe(xBefore); // sin movimiento
  });
});

// ── Árbol de división completo ────────────────────────────────────────────
describe('árbol de división completo', () => {
  it('una large genera la pirámide: 2 medium → 4 small → 8 tiny → 0', () => {
    const root  = createTetilla(240, 50, 'large', 70);
    const meds  = splitTetilla(root);          // 2 medium
    expect(meds).toHaveLength(2);

    const smalls = meds.flatMap(splitTetilla); // 4 small
    expect(smalls).toHaveLength(4);

    const tinies = smalls.flatMap(splitTetilla); // 8 tiny
    expect(tinies).toHaveLength(8);

    const dead = tinies.flatMap(splitTetilla);   // 0
    expect(dead).toHaveLength(0);
  });
});
