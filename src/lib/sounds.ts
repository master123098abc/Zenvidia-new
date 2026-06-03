// Sound effects utility using Web Audio API

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    this.enabled = localStorage.getItem('zenova_sounds') !== 'false';
  }

  private init() {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
  }

  public toggleSounds(enable: boolean) {
    this.enabled = enable;
    localStorage.setItem('zenova_sounds', enable.toString());
  }

  public isEnabled() {
    return this.enabled;
  }

  private playTone(frequency: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    oscillator.start();
    oscillator.stop(this.audioCtx.currentTime + duration);
  }

  public playSuccess() {
    if (!this.enabled) return;
    this.playTone(440, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(554.37, 'sine', 0.15, 0.1), 100);
    setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.1), 200);
  }

  public playPop() {
    if (!this.enabled) return;
    this.playTone(600, 'sine', 0.1, 0.05);
  }

  public playSend() {
    if (!this.enabled) return;
    this.playTone(300, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(400, 'sine', 0.1, 0.05), 100);
  }
}

export const sounds = new SoundManager();
