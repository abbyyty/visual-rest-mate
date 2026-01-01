import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserId, getTodayDate } from '@/lib/userId';

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
        setStats({
          ...data,
          early_end_count: data.early_end_count ?? 0,
          overuse_time_seconds: data.overuse_time_seconds ?? 0,
        });
      } else {
        setStats({
          user_id: userId,
          date: today,
          total_screen_time_seconds: 0,
          exercise_count: 0,
          close_eyes_count: 0,
          skip_count: 0,
          early_end_count: 0,
          overuse_time_seconds: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        user_id: userId,
        date: today,
        total_screen_time_seconds: 0,
        exercise_count: 0,
        close_eyes_count: 0,
        skip_count: 0,
        early_end_count: 0,
        overuse_time_seconds: 0,
      });
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
      setStats((prev) => {
        const base = prev ?? getDefaultStats();
        const patch = typeof updates === 'function' ? updates(base) : updates;

        const next: DailyStats = {
          ...base,
          ...patch,
          user_id: userId,
          date: today,
        };

        // Persist (fire-and-forget); using functional setState ensures we never
        // overwrite newer values when multiple updates happen quickly.
        void supabase
          .from('daily_stats')
          .upsert(next, { onConflict: 'user_id,date' })
          .then(({ error }) => {
            if (error) console.error('Error updating stats:', error);
          });

        return next;
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
