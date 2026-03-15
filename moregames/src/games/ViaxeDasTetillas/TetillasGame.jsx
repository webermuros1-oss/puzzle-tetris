import { useState, useCallback, useRef } from 'react';
import TetillasCanvas from './TetillasCanvas.jsx';
import { TOTAL_LEVELS } from './logic/levelData.js';
import './styles/tetillas.css';

export default function TetillasGame({ onBack }) {
  const [screen,     setScreen]     = useState('menu');
  const [score,      setScore]      = useState(0);
  const [lives,      setLives]      = useState(3);
  const [levelIndex, setLevelIndex] = useState(0);

  // Refs para evitar stale closures en los callbacks del canvas
  const livesRef = useRef(3);
  const levelRef = useRef(0);

  const handleScore = useCallback((s) => setScore(s), []);

  const handleDie = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      setScreen('gameover');
    } else {
      // Respawn: remontar el canvas con una pequeña pausa
      setScreen('respawn');
      setTimeout(() => setScreen('playing'), 80);
    }
  }, []);

  const handleWin = useCallback(() => {
    const next = levelRef.current + 1;
    if (next < TOTAL_LEVELS) {
      levelRef.current = next;
      setLevelIndex(next);
      setScreen('respawn');
      setTimeout(() => setScreen('playing'), 80);
    } else {
      setScreen('win');
    }
  }, []);

  const startGame = () => {
    livesRef.current = 3;
    levelRef.current = 0;
    setLives(3);
    setScore(0);
    setLevelIndex(0);
    setScreen('playing');
  };

  // ── Menú ──────────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <div className="tt-menu">
        <button className="tt-back-btn" onClick={onBack}>← Volver</button>

        <div className="tt-title-block">
          <div className="tt-game-title">O VIAXE DAS TETILLAS</div>
          <div className="tt-game-subtitle">Pang galego · Estilo Arcade</div>
        </div>

        <div className="tt-controls-info">
          <p><kbd>A / ←</kbd> <kbd>D / →</kbd> — Moverse</p>
          <p><kbd>Space / J</kbd> — Disparar mexillón</p>
          <p>Rompe todas as tetillas para avanzar</p>
        </div>

        <button className="tt-start-btn" onClick={startGame}>
          ¡Comezar a viaxe!
        </button>
      </div>
    );
  }

  // ── Game Over ─────────────────────────────────────────────────────────
  if (screen === 'gameover') {
    return (
      <div className="tt-menu tt-gameover">
        <div className="tt-game-title">💀 DERROTA</div>
        <div className="tt-game-subtitle">As tetillas teñen gañado…</div>
        <div className="tt-score-display">{score.toLocaleString()} pts</div>
        <button className="tt-start-btn" onClick={startGame}>Intentar de novo</button>
        <button className="tt-back-btn-center" onClick={onBack}>Volver al menú</button>
      </div>
    );
  }

  // ── Victoria ──────────────────────────────────────────────────────────
  if (screen === 'win') {
    return (
      <div className="tt-menu tt-win">
        <div className="tt-game-title">🏆 ¡VITORIA!</div>
        <div className="tt-game-subtitle">¡Todas as tetillas derrotadas!</div>
        <div className="tt-score-display">{score.toLocaleString()} pts</div>
        <button className="tt-start-btn" onClick={startGame}>Xogar de novo</button>
        <button className="tt-back-btn-center" onClick={onBack}>Volver al menú</button>
      </div>
    );
  }

  // ── Pantalla de juego ─────────────────────────────────────────────────
  return (
    <div className="tt-game-screen">
      {/* HUD superior */}
      <div className="tt-hud">
        <div className="tt-hud-lives">
          {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
            <span key={i} className="tt-heart">🐚</span>
          ))}
        </div>
        <div className="tt-hud-level">NIVEL {levelIndex + 1}</div>
        <div className="tt-hud-score">{score.toLocaleString()} pts</div>
      </div>

      {/* Canvas del juego (solo cuando screen === 'playing') */}
      {screen === 'playing' && (
        <TetillasCanvas
          key={`${levelIndex}-${lives}`}   // remonta al morir o pasar nivel
          levelIndex={levelIndex}
          onScore={handleScore}
          onDie={handleDie}
          onWin={handleWin}
          paused={false}
        />
      )}

      <button className="tt-hud-back" onClick={onBack}>✕</button>
    </div>
  );
}
