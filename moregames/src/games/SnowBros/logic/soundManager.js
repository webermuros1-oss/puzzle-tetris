// ─────────────────────────────────────────────────────────────
// SOUND MANAGER — sonidos procedurales con Web Audio API
// No necesita archivos de audio: genera los sonidos en tiempo real
// ─────────────────────────────────────────────────────────────

let _ctx = null;

function ac() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { return null; }
  }
  // iOS/Android necesita reanudar después de gesto del usuario
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function osc(freq, type, duration, vol = 0.28, freqEnd = null) {
  const ctx = ac();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd != null)
      o.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + duration + 0.01);
  } catch (_) {}
}

// Ruido blanco corto (para impactos)
function noise(duration, vol = 0.15) {
  const ctx = ac();
  if (!ctx) return;
  try {
    const samples = ctx.sampleRate * duration;
    const buf  = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    src.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.start(ctx.currentTime);
  } catch (_) {}
}

// ── Sonidos ────────────────────────────────────────────────────

export function playJump() {
  osc(180, 'square', 0.14, 0.22, 340);   // tono ascendente estilo 8-bit
}

export function playShoot() {
  osc(660, 'sawtooth', 0.07, 0.18, 440); // ráfaga corta descendente
  osc(880, 'square',   0.06, 0.08);      // destello agudo
}

export function playEnemyHit() {
  noise(0.06, 0.18);
  osc(220, 'square', 0.12, 0.2);         // golpe seco
}

export function playSnowball() {
  osc(130, 'sine',   0.18, 0.2);         // rodadura grave
  osc(160, 'square', 0.10, 0.1);
}

export function playBossHit() {
  noise(0.08, 0.3);
  osc(80,  'square', 0.22, 0.35);        // impacto pesado
  osc(55,  'square', 0.18, 0.25);
}

export function playPlayerDamage() {
  osc(400, 'sawtooth', 0.08, 0.28);
  setTimeout(() => osc(280, 'sawtooth', 0.08, 0.22), 90);
  setTimeout(() => osc(180, 'sawtooth', 0.12, 0.18), 180);
}

export function playLevelClear() {
  const melody = [523, 659, 784, 1047];
  melody.forEach((f, i) => setTimeout(() => osc(f, 'square', 0.2, 0.28), i * 130));
}

export function playDeath() {
  const fall = [400, 320, 240, 160, 100];
  fall.forEach((f, i) => setTimeout(() => osc(f, 'sawtooth', 0.12, 0.25), i * 90));
}

export function playBossDeath() {
  // explosión épica
  noise(0.3, 0.35);
  const notes = [300, 200, 150, 100, 60];
  notes.forEach((f, i) => setTimeout(() => osc(f, 'square', 0.18, 0.4), i * 80));
}
