import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { devError, devLog } from '@/lib/logger';
import { getHongKongDateString, getHongKongTimeInfo } from '@/lib/hongKongTime';

export interface DailyTracking {
  id?: string;
  user_id: string;
  username: string;
  date: string;
  days_of_use: number;
  daily_screen_time: string; // interval as string
  daily_sessions_count: number;
  daily_sessions_eye_exercise: number;
  daily_sessions_eye_exercise_early_end: number;
  daily_sessions_eye_close: number;
  daily_sessions_eye_close_early_end: number;
  daily_sessions_skip: number;
  daily_overuse_time: string; // interval as string
}

type TrackingWriteCoordinator = {
  inFlight: boolean;
  needsFlush: boolean;
  latest: DailyTracking | null;
};

const trackingWriteCoordinators = new Map<string, TrackingWriteCoordinator>();

function getTrackingWriteCoordinator(key: string): TrackingWriteCoordinator {
  const existing = trackingWriteCoordinators.get(key);
  if (existing) return existing;

  const created: TrackingWriteCoordinator = {
    inFlight: false,
    needsFlush: false,
    latest: null,
  };
  trackingWriteCoordinators.set(key, created);
  return created;
}

async function flushTrackingWrite(key: string) {
  const coord = getTrackingWriteCoordinator(key);
  if (coord.inFlight) return;

  coord.inFlight = true;
  try {
    while (coord.needsFlush) {
      coord.needsFlush = false;
      const payload = coord.latest;
      if (!payload) continue;

      const { error } = await supabase
        .from('daily_tracking')
        .upsert(payload, { onConflict: 'user_id,date' });

      if (error) devError('Error updating tracking:', error);
    }
  } finally {
    coord.inFlight = false;

    if (coord.needsFlush) {
      void flushTrackingWrite(key);
    }
  }
}

function requestTrackingWrite(key: string, next: DailyTracking) {
  const coord = getTrackingWriteCoordinator(key);
  coord.latest = next;
  coord.needsFlush = true;
  void flushTrackingWrite(key);
}

async function waitForTrackingFlush(key: string) {
  const coord = getTrackingWriteCoordinator(key);

  while (coord.inFlight || coord.needsFlush) {
    await flushTrackingWrite(key);
    await new Promise((r) => setTimeout(r, 25));
  }
}

// Helper to convert seconds to PostgreSQL interval string
function secondsToInterval(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper to convert PostgreSQL interval string to seconds
function intervalToSeconds(interval: string | null): number {
  if (!interval) return 0;
  
  // Handle PostgreSQL interval format like "04:15:32" or "01:23:00"
  const parts = interval.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

export function useDailyTracking() {
  const { user, username } = useAuth();
  const [tracking, setTracking] = useState<DailyTracking | null>(null);
  const [loading, setLoading] = useState(true);
  
  const trackingRef = useRef<DailyTracking | null>(null);
  const lastDateRef = useRef<string | null>(null);
  
  // Use Hong Kong timezone for date boundary
  const today = getHongKongDateString();
  
  // Log HK time info on mount for debugging
  useEffect(() => {
    const hkInfo = getHongKongTimeInfo();
    devLog(`Hong Kong time: ${hkInfo.date} ${hkInfo.time} (${hkInfo.timezone})`);
  }, []);

  const fetchTracking = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const key = `${user.id}:${today}`;

    try {
      // First check total days of use
      const { count } = await supabase
        .from('daily_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const daysOfUse = (count ?? 0) + 1;

      const { data, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;

      const fetched: DailyTracking = data
        ? {
            id: data.id,
            user_id: data.user_id,
            username: data.username,
            date: data.date,
            days_of_use: data.days_of_use || daysOfUse,
            daily_screen_time: String(data.daily_screen_time ?? '00:00:00'),
            daily_sessions_count: data.daily_sessions_count,
            daily_sessions_eye_exercise: data.daily_sessions_eye_exercise,
            daily_sessions_eye_exercise_early_end: data.daily_sessions_eye_exercise_early_end,
            daily_sessions_eye_close: data.daily_sessions_eye_close,
            daily_sessions_eye_close_early_end: data.daily_sessions_eye_close_early_end,
            daily_sessions_skip: data.daily_sessions_skip,
            daily_overuse_time: String(data.daily_overuse_time ?? '00:00:00'),
          }
        : {
            user_id: user.id,
            username: username || 'User',
            date: today,
            days_of_use: daysOfUse,
            daily_screen_time: '00:00:00',
            daily_sessions_count: 0,
            daily_sessions_eye_exercise: 0,
            daily_sessions_eye_exercise_early_end: 0,
            daily_sessions_eye_close: 0,
            daily_sessions_eye_close_early_end: 0,
            daily_sessions_skip: 0,
            daily_overuse_time: '00:00:00',
          };

      const coord = getTrackingWriteCoordinator(key);
      const effective =
        coord.latest && (coord.needsFlush || coord.inFlight) ? coord.latest : fetched;

      trackingRef.current = effective;
      setTracking(effective);

      if (!coord.latest || (!coord.needsFlush && !coord.inFlight)) {
        coord.latest = effective;
      }
    } catch (error) {
      devError('Error fetching tracking:', error);
      const fallback: DailyTracking = {
        user_id: user.id,
        username: username || 'User',
        date: today,
        days_of_use: 1,
        daily_screen_time: '00:00:00',
        daily_sessions_count: 0,
        daily_sessions_eye_exercise: 0,
        daily_sessions_eye_exercise_early_end: 0,
        daily_sessions_eye_close: 0,
        daily_sessions_eye_close_early_end: 0,
        daily_sessions_skip: 0,
        daily_overuse_time: '00:00:00',
      };

      const coord = getTrackingWriteCoordinator(key);
      const effective =
        coord.latest && (coord.needsFlush || coord.inFlight) ? coord.latest : fallback;

      trackingRef.current = effective;
      setTracking(effective);

      if (!coord.latest || (!coord.needsFlush && !coord.inFlight)) {
        coord.latest = effective;
      }
    } finally {
      setLoading(false);
    }
  }, [user, username, today]);

  const getDefaultTracking = useCallback(
    (): DailyTracking => ({
      user_id: user?.id || '',
      username: username || 'User',
      date: today,
      days_of_use: 1,
      daily_screen_time: '00:00:00',
      daily_sessions_count: 0,
      daily_sessions_eye_exercise: 0,
      daily_sessions_eye_exercise_early_end: 0,
      daily_sessions_eye_close: 0,
      daily_sessions_eye_close_early_end: 0,
      daily_sessions_skip: 0,
      daily_overuse_time: '00:00:00',
    }),
    [user, username, today]
  );

  type TrackingUpdate =
    | Partial<DailyTracking>
    | ((current: DailyTracking) => Partial<DailyTracking>);

  const updateTracking = useCallback(
    (updates: TrackingUpdate) => {
      if (!user) return;
      
      const key = `${user.id}:${today}`;
      const sharedLatest = getTrackingWriteCoordinator(key).latest;
      const base = sharedLatest ?? trackingRef.current ?? getDefaultTracking();

      const patch = typeof updates === 'function' ? updates(base) : updates;

      // Recalculate daily_sessions_count
      const next: DailyTracking = {
        ...base,
        ...patch,
        user_id: user.id,
        username: username || base.username,
        date: today,
      };
      
      // Auto-calculate sessions count
      next.daily_sessions_count = 
        next.daily_sessions_eye_exercise + 
        next.daily_sessions_eye_close + 
        next.daily_sessions_skip;

      trackingRef.current = next;
      setTracking(next);
      requestTrackingWrite(key, next);
    },
    [user, username, today, getDefaultTracking]
  );

  const flush = useCallback(() => {
    if (!user) return Promise.resolve();
    const key = `${user.id}:${today}`;
    return waitForTrackingFlush(key);
  }, [user, today]);

  // Helper functions
  const addScreenTime = useCallback((seconds: number) => {
    updateTracking((t) => {
      const currentSeconds = intervalToSeconds(t.daily_screen_time);
      return { daily_screen_time: secondsToInterval(currentSeconds + seconds) };
    });
  }, [updateTracking]);

  const addOveruseTime = useCallback((seconds: number) => {
    updateTracking((t) => {
      const currentSeconds = intervalToSeconds(t.daily_overuse_time);
      return { daily_overuse_time: secondsToInterval(currentSeconds + seconds) };
    });
  }, [updateTracking]);

  const incrementEyeExercise = useCallback(() => {
    updateTracking((t) => ({ daily_sessions_eye_exercise: t.daily_sessions_eye_exercise + 1 }));
  }, [updateTracking]);

  const incrementEyeExerciseEarlyEnd = useCallback(() => {
    updateTracking((t) => ({ daily_sessions_eye_exercise_early_end: t.daily_sessions_eye_exercise_early_end + 1 }));
  }, [updateTracking]);

  const incrementEyeClose = useCallback(() => {
    updateTracking((t) => ({ daily_sessions_eye_close: t.daily_sessions_eye_close + 1 }));
  }, [updateTracking]);

  const incrementEyeCloseEarlyEnd = useCallback(() => {
    updateTracking((t) => ({ daily_sessions_eye_close_early_end: t.daily_sessions_eye_close_early_end + 1 }));
  }, [updateTracking]);

  const incrementSkip = useCallback(() => {
    updateTracking((t) => ({ daily_sessions_skip: t.daily_sessions_skip + 1 }));
  }, [updateTracking]);

  // Get screen time in seconds for display
  const getScreenTimeSeconds = useCallback(() => {
    return intervalToSeconds(tracking?.daily_screen_time ?? '00:00:00');
  }, [tracking]);

  const getOveruseTimeSeconds = useCallback(() => {
    return intervalToSeconds(tracking?.daily_overuse_time ?? '00:00:00');
  }, [tracking]);

  useEffect(() => {
    fetchTracking();
    
    // Check every minute if we crossed midnight in Hong Kong
    const interval = setInterval(() => {
      const currentHkDate = getHongKongDateString();
      if (lastDateRef.current && lastDateRef.current !== currentHkDate) {
        devLog(`HK midnight crossed: ${lastDateRef.current} → ${currentHkDate}`);
        fetchTracking();
      }
      lastDateRef.current = currentHkDate;
    }, 60000); // Check every 60 seconds
    
    // Initialize lastDateRef
    lastDateRef.current = getHongKongDateString();
    
    return () => clearInterval(interval);
  }, [fetchTracking]);

  return {
    tracking,
    loading,
    addScreenTime,
    addOveruseTime,
    incrementEyeExercise,
    incrementEyeExerciseEarlyEnd,
    incrementEyeClose,
    incrementEyeCloseEarlyEnd,
    incrementSkip,
    getScreenTimeSeconds,
    getOveruseTimeSeconds,
    flush,
    refetch: fetchTracking,
  };
}

// Export helpers for use in other components
export { intervalToSeconds, secondsToInterval };
