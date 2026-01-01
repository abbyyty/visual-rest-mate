import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserId, getTodayDate } from '@/lib/userId';
import { devError } from '@/lib/logger';

export interface DailyStats {
  id?: string;
  user_id: string;
  date: string;
  total_screen_time_seconds: number;
  exercise_count: number;
  close_eyes_count: number;
  skip_count: number;
  early_end_count: number;
  overuse_time_seconds: number;
}

type StatsWriteCoordinator = {
  inFlight: boolean;
  needsFlush: boolean;
  latest: DailyStats | null;
};

// Shared across all hook instances to avoid write races between pages (Index/EyeExercise/etc.).
const statsWriteCoordinators = new Map<string, StatsWriteCoordinator>();

function getStatsWriteCoordinator(key: string): StatsWriteCoordinator {
  const existing = statsWriteCoordinators.get(key);
  if (existing) return existing;

  const created: StatsWriteCoordinator = {
    inFlight: false,
    needsFlush: false,
    latest: null,
  };
  statsWriteCoordinators.set(key, created);
  return created;
}

async function flushStatsWrite(key: string) {
  const coord = getStatsWriteCoordinator(key);
  if (coord.inFlight) return;

  coord.inFlight = true;
  try {
    while (coord.needsFlush) {
      coord.needsFlush = false;
      const payload = coord.latest;
      if (!payload) continue;

      const { error } = await supabase
        .from('daily_stats')
        .upsert(payload, { onConflict: 'user_id,date' });

      if (error) devError('Error updating stats:', error);
    }
  } finally {
    coord.inFlight = false;

    // If something queued up during the last await, flush again.
    if (coord.needsFlush) {
      void flushStatsWrite(key);
    }
  }
}

function requestStatsWrite(key: string, next: DailyStats) {
  const coord = getStatsWriteCoordinator(key);
  coord.latest = next;
  coord.needsFlush = true;
  void flushStatsWrite(key);
}

async function waitForStatsFlush(key: string) {
  const coord = getStatsWriteCoordinator(key);

  // Wait until there is no in-flight request and nothing queued.
  // (We "poke" flushStatsWrite in case something queued while another page was active.)
  while (coord.inFlight || coord.needsFlush) {
    await flushStatsWrite(key);
    // If flushStatsWrite returned immediately because something was in-flight,
    // give the event loop time and check again.
    await new Promise((r) => setTimeout(r, 25));
  }
}


export function useDailyStats() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  // IMPORTANT: We keep a ref so updates can be persisted even if the component
  // that calls updateStats unmounts right after triggering an update.
  const statsRef = useRef<DailyStats | null>(null);

  const userId = getUserId();
  const today = getTodayDate();

  const fetchStats = useCallback(async () => {
    const key = `${userId}:${today}`;

    try {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;

      const fetched: DailyStats = data
        ? {
            ...data,
            early_end_count: data.early_end_count ?? 0,
            overuse_time_seconds: data.overuse_time_seconds ?? 0,
          }
        : {
            user_id: userId,
            date: today,
            total_screen_time_seconds: 0,
            exercise_count: 0,
            close_eyes_count: 0,
            skip_count: 0,
            early_end_count: 0,
            overuse_time_seconds: 0,
          };

      // IMPORTANT: Never let a fast fetch overwrite a newer in-flight/pending local update
      // (common when navigating between pages immediately after triggering an update).
      const coord = getStatsWriteCoordinator(key);
      const effective =
        coord.latest && (coord.needsFlush || coord.inFlight) ? coord.latest : fetched;

      statsRef.current = effective;
      setStats(effective);

      if (!coord.latest || (!coord.needsFlush && !coord.inFlight)) {
        coord.latest = effective;
      }
    } catch (error) {
      devError('Error fetching stats:', error);
      const fallback: DailyStats = {
        user_id: userId,
        date: today,
        total_screen_time_seconds: 0,
        exercise_count: 0,
        close_eyes_count: 0,
        skip_count: 0,
        early_end_count: 0,
        overuse_time_seconds: 0,
      };

      const coord = getStatsWriteCoordinator(key);
      const effective =
        coord.latest && (coord.needsFlush || coord.inFlight) ? coord.latest : fallback;

      statsRef.current = effective;
      setStats(effective);

      if (!coord.latest || (!coord.needsFlush && !coord.inFlight)) {
        coord.latest = effective;
      }
    } finally {
      setLoading(false);
    }
  }, [userId, today]);

  type StatsUpdate =
    | Partial<DailyStats>
    | ((current: DailyStats) => Partial<DailyStats>);

  const getDefaultStats = useCallback(
    (): DailyStats => ({
      user_id: userId,
      date: today,
      total_screen_time_seconds: 0,
      exercise_count: 0,
      close_eyes_count: 0,
      skip_count: 0,
      early_end_count: 0,
      overuse_time_seconds: 0,
    }),
    [userId, today]
  );

  const updateStats = useCallback(
    (updates: StatsUpdate) => {
      const key = `${userId}:${today}`;

      // CRITICAL: Always base updates on the shared "latest" snapshot so that
      // updates from other pages (Index/EyeExercise/Relax) don't get overwritten
      // by stale local state.
      const sharedLatest = getStatsWriteCoordinator(key).latest;
      const base = sharedLatest ?? statsRef.current ?? getDefaultStats();

      const patch = typeof updates === 'function' ? updates(base) : updates;

      const next: DailyStats = {
        ...base,
        ...patch,
        user_id: userId,
        date: today,
      };

      // Update local cache immediately
      statsRef.current = next;
      setStats(next);

      // Persist safely (coalesced + serialized across pages)
      requestStatsWrite(key, next);
    },
    [userId, today, getDefaultStats]
  );

  const flush = useCallback(() => {
    const key = `${userId}:${today}`;
    return waitForStatsFlush(key);
  }, [userId, today]);

  const incrementExerciseCount = useCallback(() => {
    updateStats((s) => ({ exercise_count: s.exercise_count + 1 }));
  }, [updateStats]);

  const incrementCloseEyesCount = useCallback(() => {
    updateStats((s) => ({ close_eyes_count: s.close_eyes_count + 1 }));
  }, [updateStats]);

  const incrementSkipCount = useCallback(() => {
    updateStats((s) => ({ skip_count: s.skip_count + 1 }));
  }, [updateStats]);

  const addScreenTime = useCallback(
    (seconds: number) => {
      updateStats((s) => ({
        total_screen_time_seconds: s.total_screen_time_seconds + seconds,
      }));
    },
    [updateStats]
  );

  const incrementEarlyEndCount = useCallback(() => {
    updateStats((s) => ({ early_end_count: s.early_end_count + 1 }));
  }, [updateStats]);

  const addOveruseTime = useCallback(
    (seconds: number) => {
      updateStats((s) => ({ overuse_time_seconds: s.overuse_time_seconds + seconds }));
    },
    [updateStats]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    incrementExerciseCount,
    incrementCloseEyesCount,
    incrementSkipCount,
    addScreenTime,
    incrementEarlyEndCount,
    addOveruseTime,
    flush,
    refetch: fetchStats,
  };
}
