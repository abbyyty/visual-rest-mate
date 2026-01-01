import { useState, useEffect, useCallback } from 'react';
import { formatMinutesSeconds } from '@/lib/userId';
import { playEndSound } from '@/lib/sound';
import { toast } from 'sonner';

interface BlackScreenOverlayProps {
  open: boolean;
  onClose: () => void;
  onEarlyEnd?: () => void;
  duration?: number; // in seconds, default 300 (5 minutes)
}

export function BlackScreenOverlay({ open, onClose, onEarlyEnd, duration = 300 }: BlackScreenOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  const handleEnd = useCallback(() => {
    playEndSound();
    onClose();
  }, [onClose]);

  const handleEarlyEnd = useCallback(() => {
    if (onEarlyEnd) {
      onEarlyEnd();
      toast.success('Early end recorded');
    }
    onClose();
  }, [onClose, onEarlyEnd]);

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
          onClick={handleEarlyEnd}
          className="btn-secondary px-12"
        >
          Early End
        </button>
      </div>
    </div>
  );
}
