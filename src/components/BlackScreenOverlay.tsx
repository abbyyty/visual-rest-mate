import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMinutesSeconds } from '@/lib/userId';
import { playEndSound, playDingDing } from '@/lib/sound';
import { toast } from 'sonner';

interface BlackScreenOverlayProps {
  open: boolean;
  onClose: () => void;
  onEarlyEnd?: () => void;
  duration?: number; // in seconds, default 300 (5 minutes)
}

type Phase = 'resting' | 'encouragement';

export function BlackScreenOverlay({ open, onClose, onEarlyEnd, duration = 300 }: BlackScreenOverlayProps) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [phase, setPhase] = useState<Phase>('resting');
  const [countdownValue, setCountdownValue] = useState(5);

  const handleComplete = useCallback(() => {
    // Show encouragement message
    setPhase('encouragement');
    playEndSound();
    
    // After 3 seconds, navigate to main page with auto-start flag
    setTimeout(() => {
      onClose();
      navigate('/', { state: { fromRelax: true } });
    }, 3000);
  }, [onClose, navigate]);

  const handleEarlyEnd = useCallback(() => {
    if (onEarlyEnd) {
      onEarlyEnd();
    }
    
    // Show encouragement then navigate with auto-start
    setPhase('encouragement');
    
    setTimeout(() => {
      onClose();
      navigate('/', { state: { fromRelax: true } });
    }, 2000);
  }, [onClose, onEarlyEnd, navigate]);

  // Main resting timer
  useEffect(() => {
    if (!open || phase !== 'resting') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer complete - go directly to encouragement (no countdown at end)
          playDingDing();
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, phase, handleComplete]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setTimeRemaining(duration);
      setPhase('resting');
      setCountdownValue(5);
    }
  }, [open, duration]);

  if (!open) return null;

  // Encouragement phase
  if (phase === 'encouragement') {
    return (
      <div className="black-screen-overlay">
        <div className="text-center animate-fade-in">
          <p className="text-6xl mb-6">👏</p>
          <p className="text-success text-3xl md:text-4xl font-bold mb-4">
            You did well!!
          </p>
          <p className="text-success/80 text-xl">
            Keep protecting your eyes!
          </p>
        </div>
      </div>
    );
  }

  // Countdown phase (resume work countdown)
  if (phase === 'countdown') {
    return (
      <div className="black-screen-overlay">
        <div className="text-center animate-fade-in">
          <p className="text-foreground/80 text-2xl md:text-3xl mb-8">
            Resume work in...
          </p>
          <div className="countdown-text text-accent">
            {countdownValue}
          </div>
        </div>
      </div>
    );
  }

  // Resting phase (main timer)
  return (
    <div className="black-screen-overlay">
      <div className="text-center animate-fade-in">
        <p className="text-foreground/80 text-2xl md:text-3xl mb-8 font-mono">
          Please close your eyes and rest
        </p>
        
        <p className="text-muted-foreground text-xl mb-4">Remaining</p>
        
        <div className="countdown-text text-foreground mb-12">
          {formatMinutesSeconds(timeRemaining)}
        </div>
        
        <button
          onClick={handleEarlyEnd}
          className="btn-secondary px-12"
        >
          Early End
        </button>
      </div>
    </div>
  );
}
