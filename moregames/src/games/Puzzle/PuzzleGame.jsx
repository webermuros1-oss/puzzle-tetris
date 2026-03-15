import { useState, useEffect, useRef } from 'react';
import { resumeAudio, sfxPzPlace, sfxPzClear, sfxPzBoom, sfxPzGameOver, startPuzzleMusic, stopPuzzleMusic } from '../../utils/synthSounds.js';
import Board from './components/Board';
import PieceContainer from './components/PieceContainer';
import DragGhost from './components/DragGhost';
import ComboToast from './components/ComboToast';
import {
  createEmptyBoard,
  canPlacePiece,
  placePiece,
  clearLines,
  getLinesToClear,
  hasAnyValidMove,
  BOARD_SIZE,
} from './logic/boardUtils';
import { generateThreePieces } from './logic/pieceUtils';
import { calculateScore } from './logic/scoreSystem';
import './styles/puzzle.css';

function PuzzleGame({ onBack }) {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [pieces, setPieces] = useState(() => generateThreePieces());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem('puzzleTetris_best') || '0')
  );
  const [gameOver, setGameOver] = useState(false);
  const [flashCells, setFlashCells] = useState(new Set());
  const [scoreDelta, setScoreDelta] = useState(null);
  const [particles, setParticles] = useState([]);
  // BOOM: { id, lines } — se muestra al completar líneas
  const [boom, setBoom] = useState(null);

  const [dragState, setDragState] = useState(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [hoverCell, setHoverCell] = useState(null);
  const [isValidPlacement, setIsValidPlacement] = useState(false);

  const boardRef = useRef(null);
  const boardStateRef = useRef(board);
  const piecesRef = useRef(pieces);
  const scoreRef = useRef(score);
  const bestScoreRef = useRef(bestScore);
  const dragStateRef = useRef(null);
  const hoverCellRef = useRef(null);
  const isValidRef = useRef(false);
  const boardCellSizeRef = useRef(60);

  useEffect(() => { boardStateRef.current = board; }, [board]);
  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { bestScoreRef.current = bestScore; }, [bestScore]);

  // Medir celda real del tablero para que el ghost encaje pixel-perfect
  useEffect(() => {
    const measure = () => {
      if (boardRef.current) {
        boardCellSizeRef.current =
          boardRef.current.getBoundingClientRect().width / BOARD_SIZE;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    startPuzzleMusic();
    return () => stopPuzzleMusic();
  }, []);

  // ── Lógica compartida de movimiento del puntero ─────────────────────────
  const updatePointer = (clientX, clientY) => {
    setPointerPos({ x: clientX, y: clientY });
    if (!boardRef.current || !dragStateRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const cs = rect.width / BOARD_SIZE;
    const cursorCol = Math.floor((clientX - rect.left) / cs);
    const cursorRow = Math.floor((clientY - rect.top) / cs);

    // Centrar la pieza en el cursor (no top-left)
    const piece = dragStateRef.current.piece;
    const pieceRows = piece.shape.length;
    const pieceCols = Math.max(...piece.shape.map(r => r.length));
    const col = cursorCol - Math.floor(pieceCols / 2);
    const row = cursorRow - Math.floor(pieceRows / 2);

    if (cursorRow >= 0 && cursorRow < BOARD_SIZE && cursorCol >= 0 && cursorCol < BOARD_SIZE) {
      const cell = { row, col };
      const valid = canPlacePiece(boardStateRef.current, piece, row, col);
      hoverCellRef.current = cell;
      isValidRef.current = valid;
      setHoverCell(cell);
      setIsValidPlacement(valid);
    } else {
      hoverCellRef.current = null;
      isValidRef.current = false;
      setHoverCell(null);
      setIsValidPlacement(false);
    }
  };

  // ── Lógica de soltar la pieza ──────────────────────────────────────────
  const commitDrop = () => {
    const ds = dragStateRef.current;
    const hc = hoverCellRef.current;
    const valid = isValidRef.current;

    dragStateRef.current = null;
    hoverCellRef.current = null;
    isValidRef.current = false;
    setDragState(null);
    setHoverCell(null);
    setIsValidPlacement(false);

    if (!ds || !hc || !valid) return;

    const currentBoard = boardStateRef.current;
    const currentPieces = piecesRef.current;

    resumeAudio();
    sfxPzPlace();

    const withPiece = placePiece(currentBoard, ds.piece, hc.row, hc.col);
    const linesToClear = getLinesToClear(withPiece);
    const { newBoard: clearedBoard, linesCleared } = clearLines(withPiece);

    const blockCount = ds.piece.shape.flat().filter(Boolean).length;
    const gained = blockCount + calculateScore(linesCleared);
    const newScore = scoreRef.current + gained;

    setScore(newScore);
    setScoreDelta({ value: gained, id: Date.now() });

    if (newScore > bestScoreRef.current) {
      setBestScore(newScore);
      localStorage.setItem('puzzleTetris_best', newScore.toString());
    }

    const newPieces = currentPieces.map((p, i) =>
      i === ds.pieceIndex ? null : p
    );
    const allUsed = newPieces.every((p) => p === null);
    const nextPieces = allUsed ? generateThreePieces() : newPieces;

    if (linesToClear.size > 0) {
      sfxPzClear();
      if (linesCleared > 1) sfxPzBoom();
      setBoard(withPiece);
      setFlashCells(linesToClear);

      // ── BOOM + partículas ────────────────────────────────────────────
      const boomId = Date.now();
      setBoom({ id: boomId, lines: linesCleared });
      setTimeout(() => setBoom(null), 900);

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const cs = rect.width / BOARD_SIZE;
        const pts = [];
        let pid = boomId;

        linesToClear.forEach((key) => {
          const [r, c] = key.split('-').map(Number);
          const cx = rect.left + c * cs + cs / 2;
          const cy = rect.top + r * cs + cs / 2;
          const color = withPiece[r][c] || '#ffffff';

          // 12 partículas por celda — más dramático
          for (let i = 0; i < 12; i++) {
            const base = (i / 12) * Math.PI * 2;
            const angle = base + (Math.random() - 0.5) * 0.6;
            const speed = 70 + Math.random() * 130;
            const isLarge = i % 3 === 0; // cada 3ª partícula es grande
            pts.push({
              id: `${pid++}`,
              x: cx, y: cy, color,
              dx: Math.cos(angle) * speed,
              dy: Math.sin(angle) * speed,
              size: isLarge ? 9 + Math.random() * 7 : 4 + Math.random() * 5,
              round: Math.random() > 0.4, // mezcla círculos y cuadraditos
            });
          }
        });

        setParticles(pts);
        setTimeout(() => setParticles([]), 850);
      }

      setTimeout(() => {
        setFlashCells(new Set());
        setBoard(clearedBoard);
        setPieces(nextPieces);
        if (!hasAnyValidMove(clearedBoard, nextPieces.filter(Boolean))) { sfxPzGameOver(); setGameOver(true); }
      }, 420);
    } else {
      setBoard(clearedBoard);
      setPieces(nextPieces);
      if (!hasAnyValidMove(clearedBoard, nextPieces.filter(Boolean))) { sfxPzGameOver(); setGameOver(true); }
    }
  };

  // ── Listeners de ratón Y táctiles durante el arrastre ─────────────────
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => updatePointer(e.clientX, e.clientY);
    const handleMouseUp = () => commitDrop();

    // Touch: preventDefault evita el scroll mientras se arrastra
    const handleTouchMove = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      updatePointer(t.clientX, t.clientY);
    };
    const handleTouchEnd = (e) => {
      const t = e.changedTouches[0];
      updatePointer(t.clientX, t.clientY);
      commitDrop();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inicio de arrastre — soporta ratón y touch
  const handlePieceDragStart = (piece, pieceIndex, e) => {
    e.preventDefault();
    const ds = { piece, pieceIndex };
    dragStateRef.current = ds;
    setDragState(ds);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPointerPos({ x: clientX, y: clientY });
  };

  const handleRestart = () => {
    setBoard(createEmptyBoard());
    setPieces(generateThreePieces());
    setScore(0);
    setGameOver(false);
    setFlashCells(new Set());
    setScoreDelta(null);
    setParticles([]);
    setBoom(null);
    dragStateRef.current = null;
    hoverCellRef.current = null;
    isValidRef.current = false;
    setDragState(null);
    setHoverCell(null);
    setIsValidPlacement(false);
  };

  return (
    <div className="app" style={{ userSelect: 'none' }}>

      <header className="header">
        {onBack && (
          <button className="back-btn" onClick={onBack}>← Juegos</button>
        )}
        <div className="game-title">
          <span className="title-gem">◆</span>
          Puzzle
        </div>

        <div className="scoreboard">
          <div className="score-item" style={{ position: 'relative' }}>
            <span className="score-label">PUNTOS</span>
            <span className="score-value">{score.toLocaleString()}</span>
            {scoreDelta && (
              <span className="score-delta" key={scoreDelta.id}>
                +{scoreDelta.value}
              </span>
            )}
          </div>
          <div className="score-divider" />
          <div className="score-item">
            <span className="score-label">RÉCORD</span>
            <span className="score-value score-value--best">
              {bestScore.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      <p className="instructions">
        Arrastra las piezas · Completa filas o columnas para puntuar
      </p>

      <Board
        board={board}
        boardRef={boardRef}
        hoverCell={hoverCell}
        dragPiece={dragState?.piece || null}
        isValidPlacement={isValidPlacement}
        flashCells={flashCells}
        shaking={!!boom}
      />

      <PieceContainer
        pieces={pieces}
        onDragStart={handlePieceDragStart}
        isDragging={!!dragState}
      />

      {dragState && (
        <DragGhost
          piece={dragState.piece}
          x={pointerPos.x}
          y={pointerPos.y}
          cellSize={boardCellSizeRef.current}
          hoverCell={hoverCell}
          boardRef={boardRef}
        />
      )}

      {/* ── BOOM overlay ─────────────────────────────────────────────── */}
      {boom && (
        <div className="boom-overlay" key={boom.id}>
          <div className="boom-flash" />
          <div className="boom-text">
            💥 BOOM{boom.lines > 1 ? ` ×${boom.lines}` : ''}!
          </div>
        </div>
      )}

      {/* ── Partículas de explosión ───────────────────────────────────── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`explosion-particle${p.round ? '' : ' explosion-particle--square'}`}
          style={{
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size}px ${p.color}, 0 0 ${p.size * 2.5}px ${p.color}`,
            '--pdx': `${p.dx}px`,
            '--pdy': `${p.dy}px`,
          }}
        />
      ))}

      {gameOver && (
        <div className="overlay">
          <div className="game-over-card">
            <div className="game-over-icon">😵</div>
            <h2 className="game-over-title">Game Over</h2>
            <div className="game-over-scores">
              <div className="go-score-row">
                <span>Puntuación</span>
                <strong>{score.toLocaleString()}</strong>
              </div>
              <div className="go-score-row go-score-row--best">
                <span>Récord</span>
                <strong>{bestScore.toLocaleString()}</strong>
              </div>
            </div>
            <button className="restart-btn" onClick={handleRestart}>
              Jugar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PuzzleGame;
