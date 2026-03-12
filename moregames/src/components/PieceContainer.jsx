import Piece from './Piece';

// Panel inferior con las 3 piezas disponibles para colocar
const PieceContainer = ({ pieces, onDragStart, isDragging }) => {
  return (
    <div className="piece-container">
      {pieces.map((piece, index) => (
        <div key={index} className="piece-slot">
          <Piece
            piece={piece}
            onDragStart={(e) => piece && onDragStart(piece, index, e)}
            disabled={isDragging || !piece}
          />
        </div>
      ))}
    </div>
  );
};

export default PieceContainer;
