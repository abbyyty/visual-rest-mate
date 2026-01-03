// User settings storage and retrieval with validation
import { z } from 'zod';
import { devError } from './logger';
import { TimezoneOption, TIMEZONE_OPTIONS } from './timezone';

const SpeedSettingSchema = z.enum(['slow', 'normal', 'fast']);
const TimezoneOptionSchema = z.enum(['USA', 'UK', 'HongKong', 'China', 'Japan', 'Korea']);

const UserSettingsSchema = z.object({
  breakIntervalMinutes: z.number().min(1).max(120),
  timezone: TimezoneOptionSchema,
  speeds: z.object({
    vertical: SpeedSettingSchema,
    horizontal: SpeedSettingSchema,
    circular: SpeedSettingSchema,
    diagonal1: SpeedSettingSchema,
    diagonal2: SpeedSettingSchema,
  }),
});

export type SpeedSetting = z.infer<typeof SpeedSettingSchema>;

export interface UserSettings {
  breakIntervalMinutes: number;
  timezone: TimezoneOption;
  speeds: {
    vertical: SpeedSetting;
    horizontal: SpeedSetting;
    circular: SpeedSetting;
    diagonal1: SpeedSetting;
    diagonal2: SpeedSetting;
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
  timezone: 'HongKong',
  speeds: {
    vertical: 'normal',
    horizontal: 'normal',
    circular: 'normal',
    diagonal1: 'normal',
    diagonal2: 'normal',
  },
};

export function getUserTimezone(): TimezoneOption {
  return getUserSettings().timezone;
}

export function getUserSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate with zod schema - use safeParse and fallback gracefully
      const result = UserSettingsSchema.safeParse(parsed);
      if (result.success) {
        // Cast to UserSettings since zod schema matches our interface
        return result.data as UserSettings;
      }
      // If validation fails, clear corrupted data
      devError('Invalid settings data, using defaults');
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    devError('Error reading settings:', e);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_SETTINGS;
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    // Validate before saving
    const validated = UserSettingsSchema.parse(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  } catch (e) {
    devError('Invalid settings provided:', e);
    throw new Error('Invalid settings format');
  }
}

export function getBreakInterval(): number {
  return getUserSettings().breakIntervalMinutes;
}

export function getSpeedValue(exercise: keyof typeof SPEED_VALUES, setting: SpeedSetting): number {
  return SPEED_VALUES[exercise][setting];
}
