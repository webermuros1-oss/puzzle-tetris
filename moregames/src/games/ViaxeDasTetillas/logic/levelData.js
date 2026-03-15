// ══════════════════════════════════════════════════════════════════════════
//  levelData.js — Definición de niveles
//
//  Cada nivel especifica:
//    bgIndex   → índice del fondo (0, 1, ...)
//    timeLimit → segundos máximos (null = sin límite)
//    tetillas  → array de { x, y, size, vx } con posición y dirección inicial
//
//  Para añadir más niveles: agrega un objeto al array LEVELS.
// ══════════════════════════════════════════════════════════════════════════

// ── Nivel 1: Benvida a Galicia ─────────────────────────────────────────────
// Una tetilla grande en el centro. Fácil para aprender.
const LEVEL_1 = {
  bgIndex:   0,   // faroFisterra
  timeLimit: null,
  tetillas: [
    { x: 240, y: 80, size: 'large', vx: 70 },
  ],
};

// ── Nivel 2: As dúas tetillas ──────────────────────────────────────────────
// Dos tetillas grandes en lados opuestos.
const LEVEL_2 = {
  bgIndex:   1,   // montelouro
  timeLimit: null,
  tetillas: [
    { x: 120, y: 70,  size: 'large', vx:  75 },
    { x: 360, y: 90,  size: 'large', vx: -75 },
  ],
};

// ── Nivel 3: Mexillonazo ───────────────────────────────────────────────────
// Mezcla de tamaños. Empieza a ponerse interesante.
const LEVEL_3 = {
  bgIndex:   0,   // faroFisterra
  timeLimit: null,
  tetillas: [
    { x: 100, y: 60,  size: 'large',  vx:  70 },
    { x: 240, y: 50,  size: 'medium', vx: -90 },
    { x: 380, y: 80,  size: 'large',  vx: -70 },
  ],
};

// ── Nivel 4: Caos de queixos ───────────────────────────────────────────────
// Más tetillas y temporizador.
const LEVEL_4 = {
  bgIndex:   1,   // montelouro
  timeLimit: 90,
  tetillas: [
    { x:  80, y:  50, size: 'large',  vx:  80 },
    { x: 200, y:  70, size: 'large',  vx: -80 },
    { x: 320, y:  60, size: 'medium', vx:  95 },
    { x: 420, y:  90, size: 'small',  vx: -110 },
  ],
};

// ── Nivel 5: A festa do queixo ─────────────────────────────────────────────
// Nivel final: muchas tetillas y tiempo limitado. ¡Caos total!
const LEVEL_5 = {
  bgIndex:   0,   // faroFisterra
  timeLimit: 75,
  tetillas: [
    { x:  60, y:  40, size: 'large',  vx:  70 },
    { x: 160, y:  60, size: 'large',  vx: -80 },
    { x: 260, y:  50, size: 'medium', vx:  90 },
    { x: 360, y:  70, size: 'medium', vx: -95 },
    { x: 430, y:  55, size: 'small',  vx:  110 },
  ],
};

export const LEVELS       = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];
export const TOTAL_LEVELS = LEVELS.length;
