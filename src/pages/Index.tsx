import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Moon, SkipForward, Play, Square, Activity, AlertCircle } from 'lucide-react';
import { getTodayDate, formatTime } from '@/lib/userId';
import { useDailyStats } from '@/hooks/useDailyStats';
import { StatCard } from '@/components/StatCard';
import { BreakPopup } from '@/components/BreakPopup';
import { BlackScreenOverlay } from '@/components/BlackScreenOverlay';
import { SettingsModal, getBreakInterval } from '@/components/SettingsModal';
import { sendBreakNotification, registerServiceWorker, requestNotificationPermission } from '@/lib/notifications';
const Index = () => {
  const navigate = useNavigate();
  const {
    stats,
    loading,
    incrementExerciseCount,
    incrementCloseEyesCount,
    incrementSkipCount,
    addScreenTime,
    incrementEmergencyStopCount
  } = useDailyStats();
  const [isRunning, setIsRunning] = useState(false);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [showBreakPopup, setShowBreakPopup] = useState(false);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRequestedPermission = useRef(false);
  const isMountedRef = useRef(true);

  // Register service worker on mount
  useEffect(() => {
    console.log('🔧 Index component mounted');
    registerServiceWorker();
    isMountedRef.current = true;
    return () => {
      console.log('🔧 Index component unmounting, cleaning up timer');
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
      console.log('🧹 isRunning is false, cleaning up timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isRunning]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        console.log('🧹 Cleaning up timer on unmount');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  const handleStart = useCallback(async () => {
    try {
      console.log('🚀 START clicked!');

      // Prevent multiple starts
      if (isRunning) {
        console.warn('⚠️ Timer already running, ignoring start request');
        return;
      }

      // Clear any existing timer first
      if (timerRef.current) {
        console.log('🧹 Clearing existing timer before start');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Request notification permission on first start
      if (!hasRequestedPermission.current) {
        console.log('🔔 Requesting notification permission');
        try {
          await requestNotificationPermission();
          hasRequestedPermission.current = true;
          console.log('✅ Notification permission granted');
        } catch (error) {
          console.error('❌ Failed to request notification permission:', error);
        }
      }

      // Reset timer to 00:00:00
      console.log('🔄 Resetting timer to 00:00:00');
      setCurrentSessionTime(0);
      setIsRunning(true);
      const breakIntervalSeconds = getBreakInterval() * 60;
      console.log(`⏱️ Starting timer with break interval: ${breakIntervalSeconds} seconds`);

      // Start the timer
      timerRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          console.warn('⚠️ Component unmounted, stopping timer');
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
            console.log(`⏱️ Timer: ${formatTime(newTime)}`);
          }

          // Check for break interval
          if (newTime > 0 && newTime % breakIntervalSeconds === 0) {
            console.log(`🔔 Break reminder triggered at ${formatTime(newTime)}`);
            try {
              sendBreakNotification(Math.floor(newTime / 60));
              setShowBreakPopup(true);
            } catch (error) {
              console.error('❌ Failed to send break notification:', error);
            }
          }
          return newTime;
        });
      }, 1000);
      console.log('✅ Timer started successfully');
    } catch (error) {
      console.error('❌ Error in handleStart:', error);
      setIsRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRunning]);
  const handleStop = useCallback(() => {
    try {
      console.log('🛑 STOP clicked!');
      setIsRunning(false);

      // Clear the timer
      if (timerRef.current) {
        console.log('🧹 Clearing timer interval');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Add current session to today's total
      setCurrentSessionTime(prev => {
        if (prev > 0) {
          console.log(`💾 Saving session time: ${formatTime(prev)}`);
          try {
            addScreenTime(prev);
          } catch (error) {
            console.error('❌ Failed to save screen time:', error);
          }
        }
        return 0; // Reset to 00:00:00
      });
      console.log('✅ Timer stopped and reset to 00:00:00');
    } catch (error) {
      console.error('❌ Error in handleStop:', error);
      // Force cleanup on error
      setIsRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCurrentSessionTime(0);
    }
  }, [addScreenTime]);
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

  // Today's total base from Supabase (accumulated sessions)
  const todaysTotalBase = stats?.total_screen_time_seconds ?? 0;
  // Live today's total = base + current session time
  const todaysTotalLive = todaysTotalBase + (isRunning ? currentSessionTime : 0);
  const totalBreaks = (stats?.exercise_count ?? 0) + (stats?.close_eyes_count ?? 0);
  const totalHours = Math.floor(todaysTotalLive / 3600);
  const emergencyStops = stats?.emergency_stop_count ?? 0;
  return <div className="min-h-screen bg-background flex flex-col">
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
            
            <div className="flex items-center justify-center gap-6 pt-4">
              <SettingsModal />
              
              <button onClick={e => {
              console.log('🔘 START button onClick event fired');
              e.preventDefault();
              e.stopPropagation();
              handleStart();
            }} disabled={isRunning} className={`btn-primary flex items-center gap-3 ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`} type="button">
                <Play className="w-6 h-6" />
                {isRunning ? 'Running...' : 'START'}
              </button>
              
              <button onClick={e => {
              console.log('🔘 STOP button onClick event fired');
              e.preventDefault();
              e.stopPropagation();
              handleStop();
            }} disabled={!isRunning} className={`btn-danger flex items-center gap-3 ${!isRunning ? 'opacity-50 cursor-not-allowed' : ''}`} type="button">
                <Square className="w-6 h-6" />
                STOP / RESET
              </button>
            </div>
            
            {isRunning && <p className="text-muted-foreground animate-pulse-glow">
                Timer running... Break reminder in {Math.floor((getBreakInterval() * 60 - currentSessionTime % (getBreakInterval() * 60)) / 60)} minutes
              </p>}
          </section>

          {/* Stats Cards */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6" style={{
          animationDelay: '0.1s'
        }}>
            <StatCard icon={<Eye className="w-8 h-8" />} label="Eye exercises" value={stats?.exercise_count ?? 0} color="primary" />
            <StatCard icon={<Moon className="w-8 h-8" />} label="Close eyes rest" value={stats?.close_eyes_count ?? 0} color="success" />
            <StatCard icon={<SkipForward className="w-8 h-8" />} label="Skip breaks" value={stats?.skip_count ?? 0} color="warning" />
            <StatCard icon={<AlertCircle className="w-8 h-8" />} label="Emergency stops" value={emergencyStops} color="danger" />
          </section>

          {/* Summary */}
          <section className="text-center text-muted-foreground text-lg" style={{
          animationDelay: '0.2s'
        }}>
            <p>
              Today: <span className="text-foreground font-semibold">{totalHours} hours</span> screen time, 
              <span className="text-foreground font-semibold"> {totalBreaks} total breaks</span> taken.
            </p>
          </section>

          {/* Direct Exercise Button */}
          <section className="text-center" style={{
          animationDelay: '0.3s'
        }}>
            <button onClick={handleDirectExercise} className="btn-accent flex items-center gap-3 mx-auto">
              <Activity className="w-6 h-6" />
              START EYE EXERCISE DIRECTLY
            </button>
          </section>
        </div>
      </main>

      {/* Break Popup */}
      <BreakPopup open={showBreakPopup} intervalMinutes={getBreakInterval()} onEyeExercise={handleEyeExercise} onCloseEyes={handleCloseEyes} onSkip={handleSkip} />

      {/* Black Screen Overlay */}
      <BlackScreenOverlay open={showBlackScreen} onClose={() => setShowBlackScreen(false)} />
    </div>;
};
export default Index;