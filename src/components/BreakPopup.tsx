import { Eye, Moon, SkipForward, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BreakPopupProps {
  open: boolean;
  intervalMinutes: number;
  overuseSeconds: number;
  onEyeExercise: () => void;
  onCloseEyes: () => void;
  onSkip: () => void;
}

function formatOveruseTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function BreakPopup({ open, intervalMinutes, overuseSeconds, onEyeExercise, onCloseEyes, onSkip }: BreakPopupProps) {
  const minuteText = intervalMinutes === 1 ? 'minute' : 'minutes';
  const hasOveruse = overuseSeconds > 0;
  
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg bg-card border-border/50" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-3xl font-mono text-center text-foreground mb-4 flex items-center justify-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Break Time!
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-center text-muted-foreground text-lg mb-2">
          You've been working for {intervalMinutes} {minuteText}. Please choose:
        </p>
        
        {hasOveruse && (
          <p className="text-center text-destructive text-lg font-semibold mb-4">
            🔥 Overuse: {formatOveruseTime(overuseSeconds)}
          </p>
        )}
        
        <div className="flex flex-col gap-4 mt-4">
          <button
            onClick={onEyeExercise}
            className="btn-primary flex items-center justify-center gap-3"
          >
            <Eye className="w-6 h-6" />
            Eye Exercise
          </button>
          
          <button
            onClick={onCloseEyes}
            className="btn-secondary flex items-center justify-center gap-3"
          >
            <Moon className="w-6 h-6" />
            Close Eyes Rest
          </button>
          
          <button
            onClick={onSkip}
            className="btn-secondary flex items-center justify-center gap-3 opacity-70 hover:opacity-100"
          >
            <SkipForward className="w-6 h-6" />
            Skip
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
