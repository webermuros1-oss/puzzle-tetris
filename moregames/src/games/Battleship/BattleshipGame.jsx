import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BOARD_SIZE, COLS, ROWS, SHIPS,
  createEmptyBoard, canPlace, placeShip, previewCells,
  randomFleet, processShot, allSunk, shipCells, aiTarget,
} from './logic/battleshipLogic';
import './styles/battleship.css';

// ── Missile component ─────────────────────────────────────────────────────
const Missile = ({ missile }) => {
  if (!missile) return null;
  return (
    <div
      className="bs-missile"
      key={missile.id}
      style={{
        left: missile.fx,
        top:  missile.fy,
        '--angle': `${missile.angle}deg`,
        '--dist':  `${missile.dist}px`,
      }}
    />
  );
};

// ── Ship art renderer ─────────────────────────────────────────────────────
// Draws a ship spanning multiple grid cells as an absolutely-positioned element.
// parent grid must have position:relative and known cell size.
const ShipArt = ({ ship, row, col, horiz, cellSize, sunk, hit }) => {
  const size  = ship.size;
  const w     = horiz ? cellSize * size - 4 : cellSize - 6;
  const h     = horiz ? cellSize - 6        : cellSize * size - 4;
  const left  = col * cellSize + 3;
  const top   = row * cellSize + 3;

  return (
    <div
      className={`bs-ship-art bs-ship-art--${ship.id}${sunk ? ' bs-ship-art--sunk' : ''}`}
      style={{
        left, top, width: w, height: h,
        '--ship-color': ship.color,
        '--ship-w': `${w}px`,
        '--ship-h': `${h}px`,
      }}
    >
      {/* Conning tower / superstructure */}
      <div className="bs-ship-tower" />
      {/* Fire on hit ships */}
      {hit && !sunk && <div className="bs-ship-fire">🔥</div>}
      {sunk && <div className="bs-ship-sunk-x">✕</div>}
    </div>
  );
};

// ── Main game component ───────────────────────────────────────────────────
export default function BattleshipGame({ onBack }) {
  // Game phases: 'placement' | 'battle' | 'over'
  const [phase, setPhase]         = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(() => createEmptyBoard());
  const [enemyBoard]              = useState(() => randomFleet());
  const [playerShots, setPlayerShots] = useState({});  // shots on enemy
  const [aiShots, setAiShots]         = useState({});  // shots on player
  const [playerSunk, setPlayerSunk]   = useState(new Set());
  const [enemySunk, setEnemySunk]     = useState(new Set());

  // Placement state
  const [shipIdx,  setShipIdx]  = useState(0);
  const [horiz,    setHoriz]    = useState(true);
  const [hover,    setHover]    = useState(null);  // { row, col }

  // Battle state
  const [playerTurn, setPlayerTurn] = useState(true);
  const [animating,  setAnimating]  = useState(false);
  const [aiHits,     setAiHits]     = useState([]);    // coords of live AI hits
  const [winner,     setWinner]     = useState(null);

  // Visual effects
  const [explosions, setExplosions] = useState([]);  // [{ id, row, col, type, board }]
  const [missile,    setMissile]    = useState(null);
  const [toast,      setToast]      = useState('');
  const [toastKey,   setToastKey]   = useState(0);
  const [score,      setScore]      = useState(0);

  // Refs for computing missile positions
  const playerGridRef = useRef(null);
  const enemyGridRef  = useRef(null);
  const cellSizeRef   = useRef(36);

  // Measure cell size on mount and resize
  useEffect(() => {
    const measure = () => {
      if (playerGridRef.current)
        cellSizeRef.current = playerGridRef.current.getBoundingClientRect().width / BOARD_SIZE;
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setToastKey(k => k + 1);
  }, []);

  const addExplosion = useCallback((row, col, type, board, delay = 0) => {
    const id = `${Date.now()}-${Math.random()}`;
    setTimeout(() => {
      setExplosions(p => [...p, { id, row, col, type, board }]);
      setTimeout(() => setExplosions(p => p.filter(e => e.id !== id)), 900);
    }, delay);
  }, []);

  const launchMissile = useCallback((fromRef, toRef, toRow, toCol) => {
    if (!fromRef.current || !toRef.current) return;
    const fRect = fromRef.current.getBoundingClientRect();
    const tRect = toRef.current.getBoundingClientRect();
    const cs    = tRect.width / BOARD_SIZE;

    const fx = fRect.left + fRect.width  / 2;
    const fy = fRect.top  + fRect.height / 2;
    const tx = tRect.left + toCol * cs + cs / 2;
    const ty = tRect.top  + toRow * cs + cs / 2;

    const dx    = tx - fx, dy = ty - fy;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    const id    = Date.now();

    setMissile({ id, fx, fy, angle, dist });
    setTimeout(() => setMissile(m => m?.id === id ? null : m), 520);
  }, []);

  // ── Placement ──────────────────────────────────────────────────────────
  const currentShip  = SHIPS[shipIdx];
  const allPlaced    = shipIdx >= SHIPS.length;

  const handlePlaceClick = (row, col) => {
    if (allPlaced) return;
    if (!canPlace(playerBoard, row, col, currentShip.size, horiz)) return;
    const nb = placeShip(playerBoard, row, col, currentShip.size, horiz, currentShip.id);
    setPlayerBoard(nb);
    const next = shipIdx + 1;
    setShipIdx(next);
    if (next >= SHIPS.length) showToast('¡Flota lista! Pulsa Iniciar Batalla');
  };

  const handleAutoPlace = () => {
    setPlayerBoard(randomFleet());
    setShipIdx(SHIPS.length);
    showToast('Flota colocada automáticamente');
  };

  // ── Player fires ───────────────────────────────────────────────────────
  const handleEnemyClick = useCallback((row, col) => {
    if (!playerTurn || animating || phase !== 'battle') return;
    if (playerShots[`${row}-${col}`]) return;

    setAnimating(true);
    launchMissile(playerGridRef, enemyGridRef, row, col);

    setTimeout(() => {
      const result    = processShot(enemyBoard, playerShots, row, col);
      const key       = `${row}-${col}`;
      const newShots  = { ...playerShots, [key]: result.hit ? 'hit' : 'miss' };
      setPlayerShots(newShots);
      addExplosion(row, col, result.hit ? 'hit' : 'miss', 'enemy');

      let newEnemySunk = enemySunk;
      if (result.sunk) {
        newEnemySunk = new Set([...enemySunk, result.shipId]);
        setEnemySunk(newEnemySunk);
        setScore(s => s + 500);
        showToast(`💥 ¡Hundiste el ${SHIPS.find(s => s.id === result.shipId)?.name}!`);
      } else if (result.hit) {
        setScore(s => s + 100);
        showToast('🎯 ¡Impacto directo!');
      } else {
        showToast('💧 Agua — turno del enemigo');
      }

      if (allSunk(enemyBoard, newShots)) {
        setWinner('player'); setPhase('over'); setAnimating(false); return;
      }

      if (result.hit) {
        // Keep player's turn on hit
        setAnimating(false);
      } else {
        setPlayerTurn(false);
        // Pass current state as closure args to avoid stale refs
        setTimeout(() => doAiTurn(newShots, aiShots, aiHits, newEnemySunk), 1100);
      }
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerTurn, animating, phase, playerShots, enemyBoard, enemySunk, aiShots, aiHits]);

  // ── AI fires ───────────────────────────────────────────────────────────
  const doAiTurn = useCallback((currentPlayerShots, currentAiShots, currentAiHits) => {
    const target = aiTarget(currentAiShots, currentAiHits);
    if (!target) { setAnimating(false); setPlayerTurn(true); return; }

    const { row, col } = target;
    launchMissile(enemyGridRef, playerGridRef, row, col);

    setTimeout(() => {
      const result   = processShot(playerBoard, currentAiShots, row, col);
      const key      = `${row}-${col}`;
      const newAi    = { ...currentAiShots, [key]: result.hit ? 'hit' : 'miss' };
      setAiShots(newAi);
      addExplosion(row, col, result.hit ? 'hit' : 'miss', 'player');

      let newHits = currentAiHits;
      if (result.hit) {
        if (result.sunk) {
          newHits = [];
          setPlayerSunk(p => new Set([...p, result.shipId]));
          showToast(`💔 ¡Hundieron tu ${SHIPS.find(s => s.id === result.shipId)?.name}!`);
        } else {
          newHits = [...currentAiHits, [row, col]];
          showToast('⚠️ ¡Te han dado!');
        }
      } else {
        showToast('El enemigo falló — ¡Tu turno!');
      }
      setAiHits(newHits);

      if (allSunk(playerBoard, newAi)) {
        setWinner('ai'); setPhase('over'); setAnimating(false); return;
      }

      setAnimating(false);
      setPlayerTurn(true);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerBoard, addExplosion, launchMissile]);

  // ── Reset ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPhase('placement');
    setPlayerBoard(createEmptyBoard());
    setPlayerShots({}); setAiShots({});
    setPlayerSunk(new Set()); setEnemySunk(new Set());
    setShipIdx(0); setHoriz(true); setHover(null);
    setPlayerTurn(true); setAnimating(false);
    setWinner(null); setAiHits([]);
    setExplosions([]); setMissile(null);
    setToast(''); setScore(0);
  };

  // ── Compute placed ships for rendering ─────────────────────────────────
  // Extract ship positions from board for ShipArt rendering
  const getPlacedShips = (board) => {
    const placed = {};
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const id = board[r][c];
        if (!id) continue;
        if (!placed[id]) placed[id] = { id, cells: [] };
        placed[id].cells.push({ r, c });
      }
    }
    return Object.values(placed).map(({ id, cells }) => {
      const sorted = cells.sort((a, b) => a.r - b.r || a.c - b.c);
      const horiz  = cells[0].r === cells[cells.length - 1].r;
      const ship   = SHIPS.find(s => s.id === id);
      return { ship, row: sorted[0].r, col: sorted[0].c, horiz };
    });
  };

  // ── Grid renderer ──────────────────────────────────────────────────────
  const renderGrid = (isPlayer) => {
    const board   = isPlayer ? playerBoard : enemyBoard;
    const shots   = isPlayer ? aiShots     : playerShots;
    const sunkSet = isPlayer ? playerSunk  : enemySunk;
    const gridRef = isPlayer ? playerGridRef : enemyGridRef;
    const cs      = cellSizeRef.current;

    // Preview during placement (player board only)
    const prevCells = new Set();
    let   prevValid = false;
    if (isPlayer && phase === 'placement' && !allPlaced && hover) {
      const pc = previewCells(hover.row, hover.col, currentShip.size, horiz);
      prevValid = canPlace(playerBoard, hover.row, hover.col, currentShip.size, horiz);
      pc.forEach(({ row, col }) => prevCells.add(`${row}-${col}`));
    }

    const placedShips = phase !== 'placement' || isPlayer
      ? getPlacedShips(isPlayer ? playerBoard : (phase === 'over' ? enemyBoard : createEmptyBoard()))
      : getPlacedShips(playerBoard);

    // On enemy board during placement, show nothing; during battle/over show sunk ships
    const visibleEnemyShips = !isPlayer
      ? getPlacedShips(enemyBoard).filter(({ ship }) => sunkSet.has(ship.id))
      : [];

    const shipsToRender = isPlayer ? placedShips : visibleEnemyShips;

    return (
      <div className="bs-grid-wrap">
        {/* Coordinate labels */}
        <div className="bs-corner" />
        {COLS.map(c => <div key={c} className="bs-col-label">{c}</div>)}

        {ROWS.map((rowNum, rIdx) => (
          <div key={rIdx} className="bs-row-label">{rowNum}</div>
        ))}

        {/* Cells */}
        <div
          className="bs-grid"
          ref={gridRef}
          style={{ gridArea: 'grid' }}
        >
          {Array.from({ length: BOARD_SIZE }, (_, r) =>
            Array.from({ length: BOARD_SIZE }, (_, c) => {
              const key   = `${r}-${c}`;
              const shot  = shots[key];
              const shipId = board[r][c];
              const isSunk = sunkSet.has(shipId);
              const exp   = explosions.find(e => e.row === r && e.col === c &&
                              e.board === (isPlayer ? 'player' : 'enemy'));

              let cls = 'bs-cell';

              if (isPlayer) {
                if (shot === 'hit') cls += isSunk ? ' bs-cell--sunk' : ' bs-cell--hit';
                else if (shot === 'miss') cls += ' bs-cell--miss';
              } else {
                // Enemy: hide ships until sunk
                if (shot === 'hit') cls += isSunk ? ' bs-cell--sunk' : ' bs-cell--hit';
                else if (shot === 'miss') cls += ' bs-cell--miss';
                else if (isSunk) cls += ' bs-cell--sunk';
                else {
                  cls += ' bs-cell--hidden';
                  if (playerTurn && !animating && phase === 'battle') cls += ' bs-cell--shootable';
                }
              }

              if (prevCells.has(key))
                cls += prevValid ? ' bs-cell--preview-ok' : ' bs-cell--preview-bad';

              const onClick = isPlayer
                ? (phase === 'placement' ? () => handlePlaceClick(r, c) : undefined)
                : () => handleEnemyClick(r, c);

              return (
                <div
                  key={key}
                  className={cls}
                  onClick={onClick}
                  onMouseEnter={isPlayer && phase === 'placement' ? () => setHover({ row: r, col: c }) : undefined}
                  onMouseLeave={isPlayer && phase === 'placement' ? () => setHover(null) : undefined}
                >
                  {shot === 'hit'  && <div className="bs-hit-marker" />}
                  {shot === 'miss' && <div className="bs-miss-marker" />}
                  {exp && <div className={`bs-explosion bs-explosion--${exp.type}`} />}
                </div>
              );
            })
          )}

          {/* Ship art layer */}
          {shipsToRender.map(({ ship, row, col, horiz: sh }) => {
            const hits  = shipCells(board, ship.id).filter(k => shots[k] === 'hit');
            const isHit = hits.length > 0;
            return (
              <ShipArt
                key={ship.id}
                ship={ship}
                row={row} col={col}
                horiz={sh}
                cellSize={cs}
                sunk={sunkSet.has(ship.id)}
                hit={isHit}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // ── Ship inventory (bottom panel) ──────────────────────────────────────
  const renderInventory = (ships, sunkSet, board, shots) => (
    <div className="bs-inventory">
      {ships.map(ship => {
        const cells    = shipCells(board, ship.id);
        const hitCount = cells.filter(k => shots[k] === 'hit').length;
        const pct      = cells.length ? (1 - hitCount / cells.length) * 100 : 100;
        const isSunk   = sunkSet.has(ship.id);
        return (
          <div key={ship.id} className={`bs-inv-ship${isSunk ? ' bs-inv-ship--sunk' : ''}`}>
            <span className="bs-inv-emoji">{ship.emoji}</span>
            <div className="bs-inv-bar-wrap">
              <div
                className="bs-inv-bar"
                style={{ width: `${pct}%`, '--ship-color': ship.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── JSX ────────────────────────────────────────────────────────────────
  return (
    <div className="bs-app">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="bs-topbar">
        <div className="bs-topbar-left">
          <button className="back-btn" onClick={onBack}>← Juegos</button>
          <div className="bs-score-badge">
            <span className="bs-score-pts">{score.toLocaleString()} pts</span>
          </div>
        </div>

        <div className="bs-title-center">
          <span className="bs-title-icon">⚓</span>
          <span className="bs-title-text">SEA BATTLE</span>
        </div>

        <div className="bs-topbar-right">
          {phase === 'battle' && (
            <div className={`bs-turn-pill ${playerTurn ? 'bs-turn-pill--player' : 'bs-turn-pill--enemy'}`}>
              {playerTurn ? '🎯 TU TURNO' : '⏳ ENEMIGO'}
            </div>
          )}
        </div>
      </div>

      {/* ── PLACEMENT PHASE ──────────────────────────────────────────── */}
      {phase === 'placement' && (
        <div className="bs-placement-wrap">
          <div className="bs-placement-sidebar">
            <h3 className="bs-sidebar-title">Coloca tu flota</h3>
            <div className="bs-ship-queue">
              {SHIPS.map((ship, i) => (
                <div
                  key={ship.id}
                  className={[
                    'bs-queue-item',
                    i < shipIdx ? 'bs-queue-item--done' : '',
                    i === shipIdx ? 'bs-queue-item--active' : '',
                  ].join(' ')}
                  style={{ '--ship-color': ship.color }}
                >
                  <span className="bs-queue-emoji">{ship.emoji}</span>
                  <div className="bs-queue-info">
                    <span className="bs-queue-name">{ship.name}</span>
                    <div className="bs-queue-cells">
                      {Array.from({ length: ship.size }, (_, j) => (
                        <div key={j} className="bs-queue-cell" />
                      ))}
                    </div>
                  </div>
                  {i < shipIdx && <span className="bs-queue-check">✓</span>}
                </div>
              ))}
            </div>

            <div className="bs-placement-btns">
              <button
                className="bs-btn bs-btn--secondary"
                onClick={() => setHoriz(h => !h)}
                disabled={allPlaced}
              >
                {horiz ? '↔ Horizontal' : '↕ Vertical'}
              </button>
              <button className="bs-btn bs-btn--secondary" onClick={handleAutoPlace}>
                🎲 Auto
              </button>
              {allPlaced && (
                <button
                  className="bs-btn bs-btn--primary"
                  onClick={() => { setPhase('battle'); showToast('¡Batalla iniciada!'); }}
                >
                  ⚔️ ¡Iniciar!
                </button>
              )}
            </div>
          </div>

          <div className="bs-placement-board">
            <div className="bs-board-label">TU FLOTA</div>
            {renderGrid(true)}
          </div>
        </div>
      )}

      {/* ── BATTLE PHASE ─────────────────────────────────────────────── */}
      {phase === 'battle' && (
        <div className="bs-battle-wrap">
          <div className="bs-battle-board-col">
            <div className="bs-board-label bs-board-label--player">
              🛡 TU FLOTA — {SHIPS.length - playerSunk.size} barcos
            </div>
            {renderGrid(true)}
            {renderInventory(SHIPS, playerSunk, playerBoard, aiShots)}
          </div>

          <div className="bs-battle-divider">
            <div className="bs-radar">
              <div className="bs-radar-inner">
                <div className="bs-radar-sweep" />
              </div>
              <span className="bs-radar-label">RADAR</span>
            </div>
          </div>

          <div className="bs-battle-board-col">
            <div className="bs-board-label bs-board-label--enemy">
              🎯 FLOTA ENEMIGA — {SHIPS.length - enemySunk.size} barcos
            </div>
            {renderGrid(false)}
            {renderInventory(SHIPS, enemySunk, enemyBoard, playerShots)}
          </div>
        </div>
      )}

      {/* ── Missile ──────────────────────────────────────────────────── */}
      <Missile missile={missile} />

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div className="bs-toast" key={toastKey}>{toast}</div>
      )}

      {/* ── GAME OVER ────────────────────────────────────────────────── */}
      {phase === 'over' && (
        <div className="bs-overlay">
          <div className={`bs-over-card ${winner === 'player' ? 'bs-over-card--win' : 'bs-over-card--lose'}`}>
            <div className="bs-over-icon">{winner === 'player' ? '🏆' : '💀'}</div>
            <h2 className="bs-over-title">
              {winner === 'player' ? '¡VICTORIA!' : 'DERROTA'}
            </h2>
            <p className="bs-over-sub">
              {winner === 'player'
                ? `¡Hundiste toda la flota enemiga! ${score.toLocaleString()} pts`
                : 'El enemigo destruyó toda tu flota.'}
            </p>
            <div className="bs-over-btns">
              <button className="bs-btn bs-btn--primary" onClick={handleReset}>
                Jugar de nuevo
              </button>
              <button className="bs-btn bs-btn--secondary" onClick={onBack}>
                ← Menú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
