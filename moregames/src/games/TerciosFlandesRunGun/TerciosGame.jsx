import { useState, useCallback, useRef } from 'react';
import TerciosCanvas from './TerciosCanvas.jsx';
import './styles/tercios.css';

export default function TerciosGame({ onBack }) {
  const [screen, setScreen] = useState('menu'); // menu | playing | gameover | win
  const [score,  setScore]  = useState(0);
  const [lives,  setLives]  = useState(3);
  const livesRef = useRef(3);

  const handleScore = useCallback((s) => setScore(s), []);

  const handleDie = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      setScreen('gameover');
    } else {
      // Reiniciar el canvas con una vida menos
      setScreen('respawn');
      setTimeout(() => setScreen('playing'), 50);
    }
  }, []);

  const handleWin = useCallback(() => {
    setScreen('win');
  }, []);

  const startGame = () => {
    livesRef.current = 3;
    setLives(3);
    setScore(0);
    setScreen('playing');
  };

  // ── Menú ──────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <div className="tercios-menu">
        <button className="tercios-back-btn" onClick={onBack}>← Volver</button>
        <div className="tercios-title-block">
          <div className="tercios-title">⚔️ TERCIOS EN FLANDES</div>
          <div className="tercios-subtitle">Run &amp; Gun — Siglo XVII</div>
        </div>
        <div className="tercios-controls-info">
          <p><kbd>A/D</kbd> o <kbd>←/→</kbd> — Moverse</p>
          <p><kbd>W</kbd> / <kbd>Space</kbd> — Saltar</p>
          <p><kbd>J</kbd> / <kbd>Z</kbd> — Disparar mosquete</p>
          <p><kbd>K</kbd> / <kbd>X</kbd> — Lanzar granada</p>
        </div>
        <button className="tercios-start-btn" onClick={startGame}>
          ¡A la batalla!
        </button>
      </div>
    );
  }

  // ── Game Over ──────────────────────────────────────────────────────
  if (screen === 'gameover') {
    return (
      <div className="tercios-menu tercios-gameover">
        <div className="tercios-title">💀 RETIRADA</div>
        <div className="tercios-subtitle">El Tercio ha sido derrotado</div>
        <div className="tercios-score-display">Puntuación: {score.toLocaleString()}</div>
        <button className="tercios-start-btn" onClick={startGame}>Reagrupar tropas</button>
        <button className="tercios-back-btn-center" onClick={onBack}>Volver al menú</button>
      </div>
    );
  }

  // ── Victoria ───────────────────────────────────────────────────────
  if (screen === 'win') {
    return (
      <div className="tercios-menu tercios-win">
        <div className="tercios-title">🏆 ¡VICTORIA!</div>
        <div className="tercios-subtitle">¡Los Tercios dominan Flandes!</div>
        <div className="tercios-score-display">Puntuación: {score.toLocaleString()}</div>
        <button className="tercios-start-btn" onClick={startGame}>Nueva campaña</button>
        <button className="tercios-back-btn-center" onClick={onBack}>Volver al menú</button>
      </div>
    );
  }

  // ── Jugando ────────────────────────────────────────────────────────
  return (
    <div className="tercios-game-screen">
      {/* HUD */}
      <div className="tercios-hud">
        <div className="tercios-hud-lives">
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} className="tercios-heart">⚔️</span>
          ))}
        </div>
        <div className="tercios-hud-title">TERCIOS EN FLANDES</div>
        <div className="tercios-hud-score">{score.toLocaleString()} pts</div>
      </div>

      {/* Canvas del juego */}
      {screen === 'playing' && (
        <TerciosCanvas
          onScore={handleScore}
          onDie={handleDie}
          onWin={handleWin}
          paused={false}
        />
      )}

      <button className="tercios-hud-back" onClick={onBack}>✕</button>
    </div>
  );
}
