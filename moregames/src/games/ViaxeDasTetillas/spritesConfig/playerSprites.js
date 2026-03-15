// ══════════════════════════════════════════════════════════════════════════
//  playerSprites.js — Configuración de recorte del spritesheet de A Mestra
//
//  mestra.png  →  499×500 px, 5 columnas (fw=99)
//  Filas medidas con PIL:
//    Row 0  y=  0-135  (sh=135) → animación de caminar/idle (5 frames)
//    Row 1  y=135-315  (sh=180) → poses expresivas / gaita (5 frames)
//    Row 2  y=315-500  (sh=185) → celebración / muerta (5 frames)
//
//  Estado 'shoot' usa maestraEspaldas.png (imagen independiente, sin frames).
// ══════════════════════════════════════════════════════════════════════════

export const PLAYER_FRAME_W = 99;    // ancho de celda en el sheet
export const PLAYER_FRAME_H = 135;   // alto de la fila 0 (referencia)

// ── Tamaño visual al dibujar en el canvas ──────────────────────────────────
export const PLAYER_DRAW_W = 44;
export const PLAYER_DRAW_H = 58;

const FW = PLAYER_FRAME_W;

// ── Frames por estado ──────────────────────────────────────────────────────
export const PLAYER_FRAMES = {
  // Row 0: caminar → idle y run comparten la misma animación
  idle: [
    { sx: 0,    sy:   0, sw: FW, sh: 135 },
    { sx: FW,   sy:   0, sw: FW, sh: 135 },
  ],
  run: [
    { sx: 0,    sy:   0, sw: FW, sh: 135 },
    { sx: FW,   sy:   0, sw: FW, sh: 135 },
    { sx: FW*2, sy:   0, sw: FW, sh: 135 },
    { sx: FW*3, sy:   0, sw: FW, sh: 135 },
    { sx: FW*4, sy:   0, sw: FW, sh: 135 },
  ],
  // Row 1: poses gaita (fallback si no carga maestraEspaldas)
  shoot: [
    { sx: 0,    sy: 135, sw: FW, sh: 180 },
    { sx: FW,   sy: 135, sw: FW, sh: 180 },
    { sx: FW*2, sy: 135, sw: FW, sh: 180 },
  ],
  shootUp: [
    { sx: 0,    sy: 135, sw: FW, sh: 180 },
    { sx: FW,   sy: 135, sw: FW, sh: 180 },
    { sx: FW*2, sy: 135, sw: FW, sh: 180 },
  ],
  // Row 2: celebración / muerta
  dead: [
    { sx: 0,    sy: 315, sw: FW, sh: 185 },
    { sx: FW,   sy: 315, sw: FW, sh: 185 },
  ],
};
