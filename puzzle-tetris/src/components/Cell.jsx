// Representa una celda individual del tablero 8x8
const Cell = ({ color, isPreview, isValid, previewColor }) => {
  let bgColor = 'transparent';

  if (color) {
    bgColor = color; // Celda ocupada con su color
  } else if (isPreview) {
    // Mostrar preview: verde translúcido si válido, rojo si no
    bgColor = isValid ? previewColor + 'BB' : '#EF444488';
  }

  return (
    <div
      className={`cell${color ? ' cell--filled' : ''}${isPreview ? (isValid ? ' cell--preview-valid' : ' cell--preview-invalid') : ''}`}
      style={{ backgroundColor: bgColor }}
    />
  );
};

export default Cell;
