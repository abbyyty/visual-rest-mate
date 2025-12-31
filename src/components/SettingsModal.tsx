import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'breakIntervalMinutes';
const DEFAULT_INTERVAL = 30;
const MIN_INTERVAL = 10;
const MAX_INTERVAL = 30;

export function getBreakInterval(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const value = parseInt(stored, 10);
    if (!isNaN(value) && value >= MIN_INTERVAL && value <= MAX_INTERVAL) {
      return value;
    }
  }
  return DEFAULT_INTERVAL;
}

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [interval, setInterval] = useState(DEFAULT_INTERVAL);

  useEffect(() => {
    setInterval(getBreakInterval());
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, interval.toString());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-3 rounded-full bg-card hover:bg-card/80 border border-border/50 transition-colors">
          <Settings className="w-6 h-6 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground font-mono">Timer Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Break reminder interval</label>
              <span className="text-lg font-mono text-primary">Every {interval} min</span>
            </div>
            <Slider
              value={[interval]}
              onValueChange={(values) => setInterval(values[0])}
              min={MIN_INTERVAL}
              max={MAX_INTERVAL}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{MIN_INTERVAL} min</span>
              <span>{MAX_INTERVAL} min</span>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
