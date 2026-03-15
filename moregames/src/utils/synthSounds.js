// ══════════════════════════════════════════════════════════════════════════
//  synthSounds.js — Sonidos sintetizados con Web Audio API (sin archivos)
//  Todos los sonidos se generan en tiempo real: 0 licencias, 0 archivos.
// ══════════════════════════════════════════════════════════════════════════

let _ctx = null;

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────
function gn(ctx, vol) {
  const g = ctx.createGain();
  g.gain.value = vol;
  g.connect(ctx.destination);
  return g;
}

function adsr(g, ctx, a, d, s, r, vol) {
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.linearRampToValueAtTime(s * vol, t + a + d);
  g.gain.linearRampToValueAtTime(0, t + a + d + r);
}

function osc(ctx, g, type, f0, f1, dur) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(f1, ctx.currentTime + dur);
  o.connect(g);
  o.start(ctx.currentTime);
  o.stop(ctx.currentTime + dur + 0.05);
}

function noise(ctx, g, dur, bpFreq) {
  const sr  = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * dur, sr);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  if (bpFreq) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = bpFreq; f.Q.value = 0.5;
    src.connect(f); f.connect(g);
  } else {
    src.connect(g);
  }
  src.start(ctx.currentTime);
  src.stop(ctx.currentTime + dur);
}

// ══════════════════════════════════════════════════════════════════════════
//  TETILLAS
// ══════════════════════════════════════════════════════════════════════════

export function sfxShoot() {
  const ctx = getCtx();
  const g = gn(ctx, 0);
  adsr(g, ctx, 0.001, 0.08, 0, 0.04, 0.35);
  osc(ctx, g, 'sawtooth', 280, 860, 0.13);
}

export function sfxPop() {
  const ctx = getCtx();
  const g1 = gn(ctx, 0); adsr(g1, ctx, 0.001, 0.14, 0, 0.04, 0.45);
  osc(ctx, g1, 'sine', 460, 110, 0.18);
  const g2 = gn(ctx, 0); adsr(g2, ctx, 0.001, 0.06, 0, 0.02, 0.18);
  noise(ctx, g2, 0.09);
}

export function sfxDestroy() {
  const ctx = getCtx();
  const g = gn(ctx, 0); adsr(g, ctx, 0.001, 0.12, 0, 0.04, 0.42);
  osc(ctx, g, 'sine', 680, 180, 0.16);
}

export function sfxJump() {
  const ctx = getCtx();
  const g = gn(ctx, 0); adsr(g, ctx, 0.001, 0.11, 0, 0.04, 0.28);
  osc(ctx, g, 'square', 190, 440, 0.14);
}

export function sfxHitPlayer() {
  const ctx = getCtx();
  const g1 = gn(ctx, 0); adsr(g1, ctx, 0.001, 0.22, 0, 0.08, 0.55);
  osc(ctx, g1, 'sawtooth', 150, 55, 0.3);
  const g2 = gn(ctx, 0); adsr(g2, ctx, 0.001, 0.14, 0, 0.04, 0.28);
  noise(ctx, g2, 0.18);
}

export function sfxLevelClear() {
  const ctx = getCtx();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.13;
    const g = gn(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.22);
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    o.connect(g); o.start(t); o.stop(t + 0.26);
  });
}

export function sfxGameOver() {
  const ctx = getCtx();
  [440, 370, 311, 220].forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.2;
    const g = gn(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    o.connect(g); o.start(t); o.stop(t + 0.33);
  });
}

export function sfxReady() {
  const ctx = getCtx();
  const g = gn(ctx, 0); adsr(g, ctx, 0.01, 0.28, 0.1, 0.1, 0.28);
  osc(ctx, g, 'sine', 660, 660, 0.45);
}

// ══════════════════════════════════════════════════════════════════════════
//  BATTLESHIP
// ══════════════════════════════════════════════════════════════════════════

export function sfxBsFire() {
  const ctx = getCtx();
  const g1 = gn(ctx, 0); adsr(g1, ctx, 0.001, 0.28, 0, 0.1, 0.5);
  osc(ctx, g1, 'sawtooth', 95, 28, 0.38);
  const g2 = gn(ctx, 0); adsr(g2, ctx, 0.001, 0.2, 0, 0.08, 0.38);
  noise(ctx, g2, 0.3);
}

export function sfxBsHit() {
  const ctx = getCtx();
  const g1 = gn(ctx, 0); adsr(g1, ctx, 0.001, 0.22, 0, 0.12, 0.48);
  osc(ctx, g1, 'sawtooth', 190, 55, 0.32);
  const g2 = gn(ctx, 0); adsr(g2, ctx, 0.001, 0.2, 0, 0.1, 0.32);
  noise(ctx, g2, 0.32);
}

export function sfxBsMiss() {
  const ctx = getCtx();
  const gn2 = gn(ctx, 0); adsr(gn2, ctx, 0.001, 0.16, 0, 0.1, 0.28);
  noise(ctx, gn2, 0.28, 600);
  const g = gn(ctx, 0); adsr(g, ctx, 0.001, 0.1, 0, 0.05, 0.18);
  osc(ctx, g, 'sine', 290, 170, 0.15);
}

export function sfxBsSunk() {
  sfxBsHit();
  const ctx = getCtx();
  [300, 200, 140].forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.16;
    const g = gn(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.26);
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    o.connect(g); o.start(t); o.stop(t + 0.3);
  });
}

export function sfxBsPlace() {
  const ctx = getCtx();
  const g = gn(ctx, 0); adsr(g, ctx, 0.001, 0.08, 0, 0.04, 0.28);
  osc(ctx, g, 'sine', 210, 155, 0.12);
}

export function sfxBsWin() {
  const ctx = getCtx();
  [523, 659, 784, 659, 784, 1047].forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.1;
    const g = gn(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.14);
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    o.connect(g); o.start(t); o.stop(t + 0.17);
  });
}

export function sfxBsLose() {
  const ctx = getCtx();
  [392, 311, 261, 196].forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.22;
    const g = gn(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.32);
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = freq;
    o.connect(g); o.start(t); o.stop(t + 0.35);
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  PUZZLE
// ══════════════════════════════════════════════════════════════════════════

export function sfxPzPlace() {
  const ctx = getCtx();
  const g = gn(ctx, 0); adsr(g, ctx, 0.001, 0.06, 0, 0.03, 0.22);
  osc(ctx, g, 'sine', 310, 230, 0.08);
}

export function sfxPzClear() {
  const ctx = getCtx();
  const g = gn(ctx, 0); adsr(g, ctx, 0.001, 0.26, 0, 0.08, 0.38);
  osc(ctx, g, 'sine', 480, 1180, 0.32);
}

export function sfxPzBoom() {
  const ctx = getCtx();
  const g1 = gn(ctx, 0); adsr(g1, ctx, 0.001, 0.2, 0, 0.1, 0.48);
  osc(ctx, g1, 'sawtooth', 155, 45, 0.3);
  const g2 = gn(ctx, 0); adsr(g2, ctx, 0.001, 0.15, 0, 0.08, 0.32);
  noise(ctx, g2, 0.25);
}

export function sfxPzGameOver() {
  const ctx = getCtx();
  [330, 277, 220, 165].forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.22;
    const g = gn(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.32);
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    o.connect(g); o.start(t); o.stop(t + 0.35);
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  MÚSICA DE FONDO POR NIVEL — scheduler look-ahead (Web Audio API)
//
//  5 melodías distintas de ~4 compases en bucle, estilo gaita/folk.
//  Instrumento: onda cuadrada + filtro paso-bajo para suavizar.
// ══════════════════════════════════════════════════════════════════════════

// Frecuencias usadas (escala pentatónica de Sol mayor + alguna nota modal)
const N = {
  G3: 196, A3: 220, B3: 247, D4: 294, E4: 330,
  G4: 392, A4: 440, B4: 494, D5: 587, E5: 659, G5: 784,
  _:  0,   // silencio
};

// Cada melodía: array de [frecuencia, duracion_en_beats]
// bpm controla la velocidad
const LEVEL_MELODIES = [
  // ── Nivel 1: Benvida — tranquilo, pentatónica sencilla ─────────────────
  {
    bpm: 108,
    notes: [
      [N.G4,1],[N.A4,1],[N.B4,1],[N.D5,2],
      [N.B4,1],[N.A4,1],[N.G4,2],[N._,2],
      [N.D4,1],[N.G4,1],[N.A4,1],[N.B4,1],[N.A4,1],[N.G4,1],[N.D4,2],
      [N._,2],[N.G4,1],[N.D5,1],[N.B4,2],[N.G4,2],
    ],
  },
  // ── Nivel 2: Dúas tetillas — algo más vivo ─────────────────────────────
  {
    bpm: 126,
    notes: [
      [N.G4,1],[N.B4,1],[N.D5,1],[N.G5,1],[N.E5,2],[N.D5,2],
      [N.B4,1],[N.G4,1],[N.A4,1],[N.B4,1],[N.D5,2],[N._,2],
      [N.E5,1],[N.D5,1],[N.B4,1],[N.A4,1],[N.G4,2],[N.B4,2],
      [N.D5,1],[N.E5,1],[N.G5,2],[N._,1],[N.D5,1],[N.G4,2],
    ],
  },
  // ── Nivel 3: Mexillonazo — melodía modal, un poco tensa ────────────────
  {
    bpm: 132,
    notes: [
      [N.A4,1],[N.G4,1],[N.E4,1],[N.D4,1],[N.E4,2],[N.G4,2],
      [N.A4,2],[N.B4,1],[N.A4,1],[N.G4,2],[N._,2],
      [N.D4,1],[N.E4,1],[N.G4,1],[N.A4,1],[N.B4,1],[N.A4,1],[N.G4,1],[N.E4,1],
      [N.D4,2],[N.G4,2],[N.A4,2],[N._,2],
    ],
  },
  // ── Nivel 4: Caos de queixos — ritmo sincopado, energético ─────────────
  {
    bpm: 148,
    notes: [
      [N.G4,0.5],[N._,0.5],[N.B4,0.5],[N._,0.5],[N.D5,1],[N.E5,1],[N.D5,1],[N.B4,1],
      [N.G4,0.5],[N._,0.5],[N.A4,1],[N.G4,1],[N._,1],[N.D5,2],
      [N.E5,0.5],[N.D5,0.5],[N.B4,1],[N.A4,0.5],[N.G4,0.5],[N.B4,1],[N.D5,1],[N._,1],
      [N.G5,1],[N.E5,1],[N.D5,1],[N.B4,0.5],[N._,0.5],[N.G4,2],
    ],
  },
  // ── Nivel 5: A festa — rápido, caótico, festivo ─────────────────────────
  {
    bpm: 168,
    notes: [
      [N.G4,0.5],[N.A4,0.5],[N.B4,0.5],[N.D5,0.5],[N.E5,1],[N.G5,1],[N.E5,1],[N.D5,1],
      [N.B4,0.5],[N.A4,0.5],[N.G4,1],[N._,0.5],[N.D5,0.5],[N.E5,1],[N.D5,1],
      [N.B4,0.5],[N.D5,0.5],[N.G5,1],[N.E5,0.5],[N.D5,0.5],[N.B4,1],[N.A4,0.5],[N.G4,0.5],
      [N.A4,0.5],[N.B4,0.5],[N.D5,0.5],[N.E5,0.5],[N.G5,1],[N.E5,1],[N.D5,1],[N.G4,1],
    ],
  },
];

// ── Estado global del player de música ────────────────────────────────────
let _bgGain     = null;   // GainNode maestro (para fade out)
let _bgInterval = null;   // setInterval del scheduler
let _bgScheduleT = 0;     // tiempo Web Audio hasta el que ya hay notas programadas
let _bgNoteIdx  = 0;      // índice de la nota actual dentro del loop
let _bgMelody   = null;   // melodía activa

const LOOK_AHEAD   = 0.3;  // segundos de anticipación al programar notas
const SCHEDULE_MS  = 80;   // cada cuánto ms dispara el scheduler

function _scheduleNextNotes() {
  if (!_bgMelody || !_bgGain) return;
  const ctx   = getCtx();
  const { bpm, notes } = _bgMelody;
  const beat  = 60 / bpm;
  const until = ctx.currentTime + LOOK_AHEAD;

  while (_bgScheduleT < until) {
    const [freq, dur] = notes[_bgNoteIdx % notes.length];
    const noteDur = dur * beat;

    if (freq > 0) {
      // Oscilador principal (square → gaita/chiflo)
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;

      // Filtro paso-bajo para suavizar los armónicos del square
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq * 3.2;
      f.Q.value = 0.7;

      // Envolvente de nota (evita clicks)
      const noteGain = ctx.createGain();
      const att = 0.018, rel = 0.04;
      noteGain.gain.setValueAtTime(0, _bgScheduleT);
      noteGain.gain.linearRampToValueAtTime(1, _bgScheduleT + att);
      noteGain.gain.setValueAtTime(1, _bgScheduleT + noteDur - rel);
      noteGain.gain.linearRampToValueAtTime(0, _bgScheduleT + noteDur);

      o.connect(f);
      f.connect(noteGain);
      noteGain.connect(_bgGain);
      o.start(_bgScheduleT);
      o.stop(_bgScheduleT + noteDur);
    }

    _bgScheduleT += dur * beat;
    _bgNoteIdx++;
    if (_bgNoteIdx >= notes.length) _bgNoteIdx = 0;
  }
}

/** Empieza la música del nivel `levelIndex` (0-based). */
export function startBgMusic(levelIndex) {
  stopBgMusic();
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  _bgMelody    = LEVEL_MELODIES[levelIndex] ?? LEVEL_MELODIES[0];
  _bgNoteIdx   = 0;
  _bgScheduleT = ctx.currentTime + 0.05;

  // Gain maestro con volumen suave para no tapar los SFX
  _bgGain = ctx.createGain();
  _bgGain.gain.value = 0.13;
  _bgGain.connect(ctx.destination);

  _scheduleNextNotes();
  _bgInterval = setInterval(_scheduleNextNotes, SCHEDULE_MS);
}

/** Detiene la música con un pequeño fade out. */
export function stopBgMusic() {
  if (_bgInterval) { clearInterval(_bgInterval); _bgInterval = null; }
  if (_bgGain) {
    const ctx = getCtx();
    _bgGain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    const g = _bgGain;
    setTimeout(() => { try { g.disconnect(); } catch (_) {} }, 600);
    _bgGain = null;
  }
  _bgMelody  = null;
  _bgNoteIdx = 0;
}

// ══════════════════════════════════════════════════════════════════════════
//  MÚSICA BATTLESHIP — marcha naval tensa, Mi menor, 102 bpm
// ══════════════════════════════════════════════════════════════════════════
const E3=165, G3=196, A3=220, B3=247, D4=294, E4=330, G4=392;

const BATTLESHIP_MELODY = {
  bpm: 102,
  vol: 0.12,
  notes: [
    [E4,0.5],[0,0.5],[B3,0.5],[0,0.5],[E4,1],[G4,1],
    [E4,1],[D4,0.5],[0,0.5],[B3,1],[A3,1],
    [G3,2],[0,1],[B3,0.5],[0,0.5],[E4,1],
    [G4,1],[E4,1],[D4,1],[B3,2],
    [A3,0.5],[0,0.5],[E4,0.5],[0,0.5],[G4,1],[E4,1],
    [D4,1],[B3,1],[A3,1],[G3,1],
    [E3,2],[0,1],[G3,0.5],[0,0.5],[B3,1],
    [E4,2],[D4,1],[B3,1],[E3,2],
  ],
};

let _bsGain = null, _bsInterval = null, _bsT = 0, _bsIdx = 0;

function _scheduleBs() {
  if (!_bsGain) return;
  const ctx   = getCtx();
  const { bpm, notes } = BATTLESHIP_MELODY;
  const beat  = 60 / bpm;
  const until = ctx.currentTime + LOOK_AHEAD;
  while (_bsT < until) {
    const [freq, dur] = notes[_bsIdx % notes.length];
    const nd = dur * beat;
    if (freq > 0) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq * 2.5; f.Q.value = 1.2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, _bsT);
      ng.gain.linearRampToValueAtTime(1, _bsT + 0.02);
      ng.gain.setValueAtTime(1, _bsT + nd - 0.04);
      ng.gain.linearRampToValueAtTime(0, _bsT + nd);
      o.connect(f); f.connect(ng); ng.connect(_bsGain);
      o.start(_bsT); o.stop(_bsT + nd);
    }
    _bsT += dur * beat;
    _bsIdx = (_bsIdx + 1) % notes.length;
  }
}

export function startBattleshipMusic() {
  if (_bsGain) return; // ya sonando
  const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  _bsGain = ctx.createGain(); _bsGain.gain.value = BATTLESHIP_MELODY.vol;
  _bsGain.connect(ctx.destination);
  _bsIdx = 0; _bsT = ctx.currentTime + 0.05;
  _scheduleBs(); _bsInterval = setInterval(_scheduleBs, SCHEDULE_MS);
}

export function stopBattleshipMusic() {
  if (_bsInterval) { clearInterval(_bsInterval); _bsInterval = null; }
  if (_bsGain) {
    const ctx = getCtx(); _bsGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    const g = _bsGain; setTimeout(() => { try { g.disconnect(); } catch (_) {} }, 700);
    _bsGain = null;
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  MÚSICA PUZZLE — electrónica alegre, Do mayor, 155 bpm
// ══════════════════════════════════════════════════════════════════════════
const _E4=330, _G4=392, _A4=440, C5=523, D5=587, _E5=659, _G5=784;

const PUZZLE_MELODY = {
  bpm: 155,
  vol: 0.10,
  notes: [
    [C5,0.5],[_E5,0.5],[_G4,0.5],[_E5,0.5],[C5,1],[_A4,1],[_G4,1],[0,1],
    [D5,0.5],[C5,0.5],[_A4,0.5],[_G4,0.5],[_E4,1],[_G4,1],[_A4,2],
    [C5,0.5],[0,0.5],[_E5,0.5],[0,0.5],[_G5,1],[_E5,1],[D5,1],[C5,1],
    [_A4,0.5],[C5,0.5],[_E5,0.5],[D5,0.5],[C5,1],[0,0.5],[_G4,0.5],[C5,2],
    [_E4,0.5],[_G4,0.5],[_A4,0.5],[C5,0.5],[D5,1],[_E5,1],[D5,1],[C5,1],
    [_A4,0.5],[0,0.5],[_G4,1],[_E4,1],[_G4,2],[0,2],
    [C5,0.5],[D5,0.5],[_E5,0.5],[_G5,0.5],[_E5,1],[D5,1],[C5,0.5],[_A4,0.5],[_G4,1],
    [C5,1],[_E5,1],[_G5,2],[_E5,1],[D5,1],[C5,2],
  ],
};

let _pzGain = null, _pzInterval = null, _pzT = 0, _pzIdx = 0;

function _schedulePz() {
  if (!_pzGain) return;
  const ctx   = getCtx();
  const { bpm, notes } = PUZZLE_MELODY;
  const beat  = 60 / bpm;
  const until = ctx.currentTime + LOOK_AHEAD;
  while (_pzT < until) {
    const [freq, dur] = notes[_pzIdx % notes.length];
    const nd = dur * beat;
    if (freq > 0) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq * 3.5; f.Q.value = 0.6;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, _pzT);
      ng.gain.linearRampToValueAtTime(1, _pzT + 0.012);
      ng.gain.setValueAtTime(1, _pzT + nd - 0.03);
      ng.gain.linearRampToValueAtTime(0, _pzT + nd);
      o.connect(f); f.connect(ng); ng.connect(_pzGain);
      o.start(_pzT); o.stop(_pzT + nd);
    }
    _pzT += dur * beat;
    _pzIdx = (_pzIdx + 1) % notes.length;
  }
}

export function startPuzzleMusic() {
  if (_pzGain) return;
  const ctx = getCtx(); if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  _pzGain = ctx.createGain(); _pzGain.gain.value = PUZZLE_MELODY.vol;
  _pzGain.connect(ctx.destination);
  _pzIdx = 0; _pzT = ctx.currentTime + 0.05;
  _schedulePz(); _pzInterval = setInterval(_schedulePz, SCHEDULE_MS);
}

export function stopPuzzleMusic() {
  if (_pzInterval) { clearInterval(_pzInterval); _pzInterval = null; }
  if (_pzGain) {
    const ctx = getCtx(); _pzGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    const g = _pzGain; setTimeout(() => { try { g.disconnect(); } catch (_) {} }, 700);
    _pzGain = null;
  }
}
