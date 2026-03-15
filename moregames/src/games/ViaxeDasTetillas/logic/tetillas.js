// ══════════════════════════════════════════════════════════════════════════
//  tetillas.js — Lógica de las tetillas (burbujas estilo Pang)
//
//  Las "tetillas" son quesos gallegos que rebotan por la pantalla.
//  Al recibir un impacto se dividen en dos del tamaño inmediatamente menor.
//  El tamaño mínimo ('tiny') se destruye sin generar hijos.
// ══════════════════════════════════════════════════════════════════════════

// ── Dimensiones del área de juego ──────────────────────────────────────────
export const CANVAS_W  = 480;
export const CANVAS_H  = 310;
export const FLOOR_Y   = 274;   // Y del suelo
export const CEILING_Y = 0;
export const WALL_LEFT  = 0;
export const WALL_RIGHT = CANVAS_W;

// ── Gravedad ───────────────────────────────────────────────────────────────
export const GRAVITY = 340; // px/s²  (un poco menos agresiva → saltos más suaves)

// ── Configuración por tamaño ───────────────────────────────────────────────
//  Alturas máximas con GRAVITY=340 y FLOOR_Y=274:
//    large  → ~220 px  (casi llega al techo — muy botador)
//    medium → ~145 px  (≈53%)
//    small  →  ~68 px  (≈25% — se queda en la mitad baja)
//    tiny   →  ~28 px  (apenas rebota)
export const TETILLA_SIZES = {
  large:  { r: 28, hr: 24, vxBase:  62, vyBounce: -388 },  // ~220 px
  medium: { r: 19, hr: 16, vxBase:  80, vyBounce: -315 },  // ~145 px
  small:  { r: 12, hr: 10, vxBase:  95, vyBounce: -298 },  // ~130 px (era 68)
  tiny:   { r:  7, hr:  6, vxBase: 112, vyBounce: -258 },  //  ~98 px (era 28)
};

// Árbol de división: qué tamaño generan al ser golpeadas
export const SPLIT_INTO = {
  large:  'medium',
  medium: 'small',
  small:  'tiny',
  tiny:   null,      // sin hijos → destruida
};

// ── Crear tetilla ──────────────────────────────────────────────────────────
/**
 * @param {number} x     – posición X del centro
 * @param {number} y     – posición Y del centro
 * @param {string} size  – 'large' | 'medium' | 'small' | 'tiny'
 * @param {number} vx    – velocidad horizontal (positivo = derecha)
 * @returns {object}
 */
export function createTetilla(x, y, size, vx) {
  const cfg = TETILLA_SIZES[size];
  return {
    x, y,
    size,
    r:  cfg.r,
    hr: cfg.hr,
    vx: vx ?? cfg.vxBase,
    vy: 0,
    alive:     true,
    frame:     0,           // frame de animación actual (0-3)
    frameTick: 0,           // acumulador de tiempo para avanzar frame
  };
}

// ── Actualizar física ──────────────────────────────────────────────────────
/**
 * Aplica gravedad, mueve la tetilla y gestiona rebotes en suelo/techo/paredes.
 * Función pura (modifica el objeto in-place).
 *
 * @param {object} t   – tetilla
 * @param {number} dt  – delta time en segundos
 */
export function updateTetilla(t, dt) {
  if (!t.alive) return;

  const cfg = TETILLA_SIZES[t.size];

  // Gravedad
  t.vy += GRAVITY * dt;

  // Movimiento
  t.x += t.vx * dt;
  t.y += t.vy * dt;

  // ── Rebote en el suelo ──
  if (t.y + t.r >= FLOOR_Y) {
    t.y  = FLOOR_Y - t.r;
    t.vy = cfg.vyBounce;           // energía fija, siempre la misma altura
  }

  // ── Rebote en el techo ──
  if (t.y - t.r <= CEILING_Y) {
    t.y  = CEILING_Y + t.r;
    t.vy = Math.abs(t.vy);         // forzar dirección hacia abajo
  }

  // ── Rebote en pared izquierda ──
  if (t.x - t.r <= WALL_LEFT) {
    t.x  = WALL_LEFT + t.r;
    t.vx = Math.abs(t.vx);        // forzar hacia la derecha
  }

  // ── Rebote en pared derecha ──
  if (t.x + t.r >= WALL_RIGHT) {
    t.x  = WALL_RIGHT - t.r;
    t.vx = -Math.abs(t.vx);       // forzar hacia la izquierda
  }

  // ── Animación (~8 fps) ──
  t.frameTick += dt;
  if (t.frameTick >= 0.125) {
    t.frameTick -= 0.125;
    t.frame = (t.frame + 1) % 4;
  }
}

// ── División al ser golpeada ───────────────────────────────────────────────
/**
 * Genera dos tetillas hijas del tamaño inferior.
 * Si es 'tiny' devuelve [] (la tetilla desaparece).
 *
 * Las hijas salen en direcciones opuestas con ligero impulso hacia arriba.
 *
 * @param {object} t – tetilla golpeada
 * @returns {object[]} 0 o 2 tetillas nuevas
 */
export function splitTetilla(t) {
  const childSize = SPLIT_INTO[t.size];
  if (!childSize) return [];                  // tiny: destruida completamente

  const cfg       = TETILLA_SIZES[childSize];
  const spd       = cfg.vxBase * 1.15;       // las hijas salen un poco más rápidas

  const left  = createTetilla(t.x, t.y, childSize, -spd);
  const right = createTetilla(t.x, t.y, childSize,  spd);

  // Impulso vertical hacia arriba en el momento del split
  left.vy  = -90;
  right.vy = -90;

  return [left, right];
}
