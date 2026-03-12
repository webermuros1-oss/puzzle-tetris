/**
 * Piece — pieza arrastrable del panel inferior
 *
 * Cada bloque de la pieza se renderiza como un círculo (border-radius 50%)
 * centrado dentro de su celda, igual que en el tablero, para coherencia visual.
 * El tamaño CELL_SIZE debe ser comparable al de las celdas del tablero.
 */
const CELL_SIZE = 32; // px por bloque — un poco más pequeño que el tablero
const GAP = 3;        // separación entre bloques en el panel

const Piece = ({ piece, onDragStart, disabled }) => {
  if (!piece) {
    return <div className="piece-slot-empty" />;
  }

  const cols = Math.max(...piece.shape.map((row) => row.length));

  const handleMouseDown = (e) => {
    if (!disabled) {
      e.preventDefault();
      onDragStart(e);
    }
  };

  return (
    <div
      className={`piece-wrapper${disabled ? ' piece-wrapper--disabled' : ''}`}
      onMouseDown={handleMouseDown}
      style={{ cursor: disabled ? 'default' : 'grab' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${piece.shape.length}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
        }}
      >
        {piece.shape.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            /* Celda contenedora — transparente si no hay bloque */
            <div key={`${rIdx}-${cIdx}`} className="piece-cell-slot">
              {cell ? (
                /* Círculo neón: usa CSS variable --dot-color igual que en el tablero */
                <div
                  className="cell-dot"
                  style={{
                    '--dot-color': piece.color,
                    width: '100%',
                    height: '100%',
                  }}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Piece;
