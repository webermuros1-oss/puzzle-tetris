/**
 * DragGhost — pieza fantasma que sigue el cursor al arrastrar.
 *
 * Usa la prop `cellSize` para igualar exactamente el tamaño de las
 * celdas del tablero: así el ghost encaja 1:1 al soltar la pieza.
 */
const GAP = 2;

const DragGhost = ({ piece, x, y, cellSize = 56 }) => {
  if (!piece) return null;

  const cols = Math.max(...piece.shape.map((row) => row.length));
  const rows = piece.shape.length;

  // Centrar el ghost bajo el cursor
  const offsetX = (cols * (cellSize + GAP)) / 2;
  const offsetY = (rows * (cellSize + GAP)) / 2;

  return (
    <div
      style={{
        position: 'fixed',
        left: x - offsetX,
        top: y - offsetY,
        pointerEvents: 'none',
        zIndex: 9999,
        // Ligero aumento de escala + glow del color de la pieza
        transform: 'scale(1.06)',
        transformOrigin: 'center center',
        filter: `drop-shadow(0 0 10px ${piece.color}) drop-shadow(0 6px 18px rgba(0,0,0,0.7))`,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gap: `${GAP}px`,
        }}
      >
        {piece.shape.map((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div key={`${rIdx}-${cIdx}`} className="piece-cell-slot">
              {cell ? (
                <div
                  className="cell-dot"
                  style={{ '--dot-color': piece.color, width: '100%', height: '100%' }}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DragGhost;
