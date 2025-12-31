import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Moon, SkipForward, Play, Square, Activity } from 'lucide-react';
import { getTodayDate, formatTime } from '@/lib/userId';
import { useDailyStats } from '@/hooks/useDailyStats';
import { StatCard } from '@/components/StatCard';
import { BreakPopup } from '@/components/BreakPopup';
import { BlackScreenOverlay } from '@/components/BlackScreenOverlay';

const BREAK_INTERVAL = 30 * 60; // 30 minutes in seconds

const Index = () => {
  const navigate = useNavigate();
  const { stats, loading, incrementExerciseCount, incrementCloseEyesCount, incrementSkipCount, addScreenTime } = useDailyStats();
  
  const [isRunning, setIsRunning] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [showBreakPopup, setShowBreakPopup] = useState(false);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setSessionTime(0);
    sessionStartRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setSessionTime((prev) => {
        const newTime = prev + 1;
        if (newTime > 0 && newTime % BREAK_INTERVAL === 0) {
          setShowBreakPopup(true);
        }
        return newTime;
      });
    }, 1000);
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (sessionTime > 0) {
      addScreenTime(sessionTime);
    }
    setSessionTime(0);
    sessionStartRef.current = null;
  }, [sessionTime, addScreenTime]);

  const handleEyeExercise = useCallback(() => {
    setShowBreakPopup(false);
    incrementExerciseCount();
    navigate('/eye-exercise');
  }, [incrementExerciseCount, navigate]);

  const handleCloseEyes = useCallback(() => {
    setShowBreakPopup(false);
    incrementCloseEyesCount();
    setShowBlackScreen(true);
  }, [incrementCloseEyesCount]);

  const handleSkip = useCallback(() => {
    setShowBreakPopup(false);
    incrementSkipCount();
  }, [incrementSkipCount]);

  const handleDirectExercise = useCallback(() => {
    incrementExerciseCount();
    navigate('/eye-exercise');
  }, [incrementExerciseCount, navigate]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const totalScreenTime = (stats?.total_screen_time_seconds ?? 0) + sessionTime;
  const totalBreaks = (stats?.exercise_count ?? 0) + (stats?.close_eyes_count ?? 0);
  const totalHours = Math.floor(totalScreenTime / 3600);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Date */}
      <header className="py-6 px-8 border-b border-border/30">
        <div className="max-w-6xl mx-auto">
          <p className="text-muted-foreground text-lg font-mono">
            Today's Date: <span className="text-foreground">{getTodayDate()}</span>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="max-w-6xl w-full space-y-12">
          
          {/* Timer Section */}
          <section className="text-center space-y-8 animate-fade-in">
            <h2 className="text-muted-foreground text-xl">Today's screen time</h2>
            
            <div className="timer-display text-primary">
              {formatTime(totalScreenTime)}
            </div>
            
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={handleStart}
                disabled={isRunning}
                className={`btn-primary flex items-center gap-3 ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Play className="w-6 h-6" />
                START
              </button>
              
              <button
                onClick={handleStop}
                disabled={!isRunning}
                className={`btn-danger flex items-center gap-3 ${!isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Square className="w-6 h-6" />
                STOP
              </button>
            </div>
            
            {isRunning && (
              <p className="text-muted-foreground animate-pulse-glow">
                Timer running... Break reminder in {Math.floor((BREAK_INTERVAL - (sessionTime % BREAK_INTERVAL)) / 60)} minutes
              </p>
            )}
          </section>

          {/* Stats Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ animationDelay: '0.1s' }}>
            <StatCard
              icon={<Eye className="w-8 h-8" />}
              label="Eye exercises"
              value={stats?.exercise_count ?? 0}
              color="primary"
            />
            <StatCard
              icon={<Moon className="w-8 h-8" />}
              label="Close eyes rest"
              value={stats?.close_eyes_count ?? 0}
              color="success"
            />
            <StatCard
              icon={<SkipForward className="w-8 h-8" />}
              label="Skip breaks"
              value={stats?.skip_count ?? 0}
              color="warning"
            />
          </section>

          {/* Summary */}
          <section className="text-center text-muted-foreground text-lg" style={{ animationDelay: '0.2s' }}>
            <p>
              Today: <span className="text-foreground font-semibold">{totalHours} hours</span> screen time, 
              <span className="text-foreground font-semibold"> {totalBreaks} total breaks</span> taken.
            </p>
          </section>

          {/* Direct Exercise Button */}
          <section className="text-center" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={handleDirectExercise}
              className="btn-accent flex items-center gap-3 mx-auto"
            >
              <Activity className="w-6 h-6" />
              START EYE EXERCISE DIRECTLY
            </button>
          </section>
        </div>
      </main>

      {/* Break Popup */}
      <BreakPopup
        open={showBreakPopup}
        onEyeExercise={handleEyeExercise}
        onCloseEyes={handleCloseEyes}
        onSkip={handleSkip}
      />

      {/* Black Screen Overlay */}
      <BlackScreenOverlay
        open={showBlackScreen}
        onClose={() => setShowBlackScreen(false)}
      />
    </div>
  );
};

export default Index;
