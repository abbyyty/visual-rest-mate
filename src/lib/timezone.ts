/**
 * Timezone Utilities
 * Supports user-selected timezones for daily record resets and display
 */

export type TimezoneOption = 'USA' | 'UK' | 'HongKong' | 'China' | 'Japan' | 'Korea';

export const TIMEZONE_CONFIG: Record<TimezoneOption, { iana: string; abbr: string; label: string }> = {
  USA: { iana: 'America/New_York', abbr: 'EST', label: 'USA (EST)' },
  UK: { iana: 'Europe/London', abbr: 'GMT', label: 'UK (GMT)' },
  HongKong: { iana: 'Asia/Hong_Kong', abbr: 'HKT', label: 'Hong Kong (HKT)' },
  China: { iana: 'Asia/Shanghai', abbr: 'CST', label: 'China (CST)' },
  Japan: { iana: 'Asia/Tokyo', abbr: 'JST', label: 'Japan (JST)' },
  Korea: { iana: 'Asia/Seoul', abbr: 'KST', label: 'Korea (KST)' },
};

export const TIMEZONE_OPTIONS: TimezoneOption[] = ['USA', 'UK', 'HongKong', 'China', 'Japan', 'Korea'];

/**
 * Get the current date string in user's timezone (YYYY-MM-DD format)
 */
export function getDateStringInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Returns YYYY-MM-DD format
}

/**
 * Get the current time string with timezone abbreviation (HH:MM:SS TZ)
 */
export function getTimeWithTimezone(timezone: string, abbr: string): string {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${timeFormatter.format(now)} ${abbr}`;
}

/**
 * Format a date object to time string with timezone abbreviation
 */
export function formatTimeWithTimezone(date: Date, timezone: string, abbr: string): string {
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${timeFormatter.format(date)} ${abbr}`;
}

/**
 * Format a date object to full datetime string with timezone (YYYY-MM-DD HH:MM:SS TZ)
 */
export function formatDateTimeWithTimezone(date: Date, timezone: string, abbr: string): string {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${dateFormatter.format(date)} ${timeFormatter.format(date)} ${abbr}`;
}

/**
 * Check if a given date string (YYYY-MM-DD) is today in user's timezone
 */
export function isTodayInTimezone(dateString: string, timezone: string): boolean {
  return dateString === getDateStringInTimezone(timezone);
}

/**
 * Get timezone info for debugging
 */
export function getTimezoneInfo(timezoneOption: TimezoneOption): {
  date: string;
  time: string;
  timezone: string;
  abbr: string;
} {
  const config = TIMEZONE_CONFIG[timezoneOption];
  const now = new Date();
  
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.iana,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  return {
    date: dateFormatter.format(now),
    time: timeFormatter.format(now),
    timezone: config.iana,
    abbr: config.abbr,
  };
}

/**
 * Get dynamic timezone abbreviation (handles DST)
 * e.g., EST/EDT for New York, GMT/BST for London
 */
export function getDynamicTimezoneAbbr(timezone: string, fallbackAbbr: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(now);
    
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || fallbackAbbr;
  } catch {
    return fallbackAbbr;
  }
}
