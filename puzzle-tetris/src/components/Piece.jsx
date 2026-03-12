// Tamaño de cada bloque dentro del panel de piezas disponibles
const CELL_SIZE = 30;
const GAP = 2;

// Renderiza una pieza arrastrable en el panel inferior
const Piece = ({ piece, onDragStart, disabled }) => {
  if (!piece) {
    // Espacio vacío donde ya se usó la pieza
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
      style={{ cursor: disabled ? 'not-allowed' : 'grab' }}
    >
      <div
        className="piece-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${piece.shape.length}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
        }}
      >
        {piece.shape.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: cell ? piece.color : 'transparent',
                borderRadius: cell ? 6 : 0,
                boxShadow: cell ? `inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.2)` : 'none',
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Piece;
