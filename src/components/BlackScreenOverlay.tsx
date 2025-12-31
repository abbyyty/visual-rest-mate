import { useState, useEffect, useCallback } from 'react';
import { formatMinutesSeconds } from '@/lib/userId';
import { playEndSound } from '@/lib/sound';

interface BlackScreenOverlayProps {
  open: boolean;
  onClose: () => void;
  duration?: number; // in seconds, default 300 (5 minutes)
}

export function BlackScreenOverlay({ open, onClose, duration = 300 }: BlackScreenOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  const handleEnd = useCallback(() => {
    playEndSound();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setTimeRemaining(duration);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, duration, handleEnd]);

  if (!open) return null;

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
          onClick={onClose}
          className="btn-secondary px-12"
        >
          End Early
        </button>
      </div>
    </div>
  );
}
