import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, Moon, SkipForward, Play, Activity, AlertCircle, Flame, Pause, RotateCcw, BarChart3, LogOut } from 'lucide-react';
import { getTodayDate, formatTime, formatMinutesSeconds } from '@/lib/userId';
import { useDailyTracking } from '@/hooks/useDailyTracking';
import { StatCard } from '@/components/StatCard';
import { BreakPopup } from '@/components/BreakPopup';
import { BlackScreenOverlay } from '@/components/BlackScreenOverlay';
import { SettingsModal, getBreakInterval } from '@/components/SettingsModal';
import { playDingDing } from '@/lib/sound';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { devLog, devWarn, devError } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';

type TimerSnapshot = {
  accumulatedSeconds: number;
  sessionOveruseSeconds: number;
  lastDingTime: number;
  wasRunning: boolean;
  wasPaused: boolean;
  savedAt: number;
};

const TIMER_SNAPSHOT_KEY = 'timer_snapshot_v1';

// Navigation snapshot (sessionStorage - for /data page round-trips)
function saveTimerSnapshot(snapshot: TimerSnapshot) {
  try {
    sessionStorage.setItem(TIMER_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch { /* ignore */ }
}

function loadTimerSnapshot(): TimerSnapshot | null {
  try {
    const raw = sessionStorage.getItem(TIMER_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TimerSnapshot>;
    if (
      typeof parsed.accumulatedSeconds !== 'number' ||
      typeof parsed.sessionOveruseSeconds !== 'number' ||
      typeof parsed.lastDingTime !== 'number' ||
      typeof parsed.wasRunning !== 'boolean' ||
      typeof parsed.wasPaused !== 'boolean'
    ) return null;
    return {
      accumulatedSeconds: parsed.accumulatedSeconds,
      sessionOveruseSeconds: parsed.sessionOveruseSeconds,
      lastDingTime: parsed.lastDingTime,
      wasRunning: parsed.wasRunning,
      wasPaused: parsed.wasPaused,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch { return null; }
}

function clearTimerSnapshot() {
  try { sessionStorage.removeItem(TIMER_SNAPSHOT_KEY); } catch { /* ignore */ }
}

// Persistent timer state (localStorage - survives tab drag-out / reload)
const PERSISTENT_TIMER_KEY = 'persistent_timer_v1';

type PersistentTimerState = {
  /** Date.now() when current running segment started (0 if paused/stopped) */
  sessionStartedAt: number;
  /** Accumulated seconds before current running segment */
  pausedElapsed: number;
  sessionOveruseSeconds: number;
  lastDingTime: number;
  isRunning: boolean;
  isPaused: boolean;
  savedAt: number;
};

function savePersistentTimer(state: PersistentTimerState) {
  try { localStorage.setItem(PERSISTENT_TIMER_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function loadPersistentTimer(): PersistentTimerState | null {
  try {
    const raw = localStorage.getItem(PERSISTENT_TIMER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PersistentTimerState>;
    if (typeof p.sessionStartedAt !== 'number' || typeof p.pausedElapsed !== 'number' ||
        typeof p.isRunning !== 'boolean' || typeof p.isPaused !== 'boolean') return null;
    // Discard if older than 24 hours
    if (typeof p.savedAt === 'number' && Date.now() - p.savedAt > 24 * 60 * 60 * 1000) return null;
    return p as PersistentTimerState;
  } catch { return null; }
}

function clearPersistentTimer() {
  try { localStorage.removeItem(PERSISTENT_TIMER_KEY); } catch { /* ignore */ }
}

// Request notification permission
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// Show a browser notification for break reminders
function showBreakNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('🧘 Time for a Break!', {
        body: "You've been working. Take a break to rest your eyes.",
        icon: '/favicon.ico',
        tag: 'break-reminder',
        requireInteraction: true,
      });
    } catch {
      // Notification constructor may fail in some contexts
    }
  }
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, username } = useAuth();
  const {
    tracking,
    loading,
    incrementEyeExercise,
    incrementEyeClose,
    incrementSkip,
    addScreenTime,
    incrementEyeExerciseEarlyEnd,
    incrementEyeCloseEarlyEnd,
    addOveruseTime,
    getScreenTimeSeconds,
    getOveruseTimeSeconds,
    flush
  } = useDailyTracking();
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [showBreakPopup, setShowBreakPopup] = useState(false);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const [sessionOveruseSeconds, setSessionOveruseSeconds] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastDingTimeRef = useRef(0);

  // Timestamp-based timing refs
  const sessionStartedAtRef = useRef<number>(0); // Date.now() when current running segment began
  const pausedElapsedRef = useRef<number>(0); // accumulated seconds before current running segment

  // Notification timeout ref for background break alerts
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-start from exercise or relax navigation
  const autoStartTriggeredRef = useRef(false);

  // Get real elapsed seconds based on timestamps
  const getRealElapsed = useCallback(() => {
    if (!sessionStartedAtRef.current) return pausedElapsedRef.current;
    return pausedElapsedRef.current + Math.floor((Date.now() - sessionStartedAtRef.current) / 1000);
  }, []);

  // Check for break intervals and trigger popup/notification/sound
  const checkBreakIntervals = useCallback((realElapsed: number) => {
    const breakIntervalSeconds = getBreakInterval() * 60;
    if (realElapsed <= 0 || realElapsed < breakIntervalSeconds) return;

    const intervalsPassed = Math.floor(realElapsed / breakIntervalSeconds);
    const lastDingInterval = lastDingTimeRef.current > 0
      ? Math.floor(lastDingTimeRef.current / breakIntervalSeconds)
      : 0;

    if (intervalsPassed > lastDingInterval) {
      devLog(`🔔 Break reminder triggered at ${formatMinutesSeconds(realElapsed)}`);
      playDingDing();
      showBreakNotification();

      const newDingTime = intervalsPassed * breakIntervalSeconds;
      const timeSinceLastDing = lastDingTimeRef.current > 0
        ? newDingTime - lastDingTimeRef.current
        : 0;

      if (timeSinceLastDing > 0 && lastDingTimeRef.current > 0) {
        devLog(`🔥 Adding overuse from ignored reminder: ${formatMinutesSeconds(timeSinceLastDing)}`);
        setSessionOveruseSeconds(prev => prev + timeSinceLastDing);
      }

      lastDingTimeRef.current = newDingTime;
      setShowBreakPopup(true);
    }
  }, []);

  // Schedule a background notification timeout for the next break
  const scheduleBreakNotification = useCallback(() => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
      notifTimeoutRef.current = null;
    }

    const breakIntervalSeconds = getBreakInterval() * 60;
    const elapsed = getRealElapsed();
    const nextBreakAt = (Math.floor(elapsed / breakIntervalSeconds) + 1) * breakIntervalSeconds;
    const delayMs = (nextBreakAt - elapsed) * 1000;

    if (delayMs > 0) {
      notifTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && sessionStartedAtRef.current) {
          const realElapsed = getRealElapsed();
          setCurrentSessionTime(realElapsed);
          checkBreakIntervals(realElapsed);
          // Schedule the next one
          scheduleBreakNotification();
        }
      }, delayMs);
    }
  }, [getRealElapsed, checkBreakIntervals]);

  // Start the timer tick interval (timestamp-based)
  const startTimerTick = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        return;
      }

      const realElapsed = getRealElapsed();
      setCurrentSessionTime(realElapsed);

      if (realElapsed % 10 === 0 && realElapsed > 0) {
        devLog(`⏱️ Timer: ${formatMinutesSeconds(realElapsed)}`);
      }

      checkBreakIntervals(realElapsed);
    }, 1000);
  }, [getRealElapsed, checkBreakIntervals]);
  
  // Helper: persist current timer state to localStorage
  const persistTimerState = useCallback(() => {
    savePersistentTimer({
      sessionStartedAt: sessionStartedAtRef.current,
      pausedElapsed: pausedElapsedRef.current,
      sessionOveruseSeconds,
      lastDingTime: lastDingTimeRef.current,
      isRunning,
      isPaused,
      savedAt: Date.now(),
    });
  }, [sessionOveruseSeconds, isRunning, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    devLog('🔧 Index component mounted');
    isMountedRef.current = true;

    // --- Restore persistent timer state on mount (survives reload / drag-out) ---
    // Only restore if there's no navigation state (fromData, fromExercise, etc.)
    const navState = location.state as Record<string, unknown> | null;
    const hasNavState = navState && (navState.fromData || navState.fromExercise || navState.fromRelax);

    if (!hasNavState) {
      const persisted = loadPersistentTimer();
      if (persisted && (persisted.isRunning || persisted.isPaused)) {
        devLog('🔄 Restoring persistent timer state from localStorage');

        lastDingTimeRef.current = persisted.lastDingTime ?? 0;

        if (persisted.isRunning && persisted.sessionStartedAt > 0) {
          // Timer was running — calculate elapsed since save
          const elapsedSinceSave = Math.floor((Date.now() - persisted.sessionStartedAt) / 1000);
          const totalAccumulated = persisted.pausedElapsed + elapsedSinceSave;

          pausedElapsedRef.current = totalAccumulated;
          sessionStartedAtRef.current = Date.now();

          setCurrentSessionTime(totalAccumulated);
          setSessionOveruseSeconds(persisted.sessionOveruseSeconds ?? 0);
          setIsRunning(true);
          setIsPaused(false);

          // Start ticking & schedule notifications
          startTimerTick();
          scheduleBreakNotification();

          // Check if break intervals were missed while reloading
          checkBreakIntervals(totalAccumulated);
        } else if (persisted.isPaused) {
          pausedElapsedRef.current = persisted.pausedElapsed;
          sessionStartedAtRef.current = 0;

          setCurrentSessionTime(persisted.pausedElapsed);
          setSessionOveruseSeconds(persisted.sessionOveruseSeconds ?? 0);
          setIsRunning(false);
          setIsPaused(true);
        }
      }
    }

    return () => {
      devLog('🔧 Index component unmounting, cleaning up timer');
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (notifTimeoutRef.current) {
        clearTimeout(notifTimeoutRef.current);
        notifTimeoutRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save persistent state on beforeunload (tab close, reload, drag-out)
  useEffect(() => {
    const handleBeforeUnload = () => {
      savePersistentTimer({
        sessionStartedAt: sessionStartedAtRef.current,
        pausedElapsed: pausedElapsedRef.current,
        sessionOveruseSeconds,
        lastDingTime: lastDingTimeRef.current,
        isRunning,
        isPaused,
        savedAt: Date.now(),
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionOveruseSeconds, isRunning, isPaused]);

  // Periodically persist timer state every 5 seconds while running
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => persistTimerState(), 5000);
    return () => clearInterval(id);
  }, [isRunning, persistTimerState]);

  // Cleanup timer when isRunning becomes false
  useEffect(() => {
    if (!isRunning && timerRef.current) {
      devLog('🧹 isRunning is false, cleaning up timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!isRunning && notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
      notifTimeoutRef.current = null;
    }
  }, [isRunning]);

  // Handle tab visibility change - catch up on missed time
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && sessionStartedAtRef.current) {
        const realElapsed = getRealElapsed();
        devLog(`👁️ Tab visible again, real elapsed: ${formatMinutesSeconds(realElapsed)}`);
        setCurrentSessionTime(realElapsed);
        checkBreakIntervals(realElapsed);
        // Re-schedule notification for next interval
        scheduleBreakNotification();
      }
      // Save state when going hidden (in case tab gets killed)
      if (document.visibilityState === 'hidden' && (isRunning || isPaused)) {
        savePersistentTimer({
          sessionStartedAt: sessionStartedAtRef.current,
          pausedElapsed: pausedElapsedRef.current,
          sessionOveruseSeconds,
          lastDingTime: lastDingTimeRef.current,
          isRunning,
          isPaused,
          savedAt: Date.now(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, isPaused, sessionOveruseSeconds, getRealElapsed, checkBreakIntervals, scheduleBreakNotification]);

  const handleStart = useCallback(() => {
    try {
      devLog('🚀 START clicked!');

      // Request notification permission
      requestNotificationPermission();

      // If paused, resume from current time
      if (isPaused) {
        devLog('▶️ Resuming from paused state');
        setIsPaused(false);
        setIsRunning(true);
        
        // Set the start timestamp for this new running segment
        sessionStartedAtRef.current = Date.now();
        // pausedElapsedRef already has the accumulated time
        
        startTimerTick();
        scheduleBreakNotification();
        
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

      // Reset timer to 00:00
      devLog('🔄 Resetting timer to 00:00');
      setCurrentSessionTime(0);
      setSessionOveruseSeconds(0);
      lastDingTimeRef.current = 0;
      pausedElapsedRef.current = 0;
      sessionStartedAtRef.current = Date.now();
      setIsRunning(true);
      setIsPaused(false);
      
      const breakIntervalSeconds = getBreakInterval() * 60;
      devLog(`⏱️ Starting timer with break interval: ${breakIntervalSeconds} seconds`);

      startTimerTick();
      scheduleBreakNotification();
      
      devLog('✅ Timer started successfully');
    } catch (error) {
      devError('❌ Error in handleStart:', error);
      setIsRunning(false);
      setIsPaused(false);
      sessionStartedAtRef.current = 0;
      pausedElapsedRef.current = 0;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRunning, isPaused, startTimerTick, scheduleBreakNotification]);

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

  // Resume the timer after viewing /data (without resetting)
  useEffect(() => {
    const state = location.state as { fromData?: boolean } | null;
    if (!state?.fromData) return;

    const snapshot = loadTimerSnapshot();
    clearTimerSnapshot();

    // Clear the navigation state to prevent re-triggering
    navigate('/', { replace: true, state: {} });

    if (!snapshot) return;

    setShowBreakPopup(false);
    setShowBlackScreen(false);

    // Calculate time that passed while on data page
    const elapsedWhileAway = snapshot.wasRunning
      ? Math.floor((Date.now() - snapshot.savedAt) / 1000)
      : 0;
    const totalAccumulated = snapshot.accumulatedSeconds + elapsedWhileAway;

    setCurrentSessionTime(totalAccumulated);
    setSessionOveruseSeconds(snapshot.sessionOveruseSeconds);
    lastDingTimeRef.current = snapshot.lastDingTime;

    if (!snapshot.wasRunning) {
      pausedElapsedRef.current = snapshot.accumulatedSeconds;
      sessionStartedAtRef.current = 0;
      setIsRunning(false);
      setIsPaused(snapshot.wasPaused);
      return;
    }

    // Resume ticking - set refs for timestamp-based timing
    pausedElapsedRef.current = totalAccumulated;
    sessionStartedAtRef.current = Date.now();

    setIsPaused(false);
    setIsRunning(true);

    startTimerTick();
    scheduleBreakNotification();

    // Check if any break intervals were missed while away
    checkBreakIntervals(totalAccumulated);
  }, [location.state, navigate, startTimerTick, scheduleBreakNotification, checkBreakIntervals]);

  const handlePause = useCallback(() => {
    try {
      devLog('⏸️ PAUSE clicked!');
      
      // Capture real elapsed before stopping
      const realElapsed = getRealElapsed();
      pausedElapsedRef.current = realElapsed;
      sessionStartedAtRef.current = 0;
      
      setIsRunning(false);
      setIsPaused(true);
      setCurrentSessionTime(realElapsed);

      // Clear the timer but keep the time
      if (timerRef.current) {
        devLog('🧹 Clearing timer interval (paused)');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Persist paused state so it survives reload
      savePersistentTimer({
        sessionStartedAt: 0,
        pausedElapsed: realElapsed,
        sessionOveruseSeconds,
        lastDingTime: lastDingTimeRef.current,
        isRunning: false,
        isPaused: true,
        savedAt: Date.now(),
      });

      devLog(`✅ Timer paused at ${formatMinutesSeconds(realElapsed)}`);
      toast.info('Timer paused');
    } catch (error) {
      devError('❌ Error in handlePause:', error);
    }
  }, [getRealElapsed]);

  const handleReset = useCallback(() => {
    try {
      devLog('🔄 RESET clicked!');
      
      const realElapsed = getRealElapsed();
      
      setIsRunning(false);
      setIsPaused(false);

      // Clear the timer
      if (timerRef.current) {
        devLog('🧹 Clearing timer interval');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Save current session time before reset
      if (realElapsed > 0) {
        devLog(`💾 Saving session time before reset: ${formatMinutesSeconds(realElapsed)}`);
        addScreenTime(realElapsed);
      }
      
      // Save accumulated session overuse to cumulative
      if (sessionOveruseSeconds > 0) {
        devLog(`💾 Saving overuse time: ${formatMinutesSeconds(sessionOveruseSeconds)}`);
        addOveruseTime(sessionOveruseSeconds);
      }
      
      setCurrentSessionTime(0);
      setSessionOveruseSeconds(0);
      lastDingTimeRef.current = 0;
      pausedElapsedRef.current = 0;
      sessionStartedAtRef.current = 0;
      clearPersistentTimer();
      devLog('✅ Timer reset to 00:00');
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
      pausedElapsedRef.current = 0;
      sessionStartedAtRef.current = 0;
    }
  }, [getRealElapsed, addScreenTime, addOveruseTime, sessionOveruseSeconds]);

  // Calculate session overuse when user clicks (time since last ding)
  const calculateSessionOveruse = useCallback(() => {
    const realElapsed = getRealElapsed();
    const timeSinceLastDing = realElapsed - lastDingTimeRef.current;
    
    // Add time since last ding as session overuse
    if (timeSinceLastDing > 0 && lastDingTimeRef.current > 0) {
      devLog(`🔥 Adding late response overuse: ${formatMinutesSeconds(timeSinceLastDing)}`);
      setSessionOveruseSeconds(prev => prev + timeSinceLastDing);
      return timeSinceLastDing;
    }
    return 0;
  }, [getRealElapsed]);

  const handleEyeExercise = useCallback(() => {
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;
    const realElapsed = getRealElapsed();
    
    setShowBreakPopup(false);
    incrementEyeExercise();
    
    // Pause timer - will restart when returning
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    
    // Save current session time before navigating
    if (realElapsed > 0) {
      addScreenTime(realElapsed);
    }
    // Save session overuse to cumulative
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }
    
    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;
    pausedElapsedRef.current = 0;
    sessionStartedAtRef.current = 0;
    
    clearPersistentTimer();
    navigate('/eye-exercise');
  }, [incrementEyeExercise, navigate, calculateSessionOveruse, getRealElapsed, sessionOveruseSeconds, addScreenTime, addOveruseTime]);

  const handleCloseEyes = useCallback(() => {
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;
    const realElapsed = getRealElapsed();
    
    setShowBreakPopup(false);
    incrementEyeClose();
    
    // Pause timer - will restart when returning
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    
    // Save current session time
    if (realElapsed > 0) {
      addScreenTime(realElapsed);
    }
    // Save session overuse to cumulative
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }
    
    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;
    pausedElapsedRef.current = 0;
    sessionStartedAtRef.current = 0;
    
    clearPersistentTimer();
    setShowBlackScreen(true);
  }, [incrementEyeClose, calculateSessionOveruse, getRealElapsed, sessionOveruseSeconds, addScreenTime, addOveruseTime]);

  const handleSkip = useCallback(() => {
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;
    const realElapsed = getRealElapsed();

    // Persist this session immediately (no RESET required)
    if (realElapsed > 0) {
      addScreenTime(realElapsed);
    }
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }

    setShowBreakPopup(false);
    incrementSkip();

    // Immediately restart current session timer from 0
    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;
    pausedElapsedRef.current = 0;
    sessionStartedAtRef.current = Date.now();

    // Restart the tick
    startTimerTick();
    scheduleBreakNotification();

    devLog('⏭️ Skip clicked - restarting timer from 0');
  }, [incrementSkip, calculateSessionOveruse, getRealElapsed, sessionOveruseSeconds, addOveruseTime, addScreenTime, startTimerTick, scheduleBreakNotification]);

  const handleDirectExercise = useCallback(() => {
    const lateOveruse = calculateSessionOveruse();
    const totalSessionOveruse = sessionOveruseSeconds + lateOveruse;
    const realElapsed = getRealElapsed();

    incrementEyeExercise();

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);

    // Persist session
    if (realElapsed > 0) {
      addScreenTime(realElapsed);
    }
    if (totalSessionOveruse > 0) {
      addOveruseTime(totalSessionOveruse);
    }

    setCurrentSessionTime(0);
    setSessionOveruseSeconds(0);
    lastDingTimeRef.current = 0;
    pausedElapsedRef.current = 0;
    sessionStartedAtRef.current = 0;

    clearPersistentTimer();
    navigate('/eye-exercise');
  }, [incrementEyeExercise, navigate, calculateSessionOveruse, getRealElapsed, sessionOveruseSeconds, addScreenTime, addOveruseTime]);

  // Today's total base from database (accumulated sessions)
  const todaysTotalBase = getScreenTimeSeconds();
  // Live today's total = base + current session time (running or paused)
  const todaysTotalLive = todaysTotalBase + ((isRunning || isPaused) ? currentSessionTime : 0);
  const totalBreaks = (tracking?.daily_sessions_eye_exercise ?? 0) + (tracking?.daily_sessions_eye_close ?? 0);
  const totalHours = Math.floor(todaysTotalLive / 3600);
  const eyeExerciseEarlyEnds = tracking?.daily_sessions_eye_exercise_early_end ?? 0;
  const eyeCloseEarlyEnds = tracking?.daily_sessions_eye_close_early_end ?? 0;
  const earlyEnds = eyeExerciseEarlyEnds + eyeCloseEarlyEnds;
  // Cumulative daily overuse from database (not including current session yet)
  const cumulativeOveruseSeconds = getOveruseTimeSeconds();
  // Current session overuse for popup display
  const currentSessionOveruse =
    sessionOveruseSeconds +
    (lastDingTimeRef.current > 0
      ? Math.max(0, currentSessionTime - lastDingTimeRef.current)
      : 0);

  const handleViewData = useCallback(() => {
    const realElapsed = getRealElapsed();
    
    saveTimerSnapshot({
      accumulatedSeconds: realElapsed,
      sessionOveruseSeconds,
      lastDingTime: lastDingTimeRef.current,
      wasRunning: isRunning,
      wasPaused: isPaused,
      savedAt: Date.now(),
    });

    // Pause timer while on the data page (but keep the session time)
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setShowBreakPopup(false);

    if (isRunning) {
      pausedElapsedRef.current = realElapsed;
      sessionStartedAtRef.current = 0;
      setIsRunning(false);
      setIsPaused(true);
    }
  }, [getRealElapsed, sessionOveruseSeconds, isRunning, isPaused]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Date and User */}
      <header className="py-6 px-8 border-b border-border/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-muted-foreground text-lg font-mono">
            Today's Date: <span className="text-foreground">{getTodayDate()}</span>
          </p>
          <div className="flex items-center gap-4">
            {username && (
              <span className="text-muted-foreground">
                Welcome, <span className="text-foreground">{username}</span>
              </span>
            )}
            <Link
              to="/data"
              onClick={handleViewData}
              className="btn-secondary py-2 px-4 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              View My Data
            </Link>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="max-w-6xl w-full space-y-12">
          
          {/* Timer Section */}
          <section className="text-center space-y-6 animate-fade-in">
            {/* Current Session Timer (Big, Bold) - MM:SS format */}
            <div className="space-y-2">
              <h2 className="text-muted-foreground text-lg">Current Session</h2>
              <div className="timer-display text-primary">
                {formatMinutesSeconds(currentSessionTime)}
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
                ⏸️ Timer paused at {formatMinutesSeconds(currentSessionTime)}
              </p>
            )}
          </section>

          {/* Stats Cards */}
          <TooltipProvider>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6" style={{ animationDelay: '0.1s' }}>
              <StatCard 
                icon={<Eye className="w-8 h-8" />} 
                label="Eye exercises" 
                value={tracking?.daily_sessions_eye_exercise ?? 0} 
                color="primary" 
                tooltip="You will be guided to do eye muscle exercise with messages and sound. Timer will be started automatically afterwards. You can leave early under emergency condition and this will be recorded."
              />
              <StatCard 
                icon={<Moon className="w-8 h-8" />} 
                label="Close eyes rest" 
                value={tracking?.daily_sessions_eye_close ?? 0} 
                color="success" 
                tooltip="You will be guided to have 5 minutes eye-closing program for relaxation. Timer will be started automatically afterwards. You can leave early under emergency condition and this will be recorded."
              />
              <StatCard 
                icon={<SkipForward className="w-8 h-8" />} 
                label="Skip breaks" 
                value={tracking?.daily_sessions_skip ?? 0} 
                color="warning" 
                tooltip="Redirect to the mainpage and timer restarts immediately from 0:00"
              />
              <StatCard 
                icon={<AlertCircle className="w-8 h-8" />} 
                label="Early Ends" 
                value={earlyEnds} 
                color="danger" 
                tooltip="Counts of early ends from Eye Exercise and Eye Close sessions"
                breakdown={{
                  label1: 'Eye Exercise',
                  value1: eyeExerciseEarlyEnds,
                  label2: 'Eye Close',
                  value2: eyeCloseEarlyEnds,
                }}
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

      {/* Black Screen Overlay - with separate early end handlers for exercise vs close */}
      <BlackScreenOverlay 
        open={showBlackScreen} 
        onClose={() => setShowBlackScreen(false)} 
        onEarlyEnd={incrementEyeCloseEarlyEnd}
      />
    </div>
  );
};

export default Index;
