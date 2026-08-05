let ctx: AudioContext | null = null;
let unlocked = false;

/**
 * Browsers keep a freshly-created AudioContext suspended until a real user
 * gesture unlocks it - resume() called later from a Firestore snapshot
 * callback (no gesture in the call stack) silently does nothing, so a chat
 * ding could be scheduled but never actually heard. Call this once at app
 * startup to unlock audio on the visitor's first click/keypress, well
 * before any notification sound needs to play.
 */
export function unlockAudioOnFirstInteraction() {
  if (unlocked || typeof document === 'undefined') return;
  const events = ['pointerdown', 'keydown', 'touchstart'] as const;
  const handler = () => {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    unlocked = true;
    events.forEach((e) => document.removeEventListener(e, handler));
  };
  events.forEach((e) => document.addEventListener(e, handler));
}

function playTones(tones: { freq: number; start: number }[]) {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    tones.forEach(({ freq, start }) => {
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

/** Plays a short, soft two-note chime. No external audio assets. */
export function playChatDing() {
  playTones([{ freq: 740, start: 0 }, { freq: 988, start: 0.12 }]);
}

/** Distinct three-note ping for a brand new ticket - a bit brighter/more
 * urgent than the chat chime so the two are easy to tell apart by ear. */
export function playNewTicketPing() {
  playTones([{ freq: 880, start: 0 }, { freq: 1174, start: 0.1 }, { freq: 1568, start: 0.2 }]);
}
