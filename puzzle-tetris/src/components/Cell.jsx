/**
 * Cell — celda individual del tablero 8×8
 *
 * Diseño: la celda es un slot cuadrado oscuro (la cuadrícula del tablero).
 * Dentro lleva un círculo "dot" centrado al 82% del tamaño de la celda.
 * Esto da el efecto de fichas redondas flotando en una rejilla oscura,
 * similar a los block-puzzles móviles (1010!, Blockudoku).
 *
 * Props:
 *  color        — color hex de la ficha colocada (null = vacía)
 *  isPreview    — la pieza arrastrada pasaría por aquí
 *  isValid      — si ese preview es una posición válida
 *  previewColor — color de la pieza en arrastre
 *  isClearing   — la celda está en medio de la animación de eliminación
 */
const Cell = ({ color, isPreview, isValid, previewColor, isClearing }) => {
  return (
    <div className="cell">
      {/* Ficha colocada */}
      {color && (
        <div
          className={`cell-dot${isClearing ? ' cell-dot--clearing' : ''}`}
          style={{ '--dot-color': color }}
        />
      )}

      {/* Preview de colocación (solo cuando la celda está vacía) */}
      {!color && isPreview && (
        <div
          className={`cell-dot cell-dot--preview${
            isValid ? ' cell-dot--preview-valid' : ' cell-dot--preview-invalid'
          }`}
          style={{ '--dot-color': isValid ? previewColor : '#ef4444' }}
        />
      )}
    </div>
  );
};

export default Cell;
