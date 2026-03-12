// ══════════════════════════════════════════════════
//  Battleship — Pure game logic
// ══════════════════════════════════════════════════

export const BOARD_SIZE = 10;
export const COLS = 'ABCDEFGHIJ'.split('');
export const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ── Ship catalogue ────────────────────────────────
export const SHIPS = [
  { id: 'carrier',    name: 'Portaaviones', size: 5, color: '#64748b', emoji: '🛸' },
  { id: 'battleship', name: 'Destructor',   size: 4, color: '#3b82f6', emoji: '🚢' },
  { id: 'submarine',  name: 'Submarino',    size: 3, color: '#1e3a5f', emoji: '🔱' },
  { id: 'frigate',    name: 'Fragata',      size: 3, color: '#15803d', emoji: '⚓' },
  { id: 'patrol',     name: 'Patrullera',   size: 2, color: '#b45309', emoji: '🚤' },
];

// ── Board creation ────────────────────────────────
// board[r][c] = null | shipId (string)
export const createEmptyBoard = () =>
  Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

// ── Placement validation ──────────────────────────
export const canPlace = (board, row, col, size, horiz) => {
  for (let i = 0; i < size; i++) {
    const r = horiz ? row     : row + i;
    const c = horiz ? col + i : col;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
};

// Returns new board with ship placed (no mutation)
export const placeShip = (board, row, col, size, horiz, shipId) => {
  const b = board.map(r => [...r]);
  for (let i = 0; i < size; i++) {
    const r = horiz ? row     : row + i;
    const c = horiz ? col + i : col;
    b[r][c] = shipId;
  }
  return b;
};

// Returns array of {row,col} for preview during placement
export const previewCells = (row, col, size, horiz) => {
  const cells = [];
  for (let i = 0; i < size; i++) {
    cells.push({ row: horiz ? row : row + i, col: horiz ? col + i : col });
  }
  return cells;
};

// ── Random fleet generator ────────────────────────
export const randomFleet = () => {
  let board = createEmptyBoard();
  for (const ship of SHIPS) {
    let ok = false;
    let tries = 0;
    while (!ok && tries < 500) {
      tries++;
      const horiz = Math.random() > 0.5;
      const row   = Math.floor(Math.random() * BOARD_SIZE);
      const col   = Math.floor(Math.random() * BOARD_SIZE);
      if (canPlace(board, row, col, ship.size, horiz)) {
        board = placeShip(board, row, col, ship.size, horiz, ship.id);
        ok = true;
      }
    }
  }
  return board;
};

// ── Shot processing ───────────────────────────────
// shots = { 'r-c': 'hit'|'miss' }
// Returns { hit, shipId, sunk }
export const processShot = (shipBoard, shots, row, col) => {
  const shipId = shipBoard[row][col];
  if (!shipId) return { hit: false, shipId: null, sunk: false };

  const newShots = { ...shots, [`${row}-${col}`]: 'hit' };

  // Detect sinking: all cells of this ship are hit
  let sunk = true;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (shipBoard[r][c] === shipId && newShots[`${r}-${c}`] !== 'hit') {
        sunk = false;
        break;
      }
    }
    if (!sunk) break;
  }
  return { hit: true, shipId, sunk };
};

// True if every ship cell has been hit
export const allSunk = (shipBoard, shots) => {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (shipBoard[r][c] && shots[`${r}-${c}`] !== 'hit') return false;
  return true;
};

// All cells belonging to a given shipId
export const shipCells = (shipBoard, shipId) => {
  const cells = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (shipBoard[r][c] === shipId) cells.push(`${r}-${c}`);
  return cells;
};

// ── AI targeting ──────────────────────────────────
// lastHits = array of [row, col] hit cells not yet sunk
export const aiTarget = (shots, lastHits) => {
  // Hunt mode: continue adjacent to existing hits
  if (lastHits && lastHits.length > 0) {
    // If 2+ aligned hits, continue the line first
    if (lastHits.length >= 2) {
      const [r1, c1] = lastHits[lastHits.length - 2];
      const [r2, c2] = lastHits[lastHits.length - 1];
      const dr = r2 - r1, dc = c2 - c1;

      // Forward
      const fr = r2 + dr, fc = c2 + dc;
      if (fr >= 0 && fr < BOARD_SIZE && fc >= 0 && fc < BOARD_SIZE && !shots[`${fr}-${fc}`])
        return { row: fr, col: fc };

      // Backward from first hit
      const [hr, hc] = lastHits[0];
      const br = hr - dr, bc = hc - dc;
      if (br >= 0 && br < BOARD_SIZE && bc >= 0 && bc < BOARD_SIZE && !shots[`${br}-${bc}`])
        return { row: br, col: bc };
    }

    // Try all 4 directions from each hit cell
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [hr, hc] of lastHits) {
      for (const [dr, dc] of dirs) {
        const r = hr + dr, c = hc + dc;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && !shots[`${r}-${c}`])
          return { row: r, col: c };
      }
    }
  }

  // Random: prefer a checkerboard pattern (more efficient)
  const available = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (!shots[`${r}-${c}`] && (r + c) % 2 === 0) available.push([r, c]);

  if (available.length === 0) {
    // Fallback: any unshot cell
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (!shots[`${r}-${c}`]) return { row: r, col: c };
    return null;
  }

  const [row, col] = available[Math.floor(Math.random() * available.length)];
  return { row, col };
};
