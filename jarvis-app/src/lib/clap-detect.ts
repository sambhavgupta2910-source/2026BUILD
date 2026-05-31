export class ClapDetector {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private animFrame = 0;
  private lastClapTime = 0;
  private cooldown = false;
  private onDoubleClap: () => void;

  // Tuning
  private readonly THRESHOLD = 28;       // amplitude spike level (0-128)
  private readonly DOUBLE_MIN = 120;     // ms — min gap between claps
  private readonly DOUBLE_MAX = 550;     // ms — max gap for double-clap
  private readonly COOLDOWN_MS = 1800;   // ms before another double-clap fires

  constructor(onDoubleClap: () => void) {
    this.onDoubleClap = onDoubleClap;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.ctx = new AudioContext();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0;
    source.connect(this.analyser);
    this.loop();
  }

  private loop = () => {
    this.animFrame = requestAnimationFrame(this.loop);
    if (!this.analyser || this.cooldown) return;

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);

    // RMS volume
    let sum = 0;
    for (const v of data) sum += Math.abs(v - 128);
    const vol = sum / data.length;

    if (vol > this.THRESHOLD) {
      const now = Date.now();
      const gap = now - this.lastClapTime;

      if (gap > this.DOUBLE_MIN && gap < this.DOUBLE_MAX) {
        // Double clap confirmed
        this.cooldown = true;
        setTimeout(() => { this.cooldown = false; }, this.COOLDOWN_MS);
        this.lastClapTime = 0;
        this.onDoubleClap();
      } else if (gap > this.DOUBLE_MAX || this.lastClapTime === 0) {
        this.lastClapTime = now;
      }
    }
  };

  stop(): void {
    cancelAnimationFrame(this.animFrame);
    this.stream?.getTracks().forEach(t => t.stop());
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
  }
}
