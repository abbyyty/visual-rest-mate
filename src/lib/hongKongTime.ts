/**
 * Hong Kong Timezone Utilities
 * All daily records reset at 00:00:00 HKT (Asia/Hong_Kong)
 */

const HK_TIMEZONE = 'Asia/Hong_Kong';

/**
 * Get the current date in Hong Kong timezone as YYYY-MM-DD string
 */
export function getHongKongDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Returns YYYY-MM-DD format
}

/**
 * Check if a given date string (YYYY-MM-DD) is today in Hong Kong timezone
 */
export function isHongKongToday(dateString: string): boolean {
  return dateString === getHongKongDateString();
}

/**
 * Get Hong Kong timezone offset info for debugging
 */
export function getHongKongTimeInfo(): {
  date: string;
  time: string;
  timezone: string;
} {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: HK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  return {
    date: dateFormatter.format(now),
    time: timeFormatter.format(now),
    timezone: HK_TIMEZONE,
  };
}
