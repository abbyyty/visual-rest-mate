import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, LogOut, Clock, Activity, Flame } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface DailyTrackingRow {
  id: string;
  username: string;
  date: string;
  days_of_use: number;
  daily_screen_time: string;
  daily_sessions_count: number;
  daily_sessions_eye_exercise: number;
  daily_sessions_eye_exercise_early_end: number;
  daily_sessions_eye_close: number;
  daily_sessions_eye_close_early_end: number;
  daily_sessions_skip: number;
  daily_overuse_time: string;
}

function intervalToSeconds(interval: string | null): number {
  if (!interval) return 0;
  const parts = interval.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

function formatInterval(interval: string | null): string {
  if (!interval) return '00:00:00';
  return interval;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const COLORS = {
  // Screen Time
  normalUse: 'hsl(160, 60%, 45%)',       // Green
  overuse: 'hsl(0, 72%, 51%)',           // Red
  // Sessions - color families
  eyeExerciseFull: 'hsl(160, 60%, 35%)', // Dark green
  eyeExerciseEarly: 'hsl(160, 50%, 55%)',// Light green
  eyeCloseFull: 'hsl(200, 70%, 45%)',    // Dark blue
  eyeCloseEarly: 'hsl(200, 60%, 65%)',   // Light blue
  skip: 'hsl(38, 90%, 55%)',             // Orange
};

const Data = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState<DailyTrackingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: rows, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) {
        toast.error('Failed to load data');
        console.error(error);
      } else {
        // Cast interval types to string
        const typedRows: DailyTrackingRow[] = (rows || []).map(row => ({
          id: row.id,
          username: row.username,
          date: row.date,
          days_of_use: row.days_of_use,
          daily_screen_time: String(row.daily_screen_time ?? '00:00:00'),
          daily_sessions_count: row.daily_sessions_count,
          daily_sessions_eye_exercise: row.daily_sessions_eye_exercise,
          daily_sessions_eye_exercise_early_end: row.daily_sessions_eye_exercise_early_end,
          daily_sessions_eye_close: row.daily_sessions_eye_close,
          daily_sessions_eye_close_early_end: row.daily_sessions_eye_close_early_end,
          daily_sessions_skip: row.daily_sessions_skip,
          daily_overuse_time: String(row.daily_overuse_time ?? '00:00:00'),
        }));
        setData(typedRows);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  // Get today's data for pie charts
  const today = new Date().toISOString().split('T')[0];
  const todayData = data.find(d => d.date === today);

  // Screen Time Pie Chart Data
  const screenTimeSeconds = intervalToSeconds(todayData?.daily_screen_time ?? '00:00:00');
  const overuseSeconds = intervalToSeconds(todayData?.daily_overuse_time ?? '00:00:00');
  const normalUseSeconds = Math.max(0, screenTimeSeconds - overuseSeconds);

  const screenTimePieData = [
    { name: 'Normal Use', value: normalUseSeconds, color: COLORS.normalUse },
    { name: 'Overuse', value: overuseSeconds, color: COLORS.overuse },
  ].filter(d => d.value > 0);

  const screenTimeTotal = screenTimePieData.reduce((sum, d) => sum + d.value, 0);

  // Sessions Pie Chart Data - 5 slices with color families
  const eyeExerciseFull = todayData?.daily_sessions_eye_exercise ?? 0;
  const eyeExerciseEarly = todayData?.daily_sessions_eye_exercise_early_end ?? 0;
  const eyeCloseFull = todayData?.daily_sessions_eye_close ?? 0;
  const eyeCloseEarly = todayData?.daily_sessions_eye_close_early_end ?? 0;
  const skip = todayData?.daily_sessions_skip ?? 0;

  const sessionsPieData = [
    { name: 'Full Eye Exercise', value: eyeExerciseFull, color: COLORS.eyeExerciseFull },
    { name: 'Early End EE', value: eyeExerciseEarly, color: COLORS.eyeExerciseEarly },
    { name: 'Full Eye Close', value: eyeCloseFull, color: COLORS.eyeCloseFull },
    { name: 'Early End EC', value: eyeCloseEarly, color: COLORS.eyeCloseEarly },
    { name: 'Skip', value: skip, color: COLORS.skip },
  ].filter(d => d.value > 0);

  const sessionsTotal = sessionsPieData.reduce((sum, d) => sum + d.value, 0);

  // Custom label renderer for percentage inside slices
  const renderPercentLabel = (total: number) => ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percent = Math.round((value / total) * 100);
    
    if (percent < 5) return null; // Don't show label for tiny slices
    
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {percent}%
      </text>
    );
  };

  // Custom legend renderer - color block + label only (no numbers)
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const formatTimeLabel = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-6 px-8 border-b border-border/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            state={{ fromData: true }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Timer
          </Link>
          
          <h1 className="text-xl font-mono text-foreground">My Data</h1>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12 space-y-12">
        {/* Today's Summary */}
        {todayData && (
          <section className="text-center space-y-2">
            <h2 className="text-2xl font-mono text-foreground">Today's Summary</h2>
            <p className="text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              {formatInterval(todayData.daily_screen_time)} screen time
              <span className="mx-3">•</span>
              <Activity className="w-4 h-4 inline mr-1" />
              {todayData.daily_sessions_count} sessions
              {overuseSeconds > 0 && (
                <>
                  <span className="mx-3">•</span>
                  <Flame className="w-4 h-4 inline mr-1 text-destructive" />
                  <span className="text-destructive">{formatInterval(todayData.daily_overuse_time)} overuse</span>
                </>
              )}
            </p>
          </section>
        )}

        {/* Pie Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Screen Time Pie */}
          <div className="stat-card">
            <h3 className="text-lg font-mono text-foreground mb-4 text-center">Screen Time Distribution</h3>
            {screenTimePieData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={screenTimePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderPercentLabel(screenTimeTotal)}
                      labelLine={false}
                    >
                      {screenTimePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend content={renderLegend} verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground">
                No screen time data for today
              </div>
            )}
            <p className="text-center text-muted-foreground mt-2 text-sm">
              Today: {formatTimeLabel(screenTimeSeconds)} total
            </p>
          </div>

          {/* Sessions Pie */}
          <div className="stat-card">
            <h3 className="text-lg font-mono text-foreground mb-4 text-center">Session Types</h3>
            {sessionsPieData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderPercentLabel(sessionsTotal)}
                      labelLine={false}
                    >
                      {sessionsPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend content={renderLegend} verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground">
                No session data for today
              </div>
            )}
          </div>
        </section>

        {/* Data Table */}
        <section className="stat-card">
          <h3 className="text-lg font-mono text-foreground mb-6">Recent Activity</h3>
          
          {data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Screen Time</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Exercises</TableHead>
                    <TableHead>Eye Close</TableHead>
                    <TableHead>Skips</TableHead>
                    <TableHead>Early Ends</TableHead>
                    <TableHead>Overuse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                      <TableCell>{formatInterval(row.daily_screen_time)}</TableCell>
                      <TableCell>{row.daily_sessions_count}</TableCell>
                      <TableCell>{row.daily_sessions_eye_exercise}</TableCell>
                      <TableCell>{row.daily_sessions_eye_close}</TableCell>
                      <TableCell>{row.daily_sessions_skip}</TableCell>
                      <TableCell className="text-destructive">
                        {row.daily_sessions_eye_exercise_early_end + row.daily_sessions_eye_close_early_end}
                      </TableCell>
                      <TableCell className="text-destructive">{formatInterval(row.daily_overuse_time)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No data yet. Start tracking your screen time!
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Data;
