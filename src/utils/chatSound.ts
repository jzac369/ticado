let ctx: AudioContext | null = null;

/** Plays a short, soft two-note chime. No external audio assets. */
export function playChatDing() {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    [{ freq: 740, start: 0 }, { freq: 988, start: 0.12 }].forEach(({ freq, start }) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.08, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.35);
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.4);
    });
  } catch {
    // Audio not available (e.g. autoplay restrictions) - fail silently.
  }
}
