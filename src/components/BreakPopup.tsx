import { Eye, Moon, SkipForward } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BreakPopupProps {
  open: boolean;
  intervalMinutes: number;
  onEyeExercise: () => void;
  onCloseEyes: () => void;
  onSkip: () => void;
}

export function BreakPopup({ open, intervalMinutes, onEyeExercise, onCloseEyes, onSkip }: BreakPopupProps) {
  const minuteText = intervalMinutes === 1 ? 'minute' : 'minutes';
  
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg bg-card border-border/50" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-3xl font-mono text-center text-foreground mb-4">
            Time for a break!
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-center text-muted-foreground text-lg mb-8">
          You've been working for {intervalMinutes} {minuteText}. Please choose:
        </p>
        
        <div className="flex flex-col gap-4">
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
