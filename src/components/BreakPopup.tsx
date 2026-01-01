import { Eye, Moon, SkipForward } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BreakPopupProps {
  open: boolean;
  intervalMinutes: number;
  workedSeconds: number;
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

function formatWorkedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function BreakPopup({
  open,
  intervalMinutes,
  workedSeconds,
  overuseSeconds,
  onEyeExercise,
  onCloseEyes,
  onSkip,
}: BreakPopupProps) {
  const minuteText = intervalMinutes === 1 ? 'minute' : 'minutes';
  const hasOveruse = overuseSeconds > 0;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            ⏰ Time for a Break!
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            You've been working for {formatWorkedTime(workedSeconds)}. Take a break to rest your eyes.
          </DialogDescription>
        </DialogHeader>
        
        {hasOveruse && (
          <p className="text-center text-destructive text-lg font-semibold mb-4">
            ⏰ Session overuse: {formatOveruseTime(overuseSeconds)}
          </p>
        )}
        
        <div className="flex flex-col gap-4 mt-4">
          <button
            onClick={onEyeExercise}
            className="btn-primary flex items-center justify-center gap-3 w-full"
          >
            <Eye className="w-6 h-6" />
            Eye Exercise
          </button>
          
          <button
            onClick={onCloseEyes}
            className="btn-secondary flex items-center justify-center gap-3 w-full"
          >
            <Moon className="w-6 h-6" />
            Close Eyes Rest
          </button>
          
          <button
            onClick={onSkip}
            className="btn-secondary flex items-center justify-center gap-3 opacity-70 hover:opacity-100 w-full"
          >
            <SkipForward className="w-6 h-6" />
            Skip
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
