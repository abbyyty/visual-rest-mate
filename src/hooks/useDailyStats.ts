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
      });
    } finally {
      setLoading(false);
    }
  }, [userId, today]);

  const updateStats = useCallback(async (updates: Partial<DailyStats>) => {
    const newStats = {
      user_id: userId,
      date: today,
      total_screen_time_seconds: stats?.total_screen_time_seconds ?? 0,
      exercise_count: stats?.exercise_count ?? 0,
      close_eyes_count: stats?.close_eyes_count ?? 0,
      skip_count: stats?.skip_count ?? 0,
      early_end_count: stats?.early_end_count ?? 0,
      ...updates,
    };

    setStats(newStats);

    try {
      const { error } = await supabase
        .from('daily_stats')
        .upsert(newStats, { onConflict: 'user_id,date' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }, [userId, today, stats]);

  const incrementExerciseCount = useCallback(() => {
    updateStats({ exercise_count: (stats?.exercise_count ?? 0) + 1 });
  }, [updateStats, stats]);

  const incrementCloseEyesCount = useCallback(() => {
    updateStats({ close_eyes_count: (stats?.close_eyes_count ?? 0) + 1 });
  }, [updateStats, stats]);

  const incrementSkipCount = useCallback(() => {
    updateStats({ skip_count: (stats?.skip_count ?? 0) + 1 });
  }, [updateStats, stats]);

  const addScreenTime = useCallback((seconds: number) => {
    updateStats({ total_screen_time_seconds: (stats?.total_screen_time_seconds ?? 0) + seconds });
  }, [updateStats, stats]);

  const incrementEarlyEndCount = useCallback(() => {
    updateStats({ early_end_count: (stats?.early_end_count ?? 0) + 1 });
  }, [updateStats, stats]);

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
    refetch: fetchStats,
  };
}
