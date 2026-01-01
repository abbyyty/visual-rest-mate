import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, Moon, SkipForward, Play, Square, Activity, AlertCircle, Flame, Pause, RotateCcw } from 'lucide-react';
import { getTodayDate, formatTime } from '@/lib/userId';
import { useDailyStats } from '@/hooks/useDailyStats';
import { StatCard } from '@/components/StatCard';
import { BreakPopup } from '@/components/BreakPopup';
import { BlackScreenOverlay } from '@/components/BlackScreenOverlay';
import { SettingsModal, getBreakInterval } from '@/components/SettingsModal';
import { playDingDing } from '@/lib/sound';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { devLog, devWarn, devError } from '@/lib/logger';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    stats,
    loading,
    incrementExerciseCount,
    incrementCloseEyesCount,
    incrementSkipCount,
    addScreenTime,
    incrementEarlyEndCount,
    addOveruseTime
  } = useDailyStats();
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [showBreakPopup, setShowBreakPopup] = useState(false);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const [sessionOveruseSeconds, setSessionOveruseSeconds] = useState(0); // Overuse since last reminder (for popup)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastDingTimeRef = useRef(0); // When last ding occurred

  // Auto-start from exercise or relax navigation
  const autoStartTriggeredRef = useRef(false);
  
  // Cleanup on unmount
  useEffect(() => {
    devLog('🔧 Index component mounted');
    isMountedRef.current = true;
    return () => {
      devLog('🔧 Index component unmounting, cleaning up timer');
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Cleanup timer when isRunning becomes false
  useEffect(() => {
    if (!isRunning && timerRef.current) {
      devLog('🧹 isRunning is false, cleaning up timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRunning]);

  const handleStart = useCallback(() => {
    try {
      devLog('🚀 START clicked!');

      // If paused, resume from current time
      if (isPaused) {
        devLog('▶️ Resuming from paused state');
        setIsPaused(false);
        setIsRunning(true);
        
        const breakIntervalSeconds = getBreakInterval() * 60;
        
        timerRef.current = setInterval(() => {
          if (!isMountedRef.current) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return;
          }
          
          setCurrentSessionTime(prev => {
            const newTime = prev + 1;

            if (newTime % 10 === 0) {
              devLog(`⏱️ Timer: ${formatTime(newTime)}`);
            }

            if (newTime > 0 && newTime % breakIntervalSeconds === 0) {
              devLog(`🔔 Break reminder triggered at ${formatTime(newTime)}`);
              playDingDing();
              
              const timeSinceLastDing = lastDingTimeRef.current > 0 
                ? newTime - lastDingTimeRef.current 
                : 0;
              
              if (timeSinceLastDing > 0) {
                devLog(`🔥 Adding overuse from ignored reminder: ${formatTime(timeSinceLastDing)}`);
                setSessionOveruseSeconds(prev => prev + timeSinceLastDing);
              }
              
              lastDingTimeRef.current = newTime;
              setShowBreakPopup(true);
            }
            
            return newTime;
          });
        }, 1000);
        
        toast.success('Timer resumed');
        return;
      }

      // Prevent multiple starts
      if (isRunning) {
        devWarn('⚠️ Timer already running, ignoring start request');
        return;
      }

      // Clear any existing timer first
      if (timerRef.current) {
        devLog('🧹 Clearing existing timer before start');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Reset timer to 00:00:00
      devLog('🔄 Resetting timer to 00:00:00');
      setCurrentSessionTime(0);
      setSessionOveruseSeconds(0);
      lastDingTimeRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
      
      const breakIntervalSeconds = getBreakInterval() * 60;
      devLog(`⏱️ Starting timer with break interval: ${breakIntervalSeconds} seconds`);

      // Start the timer
      timerRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          devWarn('⚠️ Component unmounted, stopping timer');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }
        
        setCurrentSessionTime(prev => {
          const newTime = prev + 1;

          // Debug log every 10 seconds
          if (newTime % 10 === 0) {
            devLog(`⏱️ Timer: ${formatTime(newTime)}`);
          }

          // Check for break interval (ding ding every interval)
          if (newTime > 0 && newTime % breakIntervalSeconds === 0) {
            devLog(`🔔 Break reminder triggered at ${formatTime(newTime)}`);
            playDingDing();
            
            // Calculate overuse since last popup (or since start if first popup)
            const timeSinceLastDing = lastDingTimeRef.current > 0 
              ? newTime - lastDingTimeRef.current 
              : 0;
            
            // If user ignored previous reminder, that time is overuse
            if (timeSinceLastDing > 0) {
              devLog(`🔥 Adding overuse from ignored reminder: ${formatTime(timeSinceLastDing)}`);
              setSessionOveruseSeconds(prev => prev + timeSinceLastDing);
            }
            
            lastDingTimeRef.current = newTime;
            setShowBreakPopup(true);
          }
          
          return newTime;
        });
      }, 1000);
      
      devLog('✅ Timer started successfully');
    } catch (error) {
      devError('❌ Error in handleStart:', error);
      setIsRunning(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRunning, isPaused]);

  // Handle auto-start from exercise/relax navigation
  useEffect(() => {
    const state = location.state as {
      fromExercise?: boolean;
      fromRelax?: boolean;
      earlyEnd?: boolean;
    } | null;

    if ((state?.fromExercise || state?.fromRelax) && !autoStartTriggeredRef.current && !isRunning) {
      autoStartTriggeredRef.current = true;

      // Clear the navigation state to prevent re-triggering
      navigate('/', { replace: true, state: {} });

      // Auto-start timer after a short delay
      setTimeout(() => {
        handleStart();
        autoStartTriggeredRef.current = false;
        if (!state?.earlyEnd) {
          toast.success('✅ Timer resumed - stay productive!');
        }
      }, 250);
    }
  }, [location.state, isRunning, navigate, handleStart]);

  const handlePause = useCallback(() => {
    try {
      devLog('⏸️ PAUSE clicked!');
      setIsRunning(false);
      setIsPaused(true);

      // Clear the timer but keep the time
      if (timerRef.current) {
        devLog('🧹 Clearing timer interval (paused)');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      devLog(`✅ Timer paused at ${formatTime(currentSessionTime)}`);
      toast.info('Timer paused');
    } catch (error) {
      devError('❌ Error in handlePause:', error);
    }
  }, [currentSessionTime]);

  const handleReset = useCallback(() => {
    try {
      devLog('🔄 RESET clicked!');
      setIsRunning(false);
      setIsPaused(false);

      // Clear the timer
      if (timerRef.current) {
        devLog('🧹 Clearing timer interval');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Save current session time before reset
      if (currentSessionTime > 0) {
        devLog(`💾 Saving session time before reset: ${formatTime(currentSessionTime)}`);
        addScreenTime(currentSessionTime);
      }
      
      // Save accumulated session overuse to cumulative
      if (sessionOveruseSeconds > 0) {
        devLog(`💾 Saving overuse time: ${formatTime(sessionOveruseSeconds)}`);
        addOveruseTime(sessionOveruseSeconds);
      }
      
      setCurrentSessionTime(0);
      setSessionOveruseSeconds(0);
      lastDingTimeRef.current = 0;
      devLog('✅ Timer reset to 00:00:00');
      toast.success('Timer reset');
    } catch (error) {
      devError('❌ Error in handleReset:', error);
      setIsRunning(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCurrentSessionTime(0);
      setSessionOveruseSeconds(0);
    }
  }, [addScreenTime, addOveruseTime, sessionOveruseSeconds, currentSessionTime]);

  // Calculate session overuse when user clicks (time since last ding)
  const calculateSessionOveruse = useCallback(() => {
    const timeSinceLastDing = currentSessionTime - lastDingTimeRef.current;
    
    // Add time since last ding as session overuse
    if (timeSinceLastDing > 0 && lastDingTimeRef.current > 0) {
      devLog(`🔥 Adding late response overuse: ${formatTime(timeSinceLastDing)}`);
      setSessionOveruseSeconds(prev => prev + timeSinceLastDing);
      return timeSinceLastDing;
    }
    return 0;
  }, [currentSessionTime]);

  const handleEyeExercise = useCallback(() => {
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;
    
    setShowBreakPopup(false);
    incrementExerciseCount();
    
    // Pause timer - will restart when returning
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    
    // Save current session time before navigating
    if (currentSessionTime > 0) {
      addScreenTime(currentSessionTime);
    }
    // Save session overuse to cumulative
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }
    
    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;
    
    navigate('/eye-exercise');
  }, [incrementExerciseCount, navigate, calculateSessionOveruse, currentSessionTime, sessionOveruseSeconds, addScreenTime, addOveruseTime]);

  const handleCloseEyes = useCallback(() => {
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;
    
    setShowBreakPopup(false);
    incrementCloseEyesCount();
    
    // Pause timer - will restart when returning
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    
    // Save current session time
    if (currentSessionTime > 0) {
      addScreenTime(currentSessionTime);
    }
    // Save session overuse to cumulative
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }
    
    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;
    
    setShowBlackScreen(true);
  }, [incrementCloseEyesCount, calculateSessionOveruse, currentSessionTime, sessionOveruseSeconds, addScreenTime, addOveruseTime]);

  const handleSkip = useCallback(() => {
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;

    // Persist this session immediately (no RESET required)
    if (currentSessionTime > 0) {
      addScreenTime(currentSessionTime);
    }
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }

    setShowBreakPopup(false);
    incrementSkipCount();

    // Immediately restart current session timer from 0
    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;

    devLog('⏭️ Skip clicked - restarting timer from 0');
  }, [incrementSkipCount, calculateSessionOveruse, sessionOveruseSeconds, addOveruseTime, currentSessionTime, addScreenTime]);

  const handleDirectExercise = useCallback(() => {
    // Treat direct exercise like a break choice: persist current session, reset,
    // then start the exercise. The timer will auto-resume on return.
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;

    incrementExerciseCount();

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);

    // Persist session
    if (currentSessionTime > 0) {
      addScreenTime(currentSessionTime);
    }
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }

    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;

    navigate('/eye-exercise');
  }, [incrementExerciseCount, navigate, calculateSessionOveruse, currentSessionTime, sessionOveruseSeconds, addScreenTime, addOveruseTime]);

  // Today's total base from Supabase (accumulated sessions)
  const todaysTotalBase = stats?.total_screen_time_seconds ?? 0;
  // Live today's total = base + current session time (running or paused)
  const todaysTotalLive = todaysTotalBase + ((isRunning || isPaused) ? currentSessionTime : 0);
  const totalBreaks = (stats?.exercise_count ?? 0) + (stats?.close_eyes_count ?? 0);
  const totalHours = Math.floor(todaysTotalLive / 3600);
  const earlyEnds = stats?.early_end_count ?? 0;
  // Cumulative daily overuse from Supabase (not including current session yet)
  const cumulativeOveruseSeconds = stats?.overuse_time_seconds ?? 0;
  // Current session overuse for popup display
  const currentSessionOveruse =
    sessionOveruseSeconds +
    (lastDingTimeRef.current > 0
      ? Math.max(0, currentSessionTime - lastDingTimeRef.current)
      : 0);

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
          <section className="text-center space-y-6 animate-fade-in">
            {/* Current Session Timer (Big, Bold) */}
            <div className="space-y-2">
              <h2 className="text-muted-foreground text-lg">Current Session</h2>
              <div className="timer-display text-primary">
                {formatTime(currentSessionTime)}
              </div>
            </div>

            {/* Today's Total Timer (Small, Light) - LIVE */}
            <div className="space-y-1">
              <h3 className="text-muted-foreground text-sm">Today's Total Screen Time</h3>
              <div className="text-2xl font-mono text-muted-foreground">
                {formatTime(todaysTotalLive)}
              </div>
            </div>
            
            {/* Cumulative Daily Overuse Display (Red) */}
            {cumulativeOveruseSeconds > 0 && (
              <div className="space-y-1">
                <h3 className="text-destructive text-sm flex items-center justify-center gap-2">
                  <Flame className="w-4 h-4" />
                  Overuse (Today)
                </h3>
                <div className="text-2xl font-mono text-destructive">
                  {formatTime(cumulativeOveruseSeconds)}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-6 pt-4">
              <SettingsModal />
              
              <button
                onClick={(e) => {
                  devLog('🔘 START button onClick event fired');
                  e.preventDefault();
                  e.stopPropagation();
                  handleStart();
                }}
                disabled={isRunning}
                className={`btn-primary flex items-center gap-3 ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
              >
                <Play className="w-6 h-6" />
                {isPaused ? 'RESUME' : 'START'}
              </button>
              
              <button
                onClick={(e) => {
                  devLog('🔘 PAUSE button onClick event fired');
                  e.preventDefault();
                  e.stopPropagation();
                  handlePause();
                }}
                disabled={!isRunning}
                className={`btn-secondary flex items-center gap-3 ${!isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
              >
                <Pause className="w-6 h-6" />
                PAUSE
              </button>
              
              <button
                onClick={(e) => {
                  devLog('🔘 RESET button onClick event fired');
                  e.preventDefault();
                  e.stopPropagation();
                  handleReset();
                }}
                disabled={currentSessionTime === 0 && !isPaused}
                className={`btn-danger flex items-center gap-3 ${currentSessionTime === 0 && !isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
              >
                <RotateCcw className="w-6 h-6" />
                RESET
              </button>
            </div>
            
            {isRunning && (
              <p className="text-muted-foreground animate-pulse-glow">
                Timer running... Break reminder in {Math.floor((getBreakInterval() * 60 - currentSessionTime % (getBreakInterval() * 60)) / 60)} minutes
              </p>
            )}
            
            {isPaused && (
              <p className="text-warning animate-pulse">
                ⏸️ Timer paused at {formatTime(currentSessionTime)}
              </p>
            )}
          </section>

          {/* Stats Cards */}
          <TooltipProvider>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6" style={{ animationDelay: '0.1s' }}>
              <StatCard 
                icon={<Eye className="w-8 h-8" />} 
                label="Eye exercises" 
                value={stats?.exercise_count ?? 0} 
                color="primary" 
                tooltip="You will be guided to do eye muscle exercise with messages and sound. Timer will be started automatically afterwards. You can leave early under emergency condition and this will be recorded."
              />
              <StatCard 
                icon={<Moon className="w-8 h-8" />} 
                label="Close eyes rest" 
                value={stats?.close_eyes_count ?? 0} 
                color="success" 
                tooltip="You will be guided to have 5 minutes eye-closing program for relaxation. Timer will be started automatically afterwards. You can leave early under emergency condition and this will be recorded."
              />
              <StatCard 
                icon={<SkipForward className="w-8 h-8" />} 
                label="Skip breaks" 
                value={stats?.skip_count ?? 0} 
                color="warning" 
                tooltip="Redirect to the mainpage and timer restarts immediately from 0:00"
              />
              <StatCard 
                icon={<AlertCircle className="w-8 h-8" />} 
                label="Early Ends" 
                value={earlyEnds} 
                color="danger" 
                tooltip="Counts of early ends"
              />
            </section>
          </TooltipProvider>

          {/* Summary */}
          <section className="text-center text-muted-foreground text-lg" style={{ animationDelay: '0.2s' }}>
            <p>
              Today: <span className="text-foreground font-semibold">{totalHours} hours</span> screen time, 
              <span className="text-foreground font-semibold"> {totalBreaks} total breaks</span> taken.
            </p>
          </section>

          {/* Direct Exercise Button */}
          <section className="text-center" style={{ animationDelay: '0.3s' }}>
            <button onClick={handleDirectExercise} className="btn-accent flex items-center gap-3 mx-auto">
              <Activity className="w-6 h-6" />
              Direct Start Exercise
            </button>
          </section>
        </div>
      </main>

      {/* Break Popup */}
      <BreakPopup 
        open={showBreakPopup} 
        intervalMinutes={getBreakInterval()} 
        workedSeconds={currentSessionTime}
        overuseSeconds={currentSessionOveruse > 0 ? currentSessionOveruse : 0}
        onEyeExercise={handleEyeExercise} 
        onCloseEyes={handleCloseEyes} 
        onSkip={handleSkip} 
      />

      {/* Black Screen Overlay */}
      <BlackScreenOverlay 
        open={showBlackScreen} 
        onClose={() => setShowBlackScreen(false)} 
        onEarlyEnd={incrementEarlyEndCount}
      />
    </div>
  );
};

export default Index;