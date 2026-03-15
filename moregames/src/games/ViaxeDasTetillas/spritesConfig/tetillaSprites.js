// ══════════════════════════════════════════════════════════════════════════
//  tetillaSprites.js — Configuración de recorte del spritesheet de tetillas
//
//  queso.png  →  374×498 px, 3 columnas (fw=124)
//  Filas medidas con PIL (contenido real, no grids fijos):
//    Row 0  y=  0-130  (sh=130) → large  (3 frames con cara)
//    Row 1  y=130-255  (sh=125) → medium (3 frames cónico)
//    Row 2  y=255-360  (sh=105) → small  (3 frames pequeño)
//    Row 3  y=360-445  (sh= 85) → explosión "boing!" (3 frames)
//    Row 4  y=445-498  (sh= 53) → tiny   (3 fragmentos)
//
//  mexillon.png  →  304×489 px, 3 columnas (fw=101)
//    Row 2  y=280-376  (sh=96)  → mejillón cerrado (proyectil)
// ══════════════════════════════════════════════════════════════════════════

export const TETILLA_FRAME_W = 124;   // ancho de celda en el sheet
export const TETILLA_FRAME_H = 130;   // alto de la fila mayor (referencia)

// ── Tamaño visual de dibujo por tamaño (diámetro en canvas) ───────────────
export const TETILLA_DRAW_SIZE = {
  large:  56,
  medium: 38,
  small:  24,
  tiny:   14,
};

const FW = TETILLA_FRAME_W;

// ── Frames por tamaño ──────────────────────────────────────────────────────
// Todos los tamaños usan la fila 0 (queso con carita).
// Coordenadas medidas con PIL: los quesos NO están en un grid uniforme.
// TETILLA_DRAW_SIZE controla el tamaño visual — el sprite siempre es el mismo.
const LARGE_FRAMES = [
  { sx:   8, sy:  6, sw: 132, sh: 116 },   // frame 0 (x=12-135 + pad)
  { sx: 146, sy: 16, sw: 117, sh: 104 },   // frame 1 (x=150-258 + pad)
  { sx: 268, sy: 23, sw: 106, sh:  96 },   // frame 2 (x=272-369 + pad)
];

export const TETILLA_FRAMES = {
  large:  LARGE_FRAMES,
  medium: LARGE_FRAMES,
  small:  LARGE_FRAMES,
  tiny:   LARGE_FRAMES,
  explosion: [
    { sx: 0,    sy: 360, sw: FW, sh: 85 },
    { sx: FW,   sy: 360, sw: FW, sh: 85 },
    { sx: FW*2, sy: 360, sw: FW, sh: 85 },
  ],
};

// ── Proyectil: mejillón cerrado (cable vertical) ───────────────────────────
// Fuente: mexillon.png row 2, col 0 → (0, 280, 101, 96)
// Tamaño de dibujo en canvas: 22×26 px (repetido verticalmente)
export const MEXILLON_FRAME_W = 22;    // ancho de dibujo en canvas
export const MEXILLON_FRAME_H = 26;    // alto de dibujo en canvas
export const MEXILLON_FRAME   = { sx: 0, sy: 280, sw: 101, sh: 96 };
