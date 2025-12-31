import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { ExerciseDot } from '@/components/ExerciseDot';
import { formatMinutesSeconds } from '@/lib/userId';
import { playStartSound, playOpenEyesSound } from '@/lib/sound';

type ExercisePhase = 
  | 'countdown'
  | 'close_eyes'
  | 'vertical'
  | 'horizontal'
  | 'circular'
  | 'diagonal1'
  | 'diagonal2';

interface PhaseConfig {
  type: ExercisePhase;
  duration: number;
  instruction: string;
  showDot: boolean;
}

// Sequence starts with countdown only once, then loops from index 1 (close_eyes before vertical)
const EXERCISE_SEQUENCE: PhaseConfig[] = [
  { type: 'countdown', duration: 5, instruction: 'Exercise starts in', showDot: false },
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
  { type: 'close_eyes', duration: 10, instruction: 'Close your eyes', showDot: false },
];

// Loop start index - after initial countdown, loop from here (skips countdown)
const LOOP_START_INDEX = 1;

const EyeExercise = () => {
  const navigate = useNavigate();
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [dotPosition, setDotPosition] = useState({ x: 50, y: 50 });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dotAnimationRef = useRef<NodeJS.Timeout | null>(null);

  const currentPhase = EXERCISE_SEQUENCE[currentPhaseIndex];
  const timeRemaining = currentPhase.duration - phaseTime;

  const stopAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (dotAnimationRef.current) {
      clearInterval(dotAnimationRef.current);
      dotAnimationRef.current = null;
    }
  }, []);

  const handleEmergencyStop = useCallback(() => {
    stopAllTimers();
    navigate('/');
  }, [stopAllTimers, navigate]);

  // Dot animation based on phase type
  const animateDot = useCallback((type: ExercisePhase, elapsed: number, duration: number) => {
    switch (type) {
      case 'vertical': {
        // Move up and down (1s per pass = 20 passes in 20s)
        const cycleProgress = (elapsed % 2) / 2;
        const y = cycleProgress < 0.5 
          ? 15 + (cycleProgress * 2) * 70  // top to bottom
          : 85 - ((cycleProgress - 0.5) * 2) * 70; // bottom to top
        setDotPosition({ x: 50, y });
        break;
      }
      case 'horizontal': {
        // 1.5s per pass (left→right→left = 3s full cycle)
        const cycleProgress = (elapsed % 3) / 3;
        const x = cycleProgress < 0.5 
          ? 15 + (cycleProgress * 2) * 70 
          : 85 - ((cycleProgress - 0.5) * 2) * 70;
        setDotPosition({ x, y: 50 });
        break;
      }
      case 'circular': {
        // 2s per circle = 10 circles in 20s - PERFECT CIRCLE using equal radius
        const angle = (elapsed / 2) * Math.PI * 2;
        // Use 22% for both X and Y to create a perfect circle
        const radius = 22;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        setDotPosition({ x, y });
        break;
      }
      case 'diagonal1': {
        // Top-left to bottom-right (1.5s per diagonal)
        const cycleProgress = (elapsed % 3) / 3;
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
        // Top-right to bottom-left
        const cycleProgress = (elapsed % 3) / 3;
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
    timerRef.current = setInterval(() => {
      setPhaseTime((prev) => {
        const newTime = prev + 0.05;
        
        if (newTime >= currentPhase.duration) {
          // Move to next phase - loop from LOOP_START_INDEX after reaching end (skip countdown on loop)
          let nextIndex = currentPhaseIndex + 1;
          if (nextIndex >= EXERCISE_SEQUENCE.length) {
            nextIndex = LOOP_START_INDEX; // Loop back to close_eyes before vertical (skip countdown)
          }
          setCurrentPhaseIndex(nextIndex);
          
          // Play appropriate sound
          const nextPhase = EXERCISE_SEQUENCE[nextIndex];
          if (nextPhase.showDot && currentPhase.type === 'close_eyes') {
            playOpenEyesSound();
          }
          
          return 0;
        }
        
        // Update dot position for movement phases
        if (currentPhase.showDot) {
          animateDot(currentPhase.type, newTime, currentPhase.duration);
        }
        
        return newTime;
      });
      
      setTotalTime((prev) => prev + 0.05);
    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentPhaseIndex, currentPhase, animateDot]);

  // Play start sound on first countdown
  useEffect(() => {
    if (currentPhaseIndex === 0 && phaseTime < 0.1) {
      playStartSound();
    }
  }, [currentPhaseIndex, phaseTime]);

  const getInstructionText = () => {
    if (currentPhase.type === 'countdown') {
      return `${currentPhase.instruction} ${Math.ceil(timeRemaining)}...`;
    }
    return currentPhase.instruction;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="py-4 px-6 border-b border-border/30 bg-background/80 backdrop-blur-sm z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-mono text-foreground">Eye Exercise</h1>
            <p className="text-sm text-muted-foreground">Keep head still, move only eyes</p>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-mono text-foreground">
                {formatMinutesSeconds(Math.ceil(timeRemaining))}
              </p>
            </div>
            
            <button
              onClick={handleEmergencyStop}
              className="btn-danger flex items-center gap-2 py-3"
            >
              <XCircle className="w-5 h-5" />
              EMERGENCY STOP
            </button>
          </div>
        </div>
      </header>

      {/* Exercise Area */}
      <main className="flex-1 relative">
        {/* Instruction overlay */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 text-center">
          <p className="instruction-text text-primary animate-pulse-glow">
            {getInstructionText()}
          </p>
        </div>

        {/* Dot container */}
        {currentPhase.showDot && (
          <div className="absolute inset-0 m-8">
            <ExerciseDot x={dotPosition.x} y={dotPosition.y} />
          </div>
        )}

        {/* Close eyes indicator */}
        {currentPhase.type === 'close_eyes' && (
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
        {currentPhase.type === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <p className="countdown-text text-accent">
                {Math.ceil(timeRemaining)}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EyeExercise;
