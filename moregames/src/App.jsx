import { useState } from 'react';
import PuzzleGame from './PuzzleGame';
import BattleshipGame from './games/Battleship/BattleshipGame';
import './dashboard.css';

const GAMES = [
  {
    id: 'puzzle',
    name: 'Puzzle',
    tagline: 'Encaja piezas · completa líneas',
    emoji: '🧩',
    accent: '#6366f1',
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
    badge: 'CLÁSICO',
  },
  {
    id: 'battleship',
    name: 'Batalla Naval',
    tagline: 'Hunde la flota enemiga',
    emoji: '⚓',
    accent: '#0ea5e9',
    bg: 'linear-gradient(135deg, #0c1a2e 0%, #0a3260 50%, #0c1a2e 100%)',
    badge: 'NUEVO',
  },
];

export default function App() {
  const [current, setCurrent] = useState(null);

  if (current === 'puzzle')     return <PuzzleGame onBack={() => setCurrent(null)} />;
  if (current === 'battleship') return <BattleshipGame onBack={() => setCurrent(null)} />;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-logo">🎮 More Games</div>
        <p className="dash-sub">Elige tu aventura</p>
      </header>

      <div className="dash-cards">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className="dash-card"
            style={{ '--accent': g.accent, '--bg': g.bg }}
            onClick={() => setCurrent(g.id)}
          >
            <span className="dash-card-badge">{g.badge}</span>
            <span className="dash-card-emoji">{g.emoji}</span>
            <h2 className="dash-card-name">{g.name}</h2>
            <p className="dash-card-tagline">{g.tagline}</p>
            <span className="dash-card-play">JUGAR →</span>
          </button>
        ))}
      </div>

      <footer className="dash-footer">More Games · 2025</footer>
    </div>
  );
}
