const CELL_SIZE = 32;
const GAP = 3;

const Piece = ({ piece, onDragStart, disabled }) => {
  if (!piece) {
    return <div className="piece-slot-empty" />;
  }

  const cols = Math.max(...piece.shape.map((row) => row.length));

  // Soporta ratón y touch
  const handleStart = (e) => {
    if (!disabled) {
      e.preventDefault();
      onDragStart(e);
    }
  };

  return (
    <div
      className={`piece-wrapper${disabled ? ' piece-wrapper--disabled' : ''}`}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      style={{ cursor: disabled ? 'default' : 'grab', touchAction: 'none' }}
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
            <div key={`${rIdx}-${cIdx}`} className="piece-cell-slot">
              {cell ? (
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
