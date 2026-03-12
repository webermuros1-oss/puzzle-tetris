import { PIECE_SHAPES, PIECE_COLORS } from '../data/pieceShapes';

let pieceIdCounter = 0;

// Genera una pieza aleatoria con forma y color únicos
export const generateRandomPiece = () => {
  const shape = PIECE_SHAPES[Math.floor(Math.random() * PIECE_SHAPES.length)];
  const color = PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
  return {
    id: `piece-${++pieceIdCounter}`,
    shape,
    color,
  };
};

// Genera el conjunto de 3 piezas nuevas para cada ronda
export const generateThreePieces = () => [
  generateRandomPiece(),
  generateRandomPiece(),
  generateRandomPiece(),
];
