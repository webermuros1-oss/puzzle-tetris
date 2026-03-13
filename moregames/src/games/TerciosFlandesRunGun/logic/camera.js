// ── Cámara ─────────────────────────────────────────────────────────────────
// Mantiene la vista centrada en el jugador, clampeada a los bordes del nivel.

export function createCamera() {
  return { x: 0, y: 0 };
}

/**
 * @param {Object} cam   - { x, y }
 * @param {Object} player
 * @param {number} levelW
 * @param {number} viewW - ancho lógico del canvas
 * @param {number} viewH - alto  lógico del canvas
 */
export function updateCamera(cam, player, levelW, viewW, viewH) {
  // Centrar horizontalmente en el jugador con margen de 1/3
  const targetX = player.x + player.w / 2 - viewW / 2;
  // Suavizado leve
  cam.x += (targetX - cam.x) * 0.12;
  // Clamp a límites del nivel
  cam.x = Math.max(0, Math.min(levelW - viewW, cam.x));
  cam.y = 0;
}
