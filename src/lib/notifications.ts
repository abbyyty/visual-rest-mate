// Web Push Notifications and Permission Management
import { playBeep } from './sound';

const PERMISSION_KEY = 'notificationPermission';

export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function getStoredPermission(): string | null {
  return localStorage.getItem(PERMISSION_KEY);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    localStorage.setItem(PERMISSION_KEY, 'granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    localStorage.setItem(PERMISSION_KEY, permission);
    return permission === 'granted';
  }

  return false;
}

export function sendBreakNotification(minutesElapsed: number): void {
  const permission = getNotificationPermissionStatus();
  
  if (permission === 'granted') {
    // Play sound
    playBeep(800, 300);
    
    // Check if document is hidden (tab inactive)
    if (document.hidden) {
      const notification = new Notification('🧘 Time for eye break!', {
        body: `Click to rest your eyes (${minutesElapsed} minutes elapsed)`,
        icon: '/favicon.ico',
        tag: 'break-reminder',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }
}

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  }
}
