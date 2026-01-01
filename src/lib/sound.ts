let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playBeep(frequency: number = 800, duration: number = 150): void {
  try {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.log('Audio not available');
  }
}

// Ding ding sound for break reminders (2 beeps at 800Hz, 300ms apart)
export function playDingDing(): void {
  playBeep(800, 200);
  setTimeout(() => playBeep(800, 200), 300);
}

export function playStartSound(): void {
  playBeep(600, 200);
}

export function playEndSound(): void {
  playBeep(800, 150);
  setTimeout(() => playBeep(1000, 200), 150);
}

export function playOpenEyesSound(): void {
  playBeep(900, 100);
  setTimeout(() => playBeep(1100, 150), 100);
}
