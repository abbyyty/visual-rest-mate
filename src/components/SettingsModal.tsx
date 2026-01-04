import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getUserSettings, saveUserSettings, UserSettings, DEFAULT_SETTINGS, SizeSetting } from '@/lib/settings';

type SpeedValue = 'slow' | 'normal' | 'fast';
const SPEED_OPTIONS: SpeedValue[] = ['slow', 'normal', 'fast'];

type SizeValue = 'small' | 'medium' | 'large';
const SIZE_OPTIONS: SizeValue[] = ['small', 'medium', 'large'];

function SpeedSlider({ 
  label, 
  sublabel,
  value, 
  onChange 
}: { 
  label: string; 
  sublabel: string;
  value: SpeedValue; 
  onChange: (value: SpeedValue) => void;
}) {
  const index = SPEED_OPTIONS.indexOf(value);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm text-foreground">{label}</Label>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
        <span className="text-sm font-mono text-primary capitalize">{value}</span>
      </div>
      <Slider
        value={[index]}
        onValueChange={(values) => onChange(SPEED_OPTIONS[values[0]])}
        min={0}
        max={2}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Slow</span>
        <span>Normal</span>
        <span>Fast</span>
      </div>
    </div>
  );
}

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (open) {
      setSettings(getUserSettings());
    }
  }, [open]);

  const handleSave = () => {
    saveUserSettings(settings);
    setOpen(false);
  };

  const updateSpeed = (exercise: keyof UserSettings['speeds'], value: SpeedValue) => {
    setSettings(prev => ({
      ...prev,
      speeds: {
        ...prev.speeds,
        [exercise]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-3 rounded-full bg-card hover:bg-card/80 border border-border/50 transition-colors">
          <Settings className="w-6 h-6 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground font-mono text-xl">Customize Your Breaks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 py-4">
          {/* Break Reminder Interval */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Break Reminder Interval
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Reminder frequency</Label>
                <span className="text-lg font-mono text-primary">Every {settings.breakIntervalMinutes} min</span>
              </div>
              <Slider
                value={[settings.breakIntervalMinutes]}
                onValueChange={(values) => setSettings(prev => ({ ...prev, breakIntervalMinutes: values[0] }))}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 min (testing)</span>
                <span>30 min</span>
              </div>
            </div>
          </section>

          {/* Size Settings */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Size of Ball
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Ball size</Label>
                <span className="text-sm font-mono text-primary capitalize">{settings.ballSize}</span>
              </div>
              <Slider
                value={[SIZE_OPTIONS.indexOf(settings.ballSize)]}
                onValueChange={(values) => setSettings(prev => ({ ...prev, ballSize: SIZE_OPTIONS[values[0]] as SizeSetting }))}
                min={0}
                max={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Small</span>
                <span>Medium</span>
                <span>Large</span>
              </div>
            </div>
          </section>

          {/* Speed Settings */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Speed of Ball
            </h3>
            <div className="space-y-6">
              <SpeedSlider
                label="Vertical"
                sublabel="Up-down movement"
                value={settings.speeds.vertical}
                onChange={(v) => updateSpeed('vertical', v)}
              />
              <SpeedSlider
                label="Horizontal"
                sublabel="Left-right movement"
                value={settings.speeds.horizontal}
                onChange={(v) => updateSpeed('horizontal', v)}
              />
              <SpeedSlider
                label="Circular"
                sublabel="Circular movement"
                value={settings.speeds.circular}
                onChange={(v) => updateSpeed('circular', v)}
              />
              <SpeedSlider
                label="Diagonal 1"
                sublabel="Top-left → bottom-right"
                value={settings.speeds.diagonal1}
                onChange={(v) => updateSpeed('diagonal1', v)}
              />
              <SpeedSlider
                label="Diagonal 2"
                sublabel="Top-right → bottom-left"
                value={settings.speeds.diagonal2}
                onChange={(v) => updateSpeed('diagonal2', v)}
              />
            </div>
          </section>

          <Button onClick={handleSave} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export for backwards compatibility
export { getBreakInterval } from '@/lib/settings';
