// ─────────────────────────────────────────────────────────────
// SPRITE SHEET: tiletPersonages.png  (1782 × 576 px)
// Coordenadas sacadas del análisis pixel a pixel del sheet.
//
// Estructura:
//  x=0-580    → Jugador (4 filas de animación)
//  x=600-1075 → Enemigos (fila1=blob, fila2=rojo, fila3=medusa, fila4=bolas)
//  x=1139+    → Tiles de plataforma
//
//  Filas (y): 97-211 | 211-325 | 325-439 | 439-553  (h≈114 cada una)
// ─────────────────────────────────────────────────────────────

// Tamaños lógicos en el canvas del juego
export const PLAYER_W = 36;
export const PLAYER_H = 48;
export const BLOB_W   = 32;
export const BLOB_H   = 36;
export const RED_W    = 38;
export const RED_H    = 48;
export const BALL_W   = 32;
export const BALL_H   = 32;
export const PROJ_W   = 16;
export const PROJ_H   = 16;

// ── Jugador ─────────────────────────────────────────────────
// Fila 1 (y=97): walk cycle, 7 frames
// Fila 3 (y=325): acción / salto, 6 frames
// Fila 4 (y=439): celebración / especial

// Todas las animaciones del jugador usan FILA 1 (y=97) para color uniforme.
// La fila 1 tiene el personaje en el mismo esquema de color en todas las poses.
const PY1 = 97, PH = 114;

export const SPR = {
  player: {
    idle:      { sx: 286, sy: PY1, sw: 50,  sh: PH },   // Frame 4 — pose neutra
    run1:      { sx: 31,  sy: PY1, sw: 70,  sh: PH },   // Frame 1
    run2:      { sx: 205, sy: PY1, sw: 53,  sh: PH },   // Frame 3
    run3:      { sx: 355, sy: PY1, sw: 56,  sh: PH },   // Frame 5
    jump:      { sx: 507, sy: PY1, sw: 59,  sh: PH },   // Frame 7 — misma fila = mismo color
    throw:     { sx: 424, sy: PY1, sw: 76,  sh: PH },   // Frame 6 — brazos abiertos
    celebrate: { sx: 115, sy: PY1, sw: 72,  sh: PH },   // Frame 2 — celebración
  },

  // ── Blob azul (fila 1 de enemigos, y=97) ──
  blob: {
    normal:  { sx: 629, sy: 97,  sw: 62, sh: 114 },
    snowed1: { sx: 704, sy: 97,  sw: 66, sh: 114 },
    snowed2: { sx: 792, sy: 97,  sw: 70, sh: 114 },
  },

  // ── Monstruo rojo (fila 2 de enemigos, y=211) ──
  red: {
    normal:  { sx: 627, sy: 211, sw: 61, sh: 114 },
    snowed1: { sx: 699, sy: 211, sw: 76, sh: 114 },
    snowed2: { sx: 790, sy: 211, sw: 73, sh: 114 },
  },

  // ── Bolas de nieve (fila 4 de enemigos, y=439) ──
  // 5 círculos de menor a mayor
  snowball: {
    small:  { sx: 631, sy: 439, sw: 56, sh: 114 },
    medium: { sx: 712, sy: 439, sw: 77, sh: 114 },
    large:  { sx: 809, sy: 439, sw: 73, sh: 114 },
  },

  // Proyectil (bola pequeña lanzada por el jugador)
  projectile: { sx: 631, sy: 439, sw: 56, sh: 114 },

  // ── Tiles por fila del spritesheet (x=1139+) ──
  // Cada nivel usa una fila diferente: tileRow = 97 | 211 | 325 | 439
  tiles: {
    97:  { ice: { sx:1139, sy:97,  sw:82, sh:82 }, snow: { sx:1229, sy:97,  sw:82, sh:82 }, solid: { sx:1317, sy:97,  sw:79, sh:82 } },
    211: { ice: { sx:1139, sy:211, sw:82, sh:82 }, snow: { sx:1229, sy:211, sw:82, sh:82 }, solid: { sx:1317, sy:211, sw:79, sh:82 } },
    325: { ice: { sx:1139, sy:325, sw:82, sh:82 }, snow: { sx:1229, sy:325, sw:82, sh:82 }, solid: { sx:1317, sy:325, sw:79, sh:82 } },
    439: { ice: { sx:1139, sy:439, sw:82, sh:82 }, snow: { sx:1229, sy:439, sw:82, sh:82 }, solid: { sx:1317, sy:439, sw:79, sh:82 } },
  },
};

// ── Helpers de frame ─────────────────────────────────────────

export function getPlayerFrame(player, tick) {
  switch (player.anim) {
    case 'throw':     return SPR.player.throw;
    case 'jump':      return SPR.player.jump;
    case 'celebrate': return SPR.player.celebrate;
    case 'run': {
      const frames = [SPR.player.run1, SPR.player.run2, SPR.player.run3, SPR.player.run2];
      return frames[Math.floor(tick / 6) % frames.length];
    }
    default: return SPR.player.idle;
  }
}

export function getEnemyFrame(enemy) {
  if (enemy.state === 'snowball') {
    return enemy.type === 'red' ? SPR.snowball.large
         : enemy.type === 'boss' || enemy.type === 'superboss' ? SPR.snowball.large
         : SPR.snowball.medium;
  }
  if (enemy.type === 'boss' || enemy.type === 'superboss') return SPR.blob.normal; // fallback, overridden in render
  const sheet = enemy.type === 'red' ? SPR.red : SPR.blob;
  return sheet[enemy.state] ?? sheet.normal;
}

// ── Boss sprite frames (badLevel10.png) ──────────────────────────
// Fila 1: y=105, h=171  |  Fila 2: y=369, h=195
const BOSS_ROW1_Y = 105, BOSS_ROW1_H = 171;
const BOSS_ROW2_Y = 369, BOSS_ROW2_H = 195;

export const BOSS_SPR = {
  idle:     { sx:  33, sy: BOSS_ROW1_Y, sw: 167, sh: BOSS_ROW1_H },  // main stance
  walk1:    { sx:  33, sy: BOSS_ROW1_Y, sw: 167, sh: BOSS_ROW1_H },
  walk2:    { sx: 280, sy: BOSS_ROW1_Y, sw: 123, sh: BOSS_ROW1_H },
  walk3:    { sx: 425, sy: BOSS_ROW1_Y, sw: 141, sh: BOSS_ROW1_H },
  hit1:     { sx:1167, sy: BOSS_ROW1_Y, sw: 201, sh: BOSS_ROW1_H },  // damaged 1
  hit2:     { sx:1413, sy: BOSS_ROW1_Y, sw: 154, sh: BOSS_ROW1_H },  // damaged 2
  attack:   { sx:  30, sy: BOSS_ROW2_Y, sw: 185, sh: BOSS_ROW2_H },  // melee
  icebreath:{ sx: 658, sy: BOSS_ROW2_Y, sw: 270, sh: BOSS_ROW2_H },  // ice breath
};

export function getBossFrame(enemy, tick) {
  if (enemy.state === 'snowed1') return BOSS_SPR.hit1;
  if (enemy.state === 'snowed2') return BOSS_SPR.hit2;
  // Ciclo de caminar/idle
  const cycle = [BOSS_SPR.walk1, BOSS_SPR.walk2, BOSS_SPR.walk3, BOSS_SPR.walk2];
  return cycle[Math.floor(tick / 10) % cycle.length];
}

// ── Superboss sprite (superBosh.png — imagen completa) ───────
export const SUPERBOSS_SPR = {
  idle:    { sx: 0, sy: 0, sw: 200, sh: 250 },
  walk1:   { sx: 0, sy: 0, sw: 200, sh: 250 },
  walk2:   { sx: 0, sy: 0, sw: 200, sh: 250 },
  hit:     { sx: 0, sy: 0, sw: 200, sh: 250 },
  attack:  { sx: 0, sy: 0, sw: 200, sh: 250 },
};

export function getSuperbossFrame(enemy, tick) {
  if (enemy.state === 'snowed1' || enemy.state === 'snowed2') return SUPERBOSS_SPR.hit;
  return SUPERBOSS_SPR.idle; // single frame for now
}
