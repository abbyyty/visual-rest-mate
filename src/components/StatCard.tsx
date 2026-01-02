import { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: 'primary' | 'success' | 'warning' | 'danger';
  tooltip?: string;
  // For Early Ends card with breakdown
  breakdown?: {
    label1: string;
    value1: number;
    label2: string;
    value2: number;
  };
}

const colorClasses = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

export function StatCard({ icon, label, value, color, tooltip, breakdown }: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in relative">
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors cursor-help">
              <Info className="w-3 h-3 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className={`${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-muted-foreground text-lg">{label}</span>
      </div>
      <div className={`text-5xl font-bold font-mono ${colorClasses[color]}`}>
        {value}
      </div>
      {breakdown && (
        <div className="mt-3 pt-3 border-t border-border/30 text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>{breakdown.label1}:</span>
            <span className={colorClasses[color]}>{breakdown.value1}</span>
          </div>
          <div className="flex justify-between">
            <span>{breakdown.label2}:</span>
            <span className={colorClasses[color]}>{breakdown.value2}</span>
          </div>
        </div>
      )}
    </div>
  );
}