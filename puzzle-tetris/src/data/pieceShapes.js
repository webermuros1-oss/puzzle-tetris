// Paleta neón vibrante — cada color brilla bien sobre el fondo oscuro
export const PIECE_COLORS = [
  '#22d3ee', // cian eléctrico
  '#a855f7', // morado neón
  '#84cc16', // lima neón
  '#f97316', // naranja fuego
  '#ec4899', // rosa hot
  '#eab308', // amarillo dorado
  '#10b981', // esmeralda
  '#f43f5e', // rojo carmesí
  '#6366f1', // índigo
  '#14b8a6', // teal
];

// Todas las formas de piezas posibles (matrices 2D: 1=bloque, 0=vacío)
export const PIECE_SHAPES = [
  // 1x1
  [[1]],

  // 1x2 horizontal
  [[1, 1]],

  // 2x1 vertical
  [[1], [1]],

  // 1x3 horizontal
  [[1, 1, 1]],

  // 3x1 vertical
  [[1], [1], [1]],

  // 1x4 horizontal
  [[1, 1, 1, 1]],

  // 4x1 vertical
  [[1], [1], [1], [1]],

  // 2x2 cuadrado
  [
    [1, 1],
    [1, 1],
  ],

  // 3x3 cuadrado
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],

  // L forma
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],

  // L forma espejo
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],

  // L forma rotada
  [
    [1, 1, 1],
    [1, 0, 0],
  ],

  // L forma rotada espejo
  [
    [1, 1, 1],
    [0, 0, 1],
  ],

  // T forma
  [
    [1, 1, 1],
    [0, 1, 0],
  ],

  // T forma invertida
  [
    [0, 1, 0],
    [1, 1, 1],
  ],

  // S forma
  [
    [0, 1, 1],
    [1, 1, 0],
  ],

  // Z forma
  [
    [1, 1, 0],
    [0, 1, 1],
  ],

  // Esquina 2x2
  [
    [1, 1],
    [1, 0],
  ],

  // Esquina 2x2 espejo
  [
    [1, 1],
    [0, 1],
  ],

  // Cruz / Plus
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
];
