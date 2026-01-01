// User settings storage and retrieval

export interface SpeedSetting {
  slow: number;
  normal: number;
  fast: number;
}

export interface UserSettings {
  breakIntervalMinutes: number;
  speeds: {
    vertical: 'slow' | 'normal' | 'fast';
    horizontal: 'slow' | 'normal' | 'fast';
    circular: 'slow' | 'normal' | 'fast';
    diagonal1: 'slow' | 'normal' | 'fast';
    diagonal2: 'slow' | 'normal' | 'fast';
  };
}

// Speed values in seconds per pass/cycle
export const SPEED_VALUES = {
  vertical: { slow: 1.5, normal: 1, fast: 0.7 },
  horizontal: { slow: 2, normal: 1.5, fast: 1 },
  circular: { slow: 3, normal: 2, fast: 1.5 },
  diagonal1: { slow: 2, normal: 1.5, fast: 1 },
  diagonal2: { slow: 2, normal: 1.5, fast: 1 },
};

const STORAGE_KEY = 'userSettings';

export const DEFAULT_SETTINGS: UserSettings = {
  breakIntervalMinutes: 30,
  speeds: {
    vertical: 'normal',
    horizontal: 'normal',
    circular: 'normal',
    diagonal1: 'normal',
    diagonal2: 'normal',
  },
};

export function getUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        breakIntervalMinutes: parsed.breakIntervalMinutes ?? DEFAULT_SETTINGS.breakIntervalMinutes,
        speeds: {
          vertical: parsed.speeds?.vertical ?? DEFAULT_SETTINGS.speeds.vertical,
          horizontal: parsed.speeds?.horizontal ?? DEFAULT_SETTINGS.speeds.horizontal,
          circular: parsed.speeds?.circular ?? DEFAULT_SETTINGS.speeds.circular,
          diagonal1: parsed.speeds?.diagonal1 ?? DEFAULT_SETTINGS.speeds.diagonal1,
          diagonal2: parsed.speeds?.diagonal2 ?? DEFAULT_SETTINGS.speeds.diagonal2,
        },
      };
    }
  } catch (e) {
    console.error('Error reading settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getBreakInterval(): number {
  return getUserSettings().breakIntervalMinutes;
}

export function getSpeedValue(exercise: keyof typeof SPEED_VALUES, setting: 'slow' | 'normal' | 'fast'): number {
  return SPEED_VALUES[exercise][setting];
}
