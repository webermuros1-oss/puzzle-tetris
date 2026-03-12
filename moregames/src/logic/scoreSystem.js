// Puntuación por bloques colocados y líneas eliminadas

// Puntos base por bloque individual colocado
export const POINTS_PER_BLOCK = 1;

// Puntos por línea(s) eliminada(s) — escala cuadrática para recompensar combos
export const calculateScore = (linesCleared) => {
  if (linesCleared === 0) return 0;
  // 1 línea = 100, 2 = 400, 3 = 900, 4+ = 1600...
  return linesCleared * linesCleared * 100;
};

// Devuelve el texto del multiplicador mostrado al usuario
export const getComboText = (linesCleared) => {
  if (linesCleared >= 4) return '🔥 MEGA COMBO!';
  if (linesCleared === 3) return '⚡ TRIPLE!';
  if (linesCleared === 2) return '✨ DOBLE!';
  if (linesCleared === 1) return '👍 Línea!';
  return '';
};
