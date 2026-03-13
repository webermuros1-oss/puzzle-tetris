import { useState, useRef, useCallback, useEffect } from 'react';
import GameCanvas from './GameCanvas.jsx';
import HUD        from './HUD.jsx';
import { LEVELS } from './logic/levelData.js';
import { startMusic, stopMusic } from './logic/soundManager.js';
import './styles/snowbros.css';

export default function SnowBrosGame({ onBack }) {
  const [level,   setLevel]   = useState(0);
  const [score,   setScore]   = useState(0);
  const [lives,   setLives]   = useState(3);
  const [screen,  setScreen]  = useState('ready');
  const [gameKey, setGameKey] = useState(0);
  const canvasRef = useRef(null);

  const handleLevelClear = useCallback(() => {
    const next = level + 1;
    if (next >= LEVELS.length) { stopMusic(); setScreen('win'); }
    else { setLevel(next); } // screen stays 'playing', music continues
  }, [level]);

  useEffect(() => {
    if (screen === 'playing') startMusic();
    else stopMusic();
    return () => {};
  }, [screen]);

  const handleGameOver = useCallback(() => setScreen('over'), []);

  // Botones táctiles
  const press   = (key) => canvasRef.current?._virtualKey?.(key, true);
  const release = (key) => canvasRef.current?._virtualKey?.(key, false);
  const btn = (key) => ({
    onPointerDown:   (e) => { e.preventDefault(); press(key);   },
    onPointerUp:     (e) => { e.preventDefault(); release(key); },
    onPointerLeave:  (e) => { e.preventDefault(); release(key); },
    onPointerCancel: (e) => { e.preventDefault(); release(key); },
  });

  const startGame = () => {
    setScore(0); setLives(3); setLevel(0);
    setGameKey(k => k + 1);
    setScreen('ready');
  };
  const nextLevel = () => setScreen('playing');

  const isBoss = LEVELS[level]?.isBossLevel;

  return (
    <div className="snow-wrapper">

      {/* ── Top bar ── */}
      <div className="snow-topbar">
        <button className="snow-back-btn" onClick={onBack}>← VOLVER</button>
        <span className="snow-title-small">❄ SNOW BROS</span>
        <HUD score={score} lives={lives} level={level} inline />
      </div>

      {/* ── Área de juego: canvas + controles lado a lado en landscape ── */}
      <div className="snow-game-area">

        {/* Controles izquierda (D-pad) */}
        <div className="snow-side-controls snow-left-pad">
          <button className="snow-btn dpad-btn left-btn"  {...btn('left')}>◀</button>
          <button className="snow-btn dpad-btn right-btn" {...btn('right')}>▶</button>
        </div>

        {/* Canvas */}
        <div className="snow-canvas-wrap" ref={(el) => {
          if (el) canvasRef.current = el.querySelector('canvas');
        }}>
          <GameCanvas
            key={gameKey}
            levelIndex={level}
            paused={screen !== 'playing'}
            onScoreChange={setScore}
            onLivesChange={setLives}
            onLevelClear={handleLevelClear}
            onGameOver={handleGameOver}
          />

          {screen === 'ready' && (
            <div className="snow-overlay">
              <div className={`snow-overlay-box${isBoss ? ' boss-stage' : ''}`}>
                {isBoss && <p className="snow-overlay-title gold">♛ BOSS STAGE ♛</p>}
                <p className="snow-overlay-level">LEVEL {level + 1}</p>
                <p className="snow-overlay-sub">
                  {isBoss ? '¡Cuidado! ¡El Super Jefe te espera!' : '¡A por los monstruos!'}
                </p>
                <button className="snow-overlay-btn" onClick={nextLevel}>▶ READY!</button>
              </div>
            </div>
          )}
          {screen === 'over' && (
            <div className="snow-overlay">
              <div className="snow-overlay-box">
                <p className="snow-overlay-title red">GAME OVER</p>
                <p className="snow-overlay-sub">Puntuación: {String(score).padStart(6,'0')}</p>
                <button className="snow-overlay-btn" onClick={startGame}>↺ REINTENTAR</button>
                <button className="snow-overlay-btn secondary" onClick={onBack}>← MENÚ</button>
              </div>
            </div>
          )}
          {screen === 'win' && (
            <div className="snow-overlay">
              <div className="snow-overlay-box">
                <p className="snow-overlay-title gold">¡GANASTE!</p>
                <p className="snow-overlay-sub">Puntuación: {String(score).padStart(6,'0')}</p>
                <button className="snow-overlay-btn" onClick={startGame}>↺ JUGAR DE NUEVO</button>
                <button className="snow-overlay-btn secondary" onClick={onBack}>← MENÚ</button>
              </div>
            </div>
          )}
        </div>

        {/* Controles derecha (acción) */}
        <div className="snow-side-controls snow-right-pad">
          <button className="snow-btn action-btn jump-btn"  {...btn('jump')}>▲<span>SALTO</span></button>
          <button className="snow-btn action-btn shoot-btn" {...btn('shoot')}>❄<span>NIEVE</span></button>
        </div>
      </div>

      {/* ── Controles inferiores (portrait) ── */}
      <div className="snow-bottom-controls">
        <div className="snow-dpad-row">
          <button className="snow-btn dpad-btn left-btn"  {...btn('left')}>◀</button>
          <button className="snow-btn dpad-btn right-btn" {...btn('right')}>▶</button>
        </div>
        <div className="snow-action-row">
          <button className="snow-btn action-btn jump-btn"  {...btn('jump')}>▲<span>SALTO</span></button>
          <button className="snow-btn action-btn shoot-btn" {...btn('shoot')}>❄<span>NIEVE</span></button>
        </div>
      </div>

    </div>
  );
}
