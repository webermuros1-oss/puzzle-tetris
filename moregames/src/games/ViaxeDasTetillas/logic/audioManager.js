// ══════════════════════════════════════════════════════════════════════════
//  audioManager.js — Audio sintetizado con Web Audio API (sin archivos)
// ══════════════════════════════════════════════════════════════════════════
import {
  resumeAudio,
  sfxShoot, sfxPop, sfxDestroy, sfxJump, sfxHitPlayer,
  sfxLevelClear, sfxGameOver, sfxReady,
  startBgMusic, stopBgMusic,
} from '../../../utils/synthSounds.js';

class AudioManager {
  constructor() { this._muted = false; }

  preload() { resumeAudio(); }

  playShoot()      { if (!this._muted) sfxShoot(); }
  playPop()        { if (!this._muted) sfxPop(); }
  playDestroy()    { if (!this._muted) sfxDestroy(); }
  playJump()       { if (!this._muted) sfxJump(); }
  playHitPlayer()  { if (!this._muted) sfxHitPlayer(); }
  playLevelClear() { if (!this._muted) sfxLevelClear(); }
  playGameOver()   { if (!this._muted) sfxGameOver(); }
  playReady()      { if (!this._muted) sfxReady(); }

  playBgMusic(levelIndex = 0) { if (!this._muted) startBgMusic(levelIndex); }
  stopBgMusic()               { stopBgMusic(); }

  setMuted(val)  { this._muted = Boolean(val); if (this._muted) stopBgMusic(); }
  toggleMute()   { this.setMuted(!this._muted); return this._muted; }
}

export const audio = new AudioManager();
