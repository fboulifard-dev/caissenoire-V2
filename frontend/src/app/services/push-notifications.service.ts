import { Injectable } from '@angular/core';
import { getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  async requestPermissionAndGetToken(): Promise<string | null> {
    if (!this.isAvailable() || !(await isSupported())) {
      return null;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission === 'granted' ? this.getFcmToken() : null;
  }

  async getTokenIfPermissionGranted(): Promise<string | null> {
    if (!this.isAvailable() || Notification.permission !== 'granted' || !(await isSupported())) {
      return null;
    }

    return this.getFcmToken();
  }

  private isAvailable(): boolean {
    return typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator;
  }

  private async getFcmToken(): Promise<string | null> {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(getMessaging(getApp()), {
      serviceWorkerRegistration: registration
    });

    return token || null;
  }
}