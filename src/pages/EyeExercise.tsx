import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StopCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ExerciseDot } from '@/components/ExerciseDot';
import { formatMinutesSeconds } from '@/lib/userId';
import { playStartSound, playOpenEyesSound, playEndSound } from '@/lib/sound';
import { getUserSettings, getSpeedValue, getBallSize } from '@/lib/settings';
import { useDailyTracking } from '@/hooks/useDailyTracking';
import { Button } from '@/components/ui/button';

type ExercisePhase = 
  | 'instructions'
  | 'countdown'
  | 'close_eyes'
  | 'vertical'
  | 'horizontal'
  | 'circular'
  | 'diagonal1'
  | 'diagonal2'
  | 'complete';

interface PhaseConfig {
  type: ExercisePhase;
  duration: number;
  instruction: string;
  showDot: boolean;
}

// Full sequence: 5s countdown → 2 complete cycles → end
// Cycle: EC10 → V20 → EC10 → H20 → EC10 → C20 → EC10 → DI20 → EC10 → DII20
const buildExerciseSequence = (): PhaseConfig[] => {
  const settings = getUserSettings();
  
  // Get speed values for each exercise (values are in seconds per pass)
  const vSpeed = getSpeedValue('vertical', settings.speeds.vertical);
  const hSpeed = getSpeedValue('horizontal', settings.speeds.horizontal);
  const cSpeed = getSpeedValue('circular', settings.speeds.circular);
  const d1Speed = getSpeedValue('diagonal1', settings.speeds.diagonal1);
  const d2Speed = getSpeedValue('diagonal2', settings.speeds.diagonal2);

  const cycle: PhaseConfig[] = [
    { type: 'close_eyes', duration: 10, instruction: 'Close your eyes', showDot: false },
    { type: 'vertical', duration: 20, instruction: 'Follow the dot - Vertical', showDot: true },
    { type: 'close_eyes', duration: 10, instruction: 'Close your eyes', showDot: false },
    { type: 'horizontal', duration: 20, instruction: 'Follow the dot - Horizontal', showDot: true },
    { type: 'close_eyes', duration: 10, instruction: 'Close your eyes', showDot: false },
    { type: 'circular', duration: 20, instruction: 'Follow the dot - Circular', showDot: true },
    { type: 'close_eyes', duration: 10, instruction: 'Close your eyes', showDot: false },
    { type: 'diagonal1', duration: 20, instruction: 'Follow the dot - Diagonal ↘', showDot: true },
    { type: 'close_eyes', duration: 10, instruction: 'Close your eyes', showDot: false },
    { type: 'diagonal2', duration: 20, instruction: 'Follow the dot - Diagonal ↙', showDot: true },
  ];

  return [
    { type: 'instructions', duration: 3, instruction: 'Keep head still and arm\'s length, only move your eyes', showDot: false },
    { type: 'countdown', duration: 5, instruction: 'Exercise starts in', showDot: false },
    ...cycle, // First cycle
    ...cycle, // Second cycle
    { type: 'complete', duration: 0, instruction: 'Exercise Complete!', showDot: false },
  ];
};

const EyeExercise = () => {
  const navigate = useNavigate();
  const { incrementEyeExerciseEarlyEnd, flush } = useDailyTracking();
  
  const [exerciseSequence, setExerciseSequence] = useState<PhaseConfig[]>([]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [dotPosition, setDotPosition] = useState({ x: 50, y: 50 });
  const [isComplete, setIsComplete] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const settingsRef = useRef(getUserSettings());
  const ballSizeRef = useRef(getBallSize());

  // Build sequence on mount
  useEffect(() => {
    const sequence = buildExerciseSequence();
    setExerciseSequence(sequence);
    settingsRef.current = getUserSettings();
    ballSizeRef.current = getBallSize();
  }, []);

  const currentPhase = exerciseSequence[currentPhaseIndex];
  const timeRemaining = currentPhase ? currentPhase.duration - phaseTime : 0;

  const stopAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleEarlyEnd = useCallback(async () => {
    stopAllTimers();

    // Ensure the early-end increment is persisted before we navigate away,
    // otherwise a fast refetch on the next page can overwrite it.
    incrementEyeExerciseEarlyEnd();
    await flush();

    toast.info('Early end recorded');
    navigate('/', { state: { fromExercise: true, earlyEnd: true } });
  }, [stopAllTimers, incrementEyeExerciseEarlyEnd, flush, navigate]);

  // Auto-navigate after completion with encouragement
  useEffect(() => {
    if (!isComplete) return;
    
    // Wait 3 seconds for encouragement message, then navigate with auto-start flag
    const timer = setTimeout(() => {
      navigate('/', { state: { fromExercise: true } });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isComplete, navigate]);

  // Dot animation based on phase type with user-configured speeds
  const animateDot = useCallback((type: ExercisePhase, elapsed: number) => {
    const settings = settingsRef.current;
    
    switch (type) {
      case 'vertical': {
        const speed = getSpeedValue('vertical', settings.speeds.vertical);
        const fullCycle = speed * 2; // up-down cycle
        const cycleProgress = (elapsed % fullCycle) / fullCycle;
        const y = cycleProgress < 0.5 
          ? 15 + (cycleProgress * 2) * 70 
          : 85 - ((cycleProgress - 0.5) * 2) * 70;
        setDotPosition({ x: 50, y });
        break;
      }
      case 'horizontal': {
        const speed = getSpeedValue('horizontal', settings.speeds.horizontal);
        const fullCycle = speed * 2; // left-right cycle
        const cycleProgress = (elapsed % fullCycle) / fullCycle;
        const x = cycleProgress < 0.5 
          ? 15 + (cycleProgress * 2) * 70 
          : 85 - ((cycleProgress - 0.5) * 2) * 70;
        setDotPosition({ x, y: 50 });
        break;
      }
      case 'circular': {
        const speed = getSpeedValue('circular', settings.speeds.circular);
        const angle = (elapsed / speed) * Math.PI * 2;
        const radius = 22;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        setDotPosition({ x, y });
        break;
      }
      case 'diagonal1': {
        const speed = getSpeedValue('diagonal1', settings.speeds.diagonal1);
        const fullCycle = speed * 2;
        const cycleProgress = (elapsed % fullCycle) / fullCycle;
        if (cycleProgress < 0.5) {
          const t = cycleProgress * 2;
          setDotPosition({ x: 15 + t * 70, y: 15 + t * 70 });
        } else {
          const t = (cycleProgress - 0.5) * 2;
          setDotPosition({ x: 85 - t * 70, y: 85 - t * 70 });
        }
        break;
      }
      case 'diagonal2': {
        const speed = getSpeedValue('diagonal2', settings.speeds.diagonal2);
        const fullCycle = speed * 2;
        const cycleProgress = (elapsed % fullCycle) / fullCycle;
        if (cycleProgress < 0.5) {
          const t = cycleProgress * 2;
          setDotPosition({ x: 85 - t * 70, y: 15 + t * 70 });
        } else {
          const t = (cycleProgress - 0.5) * 2;
          setDotPosition({ x: 15 + t * 70, y: 85 - t * 70 });
        }
        break;
      }
      default:
        setDotPosition({ x: 50, y: 50 });
    }
  }, []);

  // Main timer effect
  useEffect(() => {
    if (exerciseSequence.length === 0 || isComplete) return;

    timerRef.current = setInterval(() => {
      setPhaseTime((prev) => {
        const newTime = prev + 0.05;
        
        if (!currentPhase) return prev;
        
        if (newTime >= currentPhase.duration) {
          // Move to next phase
          const nextIndex = currentPhaseIndex + 1;
          
          if (nextIndex >= exerciseSequence.length || exerciseSequence[nextIndex].type === 'complete') {
            // Exercise complete!
            setIsComplete(true);
            stopAllTimers();
            playEndSound();
            return prev;
          }
          
          setCurrentPhaseIndex(nextIndex);
          
          // Play appropriate sound
          const nextPhase = exerciseSequence[nextIndex];
          if (nextPhase.showDot && currentPhase.type === 'close_eyes') {
            playOpenEyesSound();
          }
          
          return 0;
        }
        
        // Update dot position for movement phases
        if (currentPhase.showDot) {
          animateDot(currentPhase.type, newTime);
        }
        
        return newTime;
      });
    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentPhaseIndex, currentPhase, animateDot, exerciseSequence, isComplete, stopAllTimers]);

  // Play start sound on first countdown
  useEffect(() => {
    if (currentPhaseIndex === 0 && phaseTime < 0.1 && exerciseSequence.length > 0) {
      playStartSound();
    }
  }, [currentPhaseIndex, phaseTime, exerciseSequence]);

  const getInstructionText = () => {
    if (!currentPhase) return 'Loading...';
    if (currentPhase.type === 'countdown') {
      return `${currentPhase.instruction} ${Math.ceil(timeRemaining)}...`;
    }
    return currentPhase.instruction;
  };

  // Completion screen with encouragement (auto-navigates after 3s)
  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in">
          <p className="text-6xl">👏</p>
          <h1 className="text-4xl font-bold text-success">Great job!</h1>
          <p className="text-xl text-success/80">Eyes refreshed!</p>
          <p className="text-muted-foreground text-lg animate-pulse">
            Returning to main page...
          </p>
        </div>
      </div>
    );
  }

  if (exerciseSequence.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="py-4 px-6 border-b border-border/30 bg-background/80 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-mono text-foreground">Eye Exercise</h1>
            <p className="text-sm text-muted-foreground">Keep head still and arm's length, only move your eyes</p>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-mono text-foreground">
                {formatMinutesSeconds(Math.ceil(timeRemaining))}
              </p>
            </div>
            
            <button
              onClick={handleEarlyEnd}
              className="btn-secondary flex items-center gap-2 py-3"
            >
              <StopCircle className="w-5 h-5" />
              Early End
            </button>
          </div>
        </div>
      </header>

      {/* Exercise Area */}
      <main className="flex-1 relative">
        {/* Instruction overlay - hide during instructions phase */}
        {currentPhase?.type !== 'instructions' && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 text-center">
            <p className="instruction-text text-primary animate-pulse-glow">
              {getInstructionText()}
            </p>
          </div>
        )}

        {/* Dot container */}
        {currentPhase?.showDot && (
          <div className="absolute inset-0 m-8">
            <ExerciseDot x={dotPosition.x} y={dotPosition.y} size={ballSizeRef.current} />
          </div>
        )}

        {/* Close eyes indicator */}
        {currentPhase?.type === 'close_eyes' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="text-8xl mb-4">👁️</div>
              <p className="countdown-text text-primary">
                {Math.ceil(timeRemaining)}
              </p>
            </div>
          </div>
        )}

        {/* Countdown indicator */}
        {currentPhase?.type === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <p className="countdown-text text-accent">
                {Math.ceil(timeRemaining)}
              </p>
            </div>
          </div>
        )}

        {/* Instructions screen - centered green text with pulse effect */}
        {currentPhase?.type === 'instructions' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-fade-in max-w-lg px-8">
              <p className="instruction-text text-primary animate-pulse-glow leading-relaxed">
                Keep head still and arm's length,<br />only move your eyes
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EyeExercise;
