export const BOARD_SIZE = 8;

// Crea un tablero vacío de 8x8 (null = celda libre)
export const createEmptyBoard = () =>
  Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

// Comprueba si una pieza cabe en la posición (row, col) del tablero
export const canPlacePiece = (board, piece, row, col) => {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        const newRow = row + r;
        const newCol = col + c;
        // Fuera de límites
        if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE)
          return false;
        // Celda ocupada
        if (board[newRow][newCol] !== null) return false;
      }
    }
  }
  return true;
};

// Coloca la pieza en el tablero y devuelve el nuevo tablero (inmutable)
export const placePiece = (board, piece, row, col) => {
  const newBoard = board.map((r) => [...r]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        newBoard[row + r][col + c] = piece.color;
      }
    }
  }
  return newBoard;
};

// Detecta filas y columnas completas, las elimina y devuelve el tablero limpio
export const clearLines = (board) => {
  const newBoard = board.map((r) => [...r]);
  let linesCleared = 0;

  // Detectar filas completas
  const completedRows = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (newBoard[r].every((cell) => cell !== null)) {
      completedRows.push(r);
    }
  }

  // Detectar columnas completas
  const completedCols = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (newBoard.every((row) => row[c] !== null)) {
      completedCols.push(c);
    }
  }

  linesCleared = completedRows.length + completedCols.length;

  // Limpiar filas completas
  completedRows.forEach((r) => {
    newBoard[r] = Array(BOARD_SIZE).fill(null);
  });

  // Limpiar columnas completas
  completedCols.forEach((c) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      newBoard[r][c] = null;
    }
  });

  return { newBoard, linesCleared };
};

// Devuelve el Set de claves "row-col" de las celdas que se eliminarán
// (usado para la animación de flash antes de limpiar el tablero)
export const getLinesToClear = (board) => {
  const cells = new Set();
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) {
      for (let c = 0; c < BOARD_SIZE; c++) cells.add(`${r}-${c}`);
    }
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board.every((row) => row[c] !== null)) {
      for (let r = 0; r < BOARD_SIZE; r++) cells.add(`${r}-${c}`);
    }
  }
  return cells;
};

// Comprueba si alguna pieza disponible tiene al menos un movimiento válido
export const hasAnyValidMove = (board, pieces) => {
  return pieces.some((piece) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (canPlacePiece(board, piece, r, c)) return true;
      }
    }
    return false;
  });
};
