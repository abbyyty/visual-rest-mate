import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'success' | 'warning' | 'danger';
}

const colorClasses = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

export function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-muted-foreground text-lg">{label}</span>
      </div>
      <div className={`text-5xl font-bold font-mono ${colorClasses[color]}`}>
        {value}
      </div>
    </div>
  );
}
