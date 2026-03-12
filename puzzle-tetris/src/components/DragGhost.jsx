// Tamaño de bloque del fantasma que sigue al cursor
const GHOST_CELL = 38;
const GAP = 2;

// Pieza "fantasma" que flota junto al cursor durante el arrastre
const DragGhost = ({ piece, x, y }) => {
  if (!piece) return null;

  const cols = Math.max(...piece.shape.map((row) => row.length));
  // Offset para que el cursor quede en el centro superior de la pieza
  const offsetX = (cols * (GHOST_CELL + GAP)) / 2;

  return (
    <div
      style={{
        position: 'fixed',
        left: x - offsetX,
        top: y - GHOST_CELL / 2,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0.85,
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        transform: 'scale(1.05)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${GHOST_CELL}px)`,
          gridTemplateRows: `repeat(${piece.shape.length}, ${GHOST_CELL}px)`,
          gap: `${GAP}px`,
        }}
      >
        {piece.shape.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              style={{
                width: GHOST_CELL,
                height: GHOST_CELL,
                backgroundColor: cell ? piece.color : 'transparent',
                borderRadius: cell ? 8 : 0,
                boxShadow: cell
                  ? `inset 0 3px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.3)`
                  : 'none',
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DragGhost;
