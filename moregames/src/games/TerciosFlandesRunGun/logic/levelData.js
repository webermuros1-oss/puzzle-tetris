// ── Datos de nivel ─────────────────────────────────────────────────────────
// Coordenadas en píxeles del espacio lógico (480×270 base).
// Las plataformas son AABB: { x, y, w, h }
// Los enemigos: { type, x, y }  tipos: 'soldier' | 'gunner' | 'boss'
// TILE_SIZE = 32

export const TILE_SIZE = 32;
export const CANVAS_W  = 480;
export const CANVAS_H  = 270;
export const GROUND_Y  = 238; // Y donde empieza el suelo principal

// ── Nivel 1 ────────────────────────────────────────────────────────────────
export const LEVEL_1 = {
  width:  4800,
  height: CANVAS_H,
  bgColor: ['#a8c8f0', '#c8e0f8'],   // cielo Flandes

  // Plataformas y suelo
  platforms: [
    // Suelo principal continuo
    { x: 0,    y: GROUND_Y, w: 4800, h: 32 },

    // Plataformas elevadas – zona inicial
    { x: 300,  y: 190, w: 96,  h: 16 },
    { x: 500,  y: 155, w: 80,  h: 16 },
    { x: 700,  y: 175, w: 128, h: 16 },

    // Escalones centrales
    { x: 1100, y: 200, w: 96,  h: 16 },
    { x: 1300, y: 170, w: 96,  h: 16 },
    { x: 1500, y: 140, w: 96,  h: 16 },
    { x: 1700, y: 170, w: 96,  h: 16 },

    // Fortaleza media
    { x: 2100, y: 150, w: 200, h: 16 },
    { x: 2100, y: 190, w: 64,  h: 16 },
    { x: 2400, y: 150, w: 64,  h: 16 },

    // Pasarela alta
    { x: 2700, y: 120, w: 300, h: 16 },
    { x: 2700, y: 170, w: 80,  h: 16 },
    { x: 3050, y: 160, w: 80,  h: 16 },

    // Zona final
    { x: 3400, y: 190, w: 160, h: 16 },
    { x: 3700, y: 165, w: 128, h: 16 },
    { x: 4000, y: 140, w: 160, h: 16 },
    { x: 4200, y: 170, w: 128, h: 16 },
  ],

  // Decoraciones (solo visuales, sin colisión)
  decorations: [
    // Árboles
    { type: 'tree',   x: 80,   y: GROUND_Y - 60, w: 24, h: 60 },
    { type: 'tree',   x: 220,  y: GROUND_Y - 70, w: 24, h: 70 },
    { type: 'tree',   x: 850,  y: GROUND_Y - 65, w: 24, h: 65 },
    { type: 'tree',   x: 980,  y: GROUND_Y - 55, w: 24, h: 55 },
    { type: 'tree',   x: 2600, y: GROUND_Y - 75, w: 24, h: 75 },
    // Casas y torres
    { type: 'house',  x: 160,  y: GROUND_Y - 72, w: 64, h: 72 },
    { type: 'house',  x: 1850, y: GROUND_Y - 80, w: 80, h: 80 },
    { type: 'tower',  x: 2080, y: GROUND_Y - 120, w: 40, h: 120 },
    // Cañones en primer plano (usando sprite cañon.png)
    { type: 'cannon', x: 340,  y: GROUND_Y - 26, w: 52, h: 26 },
    { type: 'cannon', x: 1100, y: GROUND_Y - 26, w: 52, h: 26 },
    { type: 'cannon', x: 2200, y: GROUND_Y - 26, w: 52, h: 26 },
    { type: 'cannon', x: 3600, y: GROUND_Y - 26, w: 52, h: 26 },
    { type: 'cannon', x: 4300, y: GROUND_Y - 26, w: 52, h: 26 },
    // Barriles ambiente (usando sprite barril.png)
    { type: 'barrel', x: 460,  y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'barrel', x: 480,  y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'barrel', x: 1350, y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'barrel', x: 1370, y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'barrel', x: 2450, y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'barrel', x: 3200, y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'barrel', x: 3220, y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'barrel', x: 4150, y: GROUND_Y - 22, w: 18, h: 22 },
    { type: 'tower',   x: 2420, y: GROUND_Y - 120, w: 40, h: 120 },
    { type: 'cannon',  x: 1300, y: GROUND_Y - 24, w: 48, h: 24 },
    { type: 'cannon',  x: 3100, y: GROUND_Y - 24, w: 48, h: 24 },
  ],

  // Spawns de enemigos
  enemies: [
    { type: 'soldier', x: 400,  y: GROUND_Y - 32, patrolRange: 80 },
    { type: 'soldier', x: 650,  y: GROUND_Y - 32, patrolRange: 60 },
    { type: 'soldier', x: 900,  y: GROUND_Y - 32, patrolRange: 100 },
    { type: 'gunner',  x: 1200, y: GROUND_Y - 32, patrolRange: 0 },
    { type: 'soldier', x: 1400, y: 140,           patrolRange: 80 },
    { type: 'soldier', x: 1600, y: GROUND_Y - 32, patrolRange: 60 },
    { type: 'gunner',  x: 1900, y: GROUND_Y - 32, patrolRange: 0 },
    { type: 'soldier', x: 2200, y: 150 - 32,       patrolRange: 90 },
    { type: 'soldier', x: 2500, y: GROUND_Y - 32, patrolRange: 70 },
    { type: 'gunner',  x: 2750, y: 120 - 32,       patrolRange: 0 },
    { type: 'soldier', x: 3000, y: GROUND_Y - 32, patrolRange: 80 },
    { type: 'soldier', x: 3200, y: GROUND_Y - 32, patrolRange: 80 },
    { type: 'gunner',  x: 3500, y: GROUND_Y - 32, patrolRange: 0 },
    { type: 'soldier', x: 3800, y: 165 - 32,       patrolRange: 80 },
    { type: 'soldier', x: 4100, y: 140 - 32,       patrolRange: 80 },
    // Mini-boss al final
    { type: 'boss',    x: 4500, y: GROUND_Y - 64 },
  ],

  // Bandera de final de nivel
  flagX: 4700,

  // Prisioneros aliados a rescatar
  prisoners: [
    { x: 1100, y: GROUND_Y - 32 },
    { x: 2800, y: 120 - 32 },
    { x: 4050, y: 140 - 32 },
  ],
};

export const LEVELS = [LEVEL_1];
