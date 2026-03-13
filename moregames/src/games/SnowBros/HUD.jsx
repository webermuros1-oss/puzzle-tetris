export default function HUD({ score, lives, level, inline }) {
  if (inline) {
    // Versión compacta para la topbar en landscape
    return (
      <div className="snow-hud-inline">
        <span className="snow-hud-inline-score">{String(score).padStart(6,'0')}</span>
        <span className="snow-hud-inline-lives">
          {Array.from({ length: Math.max(lives, 0) }).map((_, i) => (
            <span key={i} className="snow-heart">♥</span>
          ))}
        </span>
        <span className="snow-hud-inline-level">Lv.{level + 1}</span>
      </div>
    );
  }

  return (
    <div className="snow-hud">
      <div className="snow-hud-block">
        <span className="snow-hud-label">SCORE</span>
        <span className="snow-hud-value">{String(score).padStart(6, '0')}</span>
      </div>
      <div className="snow-hud-block snow-hud-lives">
        <span className="snow-hud-label">LIVES</span>
        <span className="snow-hud-value">
          {Array.from({ length: Math.max(lives, 0) }).map((_, i) => (
            <span key={i} className="snow-heart">♥</span>
          ))}
        </span>
      </div>
      <div className="snow-hud-block">
        <span className="snow-hud-label">LEVEL</span>
        <span className="snow-hud-value">{level + 1}</span>
      </div>
    </div>
  );
}
