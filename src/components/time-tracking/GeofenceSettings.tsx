import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { useGeofenceMonitoring } from '@/hooks/useGeofenceMonitoring';
import { toast } from 'sonner';

export function GeofenceSettings() {
  const { isMonitoring, startMonitoring, stopMonitoring, currentGeofences } = useGeofenceMonitoring();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Notifications enabled');
      } else {
        toast.error('Notifications blocked');
      }
    }
  };

  const handleToggleMonitoring = async (enabled: boolean) => {
    if (enabled) {
      await startMonitoring();
      toast.success('Geofence monitoring started');
    } else {
      stopMonitoring();
      toast.info('Geofence monitoring stopped');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Geofence Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Permission */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            {notificationPermission === 'granted' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : notificationPermission === 'denied' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                {notificationPermission === 'granted'
                  ? 'Notifications are enabled'
                  : notificationPermission === 'denied'
                  ? 'Notifications are blocked in browser settings'
                  : 'Allow notifications for geofence alerts'}
              </p>
            </div>
          </div>
          {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
            <Button onClick={handleRequestNotifications} variant="outline" size="sm">
              Enable
            </Button>
          )}
          {notificationPermission === 'granted' && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600">
              Enabled
            </Badge>
          )}
        </div>

        {/* Geofence Monitoring Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="geofence-toggle" className="font-medium">
                Geofence Monitoring
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when arriving at or leaving job sites
              </p>
            </div>
          </div>
          <Switch
            id="geofence-toggle"
            checked={isMonitoring}
            onCheckedChange={handleToggleMonitoring}
          />
        </div>

        {/* Current Status */}
        {isMonitoring && (
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">Monitoring Active</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentGeofences.size > 0
                ? `Currently at ${currentGeofences.size} job site(s)`
                : 'Not at any job sites'}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="text-sm text-muted-foreground">
          <p>
            When enabled, you'll receive notifications when you enter or leave job site 
            geofences. This helps you remember to clock in and out accurately.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
