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
  hasAnyValidMove,
  BOARD_SIZE,
} from './logic/boardUtils';
import { generateThreePieces } from './logic/pieceUtils';
import { calculateScore, getComboText } from './logic/scoreSystem';
import './index.css';

function App() {
  // ── Estado del juego ──────────────────────────────────────────────────────
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [pieces, setPieces] = useState(() => generateThreePieces());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    () => parseInt(localStorage.getItem('puzzleTetris_best') || '0')
  );
  const [gameOver, setGameOver] = useState(false);
  const [comboText, setComboText] = useState('');

  // ── Estado del drag ───────────────────────────────────────────────────────
  const [dragState, setDragState] = useState(null); // { piece, pieceIndex }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoverCell, setHoverCell] = useState(null); // { row, col }
  const [isValidPlacement, setIsValidPlacement] = useState(false);

  // ── Refs para acceso sin re-registrar listeners ────────────────────────────
  const boardRef = useRef(null);
  const boardStateRef = useRef(board);
  const piecesRef = useRef(pieces);
  const scoreRef = useRef(score);
  const bestScoreRef = useRef(bestScore);
  const dragStateRef = useRef(null);
  const hoverCellRef = useRef(null);
  const isValidRef = useRef(false);

  // Mantener refs sincronizados con el estado
  useEffect(() => { boardStateRef.current = board; }, [board]);
  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { bestScoreRef.current = bestScore; }, [bestScore]);

  // ── Listeners de ratón (solo activos durante arrastre) ────────────────────
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const cellSize = rect.width / BOARD_SIZE;
        const boardX = e.clientX - rect.left;
        const boardY = e.clientY - rect.top;

        const col = Math.floor(boardX / cellSize);
        const row = Math.floor(boardY / cellSize);

        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
          const cell = { row, col };
          const valid = canPlacePiece(
            boardStateRef.current,
            dragStateRef.current.piece,
            row,
            col
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

      if (ds && hc && valid) {
        const currentBoard = boardStateRef.current;
        const currentPieces = piecesRef.current;

        // Colocar pieza y limpiar líneas completas
        const withPiece = placePiece(currentBoard, ds.piece, hc.row, hc.col);
        const { newBoard: clearedBoard, linesCleared } = clearLines(withPiece);

        // Calcular nueva puntuación
        const blockCount = ds.piece.shape.flat().filter(Boolean).length;
        const gained = blockCount + calculateScore(linesCleared);
        const newScore = scoreRef.current + gained;

        setScore(newScore);

        if (newScore > bestScoreRef.current) {
          setBestScore(newScore);
          localStorage.setItem('puzzleTetris_best', newScore.toString());
        }

        // Mostrar texto de combo si hay líneas eliminadas
        if (linesCleared > 0) {
          setComboText(getComboText(linesCleared));
        }

        // Eliminar pieza usada del set
        const newPieces = currentPieces.map((p, i) =>
          i === ds.pieceIndex ? null : p
        );

        // Si todas las piezas fueron usadas, generar 3 nuevas
        const allUsed = newPieces.every((p) => p === null);
        const nextPieces = allUsed ? generateThreePieces() : newPieces;

        setBoard(clearedBoard);
        setPieces(nextPieces);

        // Comprobar si hay movimientos posibles → Game Over
        const available = nextPieces.filter(Boolean);
        if (!hasAnyValidMove(clearedBoard, available)) {
          setGameOver(true);
        }
      }

      // Limpiar estado de drag
      dragStateRef.current = null;
      hoverCellRef.current = null;
      isValidRef.current = false;
      setDragState(null);
      setHoverCell(null);
      setIsValidPlacement(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]); // Solo se re-registra cuando empieza/termina un drag

  // ── Iniciar arrastre de pieza ─────────────────────────────────────────────
  const handlePieceDragStart = (piece, pieceIndex, e) => {
    e.preventDefault();
    const ds = { piece, pieceIndex };
    dragStateRef.current = ds;
    setDragState(ds);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // ── Reiniciar partida ─────────────────────────────────────────────────────
  const handleRestart = () => {
    setBoard(createEmptyBoard());
    setPieces(generateThreePieces());
    setScore(0);
    setGameOver(false);
    setComboText('');
    dragStateRef.current = null;
    hoverCellRef.current = null;
    isValidRef.current = false;
    setDragState(null);
    setHoverCell(null);
    setIsValidPlacement(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="app" style={{ userSelect: 'none' }}>
      {/* Cabecera */}
      <header className="header">
        <h1 className="game-title">🧩 Puzzle Tetris</h1>
        <div className="scoreboard">
          <div className="score-item">
            <span className="score-label">PUNTOS</span>
            <span className="score-value">{score}</span>
          </div>
          <div className="score-item">
            <span className="score-label">RÉCORD</span>
            <span className="score-value">{bestScore}</span>
          </div>
        </div>
      </header>

      {/* Instrucciones rápidas */}
      <p className="instructions">
        Arrastra las piezas al tablero · Completa filas o columnas para puntuar
      </p>

      {/* Tablero 8x8 */}
      <Board
        board={board}
        boardRef={boardRef}
        hoverCell={hoverCell}
        dragPiece={dragState?.piece || null}
        isValidPlacement={isValidPlacement}
      />

      {/* Panel de piezas disponibles */}
      <PieceContainer
        pieces={pieces}
        onDragStart={handlePieceDragStart}
        isDragging={!!dragState}
      />

      {/* Fantasma que sigue el cursor durante el drag */}
      {dragState && (
        <DragGhost piece={dragState.piece} x={mousePos.x} y={mousePos.y} />
      )}

      {/* Toast de combo */}
      {comboText && (
        <ComboToast message={comboText} onDone={() => setComboText('')} />
      )}

      {/* Pantalla de Game Over */}
      {gameOver && (
        <div className="overlay">
          <div className="game-over-card">
            <h2>¡Juego Terminado!</h2>
            <p>
              Puntuación final: <strong>{score}</strong>
            </p>
            <p>
              Récord: <strong>{bestScore}</strong>
            </p>
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
