import Cell from './Cell';
import { BOARD_SIZE } from '../logic/boardUtils';

// Tablero principal 8x8
const Board = ({ board, boardRef, hoverCell, dragPiece, isValidPlacement }) => {
  // Calcular qué celdas forman parte del preview de colocación
  const previewCells = new Set();

  if (hoverCell && dragPiece) {
    for (let r = 0; r < dragPiece.shape.length; r++) {
      for (let c = 0; c < dragPiece.shape[r].length; c++) {
        if (dragPiece.shape[r][c]) {
          const row = hoverCell.row + r;
          const col = hoverCell.col + c;
          if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            previewCells.add(`${row}-${col}`);
          }
        }
      }
    }
  }

  return (
    <div className="board" ref={boardRef}>
      {board.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          const key = `${rIdx}-${cIdx}`;
          const isPreview = previewCells.has(key);
          return (
            <Cell
              key={key}
              color={cell}
              isPreview={isPreview}
              isValid={isValidPlacement}
              previewColor={dragPiece?.color}
            />
          );
        })
      )}
    </div>
  );
};

export default Board;
