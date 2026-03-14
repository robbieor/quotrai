import { Geolocation, Position } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  isBackground: boolean;
}

type LocationCallback = (location: LocationUpdate) => void;

class GeolocationService {
  private watchId: string | null = null;
  private isTracking = false;
  private locationCallbacks: LocationCallback[] = [];
  private backgroundCheckInterval: NodeJS.Timeout | null = null;

  // Check if we're running in Capacitor
  isNative(): boolean {
    return typeof (window as any).Capacitor !== 'undefined';
  }

  // Request permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await Geolocation.requestPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Failed to request permissions:', error);
      // Fall back to web API
      return true;
    }
  }

  // Check current permissions
  async checkPermissions(): Promise<boolean> {
    try {
      const permissions = await Geolocation.checkPermissions();
      return permissions.location === 'granted';
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  }

  // Get current position
  async getCurrentPosition(): Promise<Position | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
      return position;
    } catch (error) {
      console.error('Failed to get position:', error);
      return null;
    }
  }

  // Start continuous tracking
  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      console.log('Already tracking');
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.error('Location permission denied');
      return false;
    }

    try {
      // Start watching position
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        },
        (position, error) => {
          if (error) {
            console.error('Watch position error:', error);
            return;
          }

          if (position) {
            const update: LocationUpdate = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              isBackground: false,
            };

            this.notifyListeners(update);
            this.syncLocationToServer(update);
          }
        }
      );

      this.isTracking = true;
      
      // Set up background check when app goes to background
      if (this.isNative()) {
        this.setupBackgroundHandlers();
      }

      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      return false;
    }
  }

  // Stop tracking
  async stopTracking(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }

    if (this.backgroundCheckInterval) {
      clearInterval(this.backgroundCheckInterval);
      this.backgroundCheckInterval = null;
    }

    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  // Set up handlers for app state changes
  private setupBackgroundHandlers(): void {
    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive && this.isTracking) {
        // App went to background - start background location checks
        console.log('App backgrounded - continuing location tracking');
        this.startBackgroundChecks();
      } else if (isActive) {
        // App came to foreground - stop background checks
        console.log('App foregrounded');
        this.stopBackgroundChecks();
      }
    });
  }

  // Start periodic background location checks
  private startBackgroundChecks(): void {
    // Check location every 30 seconds in background
    this.backgroundCheckInterval = setInterval(async () => {
      const position = await this.getCurrentPosition();
      if (position) {
        const update: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          isBackground: true,
        };

        this.syncLocationToServer(update);
      }
    }, 30000);
  }

  // Stop background checks
  private stopBackgroundChecks(): void {
    if (this.backgroundCheckInterval) {
      clearInterval(this.backgroundCheckInterval);
      this.backgroundCheckInterval = null;
    }
  }

  // Sync location to server
  private async syncLocationToServer(update: LocationUpdate): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: teamId } = await supabase.rpc('get_user_team_id');
      if (!teamId) return;

      await supabase.from('location_pings').insert({
        team_id: teamId,
        user_id: user.id,
        latitude: update.latitude,
        longitude: update.longitude,
        accuracy: update.accuracy,
        recorded_at: new Date(update.timestamp).toISOString(),
        is_moving: null, // Could be determined by comparing with previous location
      });
    } catch (error) {
      console.error('Failed to sync location:', error);
    }
  }

  // Register listener for location updates
  onLocationUpdate(callback: LocationCallback): () => void {
    this.locationCallbacks.push(callback);
    return () => {
      this.locationCallbacks = this.locationCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners
  private notifyListeners(update: LocationUpdate): void {
    this.locationCallbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Show local notification for geofence events
  async showGeofenceNotification(title: string, body: string): Promise<void> {
    if (!this.isNative()) return;

    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title,
            body,
            schedule: { at: new Date() },
            actionTypeId: 'GEOFENCE_ACTION',
          },
        ],
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Check if location is within geofence radius
  isWithinGeofence(
    currentLat: number,
    currentLng: number,
    siteLat: number,
    siteLng: number,
    radiusMeters: number
  ): boolean {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((siteLat - currentLat) * Math.PI) / 180;
    const dLng = ((siteLng - currentLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentLat * Math.PI) / 180) *
        Math.cos((siteLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusMeters;
  }
}

// Singleton instance
export const geolocationService = new GeolocationService();
