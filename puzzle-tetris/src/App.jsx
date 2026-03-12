import { useState, useEffect, useRef } from 'react';
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
import { calculateScore, getComboText } from './logic/scoreSystem';
import './index.css';

function App() {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [pieces, setPieces] = useState(() => generateThreePieces());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem('puzzleTetris_best') || '0')
  );
  const [gameOver, setGameOver] = useState(false);
  const [comboText, setComboText] = useState('');
  const [flashCells, setFlashCells] = useState(new Set());
  const [scoreDelta, setScoreDelta] = useState(null);
  // Partículas de explosión: array de { id, x, y, color, dx, dy, size }
  const [particles, setParticles] = useState([]);

  const [dragState, setDragState] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
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
  // Tamaño de celda del tablero — se actualiza al montar y en resize
  const boardCellSizeRef = useRef(60);

  useEffect(() => { boardStateRef.current = board; }, [board]);
  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { bestScoreRef.current = bestScore; }, [bestScore]);

  // Medir celda del tablero para que el ghost encaje perfectamente
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

  // ── Listeners de ratón durante arrastre ────────────────────────────────
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const cs = rect.width / BOARD_SIZE;
        const col = Math.floor((e.clientX - rect.left) / cs);
        const row = Math.floor((e.clientY - rect.top) / cs);

        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
          const cell = { row, col };
          const valid = canPlacePiece(
            boardStateRef.current,
            dragStateRef.current.piece,
            row, col
          );
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
      }
    };

    const handleMouseUp = () => {
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

      if (linesCleared > 0) setComboText(getComboText(linesCleared));

      const newPieces = currentPieces.map((p, i) =>
        i === ds.pieceIndex ? null : p
      );
      const allUsed = newPieces.every((p) => p === null);
      const nextPieces = allUsed ? generateThreePieces() : newPieces;

      if (linesToClear.size > 0) {
        setBoard(withPiece);
        setFlashCells(linesToClear);

        // ── Partículas de explosión ──────────────────────────────────────
        if (boardRef.current) {
          const rect = boardRef.current.getBoundingClientRect();
          const cs = rect.width / BOARD_SIZE;
          const pts = [];
          let pid = Date.now();

          linesToClear.forEach((key) => {
            const [r, c] = key.split('-').map(Number);
            const cx = rect.left + c * cs + cs / 2;
            const cy = rect.top + r * cs + cs / 2;
            const color = withPiece[r][c] || '#ffffff';

            // 6 partículas por celda en ángulos uniformes + variación aleatoria
            for (let i = 0; i < 6; i++) {
              const base = (i / 6) * Math.PI * 2;
              const angle = base + (Math.random() - 0.5) * 0.8;
              const speed = 45 + Math.random() * 75;
              pts.push({
                id: `${pid++}`,
                x: cx, y: cy, color,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                size: 5 + Math.random() * 6,
              });
            }
          });

          setParticles(pts);
          setTimeout(() => setParticles([]), 700);
        }
        // ─────────────────────────────────────────────────────────────────

        setTimeout(() => {
          setFlashCells(new Set());
          setBoard(clearedBoard);
          setPieces(nextPieces);
          const available = nextPieces.filter(Boolean);
          if (!hasAnyValidMove(clearedBoard, available)) setGameOver(true);
        }, 400);
      } else {
        setBoard(clearedBoard);
        setPieces(nextPieces);
        const available = nextPieces.filter(Boolean);
        if (!hasAnyValidMove(clearedBoard, available)) setGameOver(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  const handlePieceDragStart = (piece, pieceIndex, e) => {
    e.preventDefault();
    const ds = { piece, pieceIndex };
    dragStateRef.current = ds;
    setDragState(ds);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleRestart = () => {
    setBoard(createEmptyBoard());
    setPieces(generateThreePieces());
    setScore(0);
    setGameOver(false);
    setComboText('');
    setFlashCells(new Set());
    setScoreDelta(null);
    setParticles([]);
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
      />

      <PieceContainer
        pieces={pieces}
        onDragStart={handlePieceDragStart}
        isDragging={!!dragState}
      />

      {dragState && (
        <DragGhost
          piece={dragState.piece}
          x={mousePos.x}
          y={mousePos.y}
          cellSize={boardCellSizeRef.current}
        />
      )}

      {comboText && (
        <ComboToast message={comboText} onDone={() => setComboText('')} />
      )}

      {/* ── Partículas de explosión ─────────────────────────────────── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="explosion-particle"
          style={{
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size}px ${p.color}, 0 0 ${p.size * 2}px ${p.color}`,
            '--pdx': `${p.dx}px`,
            '--pdy': `${p.dy}px`,
          }}
        />
      ))}

      {gameOver && (
        <div className="overlay">
          <div className="game-over-card">
            <div className="game-over-icon">💀</div>
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

export default App;
