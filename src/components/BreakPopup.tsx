import { Eye, Moon, SkipForward, Bell, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
            ⏰ Session overuse: {formatOveruseTime(overuseSeconds)}
          </p>
        )}
        
        <TooltipProvider>
          <div className="flex flex-col gap-4 mt-4">
            <div className="relative">
              <button
                onClick={onEyeExercise}
                className="btn-primary flex items-center justify-center gap-3 w-full"
              >
                <Eye className="w-6 h-6" />
                Eye Exercise
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors">
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>You will be guided to do eye muscle exercise with messages and sound. Timer will be started automatically afterwards. You can leave early under emergency condition and this will be recorded.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="relative">
              <button
                onClick={onCloseEyes}
                className="btn-secondary flex items-center justify-center gap-3 w-full"
              >
                <Moon className="w-6 h-6" />
                Close Eyes Rest
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors">
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>You will be guided to have 5 minutes eye-closing program for relaxation. Timer will be started automatically afterwards. You can leave early under emergency condition and this will be recorded.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="relative">
              <button
                onClick={onSkip}
                className="btn-secondary flex items-center justify-center gap-3 opacity-70 hover:opacity-100 w-full"
              >
                <SkipForward className="w-6 h-6" />
                Skip
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors">
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p>Timer restarts immediately from 0:00</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}