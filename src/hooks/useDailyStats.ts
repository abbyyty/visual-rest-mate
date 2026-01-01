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

export function useDailyStats() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  // IMPORTANT: We keep a ref so updates can be persisted even if the component
  // that calls updateStats unmounts right after triggering an update.
  const statsRef = useRef<DailyStats | null>(null);

  const userId = getUserId();
  const today = getTodayDate();

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const next: DailyStats = {
          ...data,
          early_end_count: data.early_end_count ?? 0,
          overuse_time_seconds: data.overuse_time_seconds ?? 0,
        };
        statsRef.current = next;
        setStats(next);
      } else {
        const next: DailyStats = {
          user_id: userId,
          date: today,
          total_screen_time_seconds: 0,
          exercise_count: 0,
          close_eyes_count: 0,
          skip_count: 0,
          early_end_count: 0,
          overuse_time_seconds: 0,
        };
        statsRef.current = next;
        setStats(next);
      }
    } catch (error) {
      devError('Error fetching stats:', error);
      const next: DailyStats = {
        user_id: userId,
        date: today,
        total_screen_time_seconds: 0,
        exercise_count: 0,
        close_eyes_count: 0,
        skip_count: 0,
        early_end_count: 0,
        overuse_time_seconds: 0,
      };
      statsRef.current = next;
      setStats(next);
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
      const base = statsRef.current ?? getDefaultStats();
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

      // Persist (fire-and-forget)
      void supabase
        .from('daily_stats')
        .upsert(next, { onConflict: 'user_id,date' })
        .then(({ error }) => {
          if (error) devError('Error updating stats:', error);
        });
    },
    [userId, today, getDefaultStats]
  );

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
    refetch: fetchStats,
  };
}
