// Colores disponibles para las piezas
export const PIECE_COLORS = [
  '#FF6B6B', // rojo coral
  '#4ECDC4', // turquesa
  '#45B7D1', // azul cielo
  '#96CEB4', // verde menta
  '#FFEAA7', // amarillo suave
  '#DDA0DD', // ciruela
  '#98FB98', // verde pálido
  '#F0A500', // naranja
  '#A78BFA', // violeta
  '#F87171', // rojo suave
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
