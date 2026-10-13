import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { api, DEMO_MODE } from '../api/client';
import { DEMO_POINT } from '../api/demo';
import { errorMessage } from '../api/errors';
import type { Route } from '../api/types';
export function useTracking(route: Route | null | undefined) {
  const [enabledRouteId, setEnabledRouteId] = useState<string | null>(null);
  const enabled = !!route && route.status === 'InProgress' && enabledRouteId === route.id;
  const [error, setError] = useState('');
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const inFlight = useRef(false);
  const toggle = async () => {
    if (enabled) {
      setEnabledRouteId(null);
      return;
    }
    if (requesting) return;
    setRequesting(true);
    setError('');
    try {
      if (!DEMO_MODE) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted')
          throw new Error(
            'Permita a localização nas configurações do aparelho para compartilhar o GPS.',
          );
      }
      if (route?.status === 'InProgress') setEnabledRouteId(route.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRequesting(false);
    }
  };
  useEffect(() => {
    if (!enabled || route?.status !== 'InProgress') return;
    let active = true;
    const send = async () => {
      if (AppState.currentState !== 'active' || inFlight.current) return;
      inFlight.current = true;
      try {
        const current = await api.currentRoute();
        if (!active || AppState.currentState !== 'active') return;
        if (!current || current.id !== route.id || current.status !== 'InProgress') {
          setEnabledRouteId(null);
          return;
        }
        const fix = DEMO_MODE
          ? { coords: { ...DEMO_POINT, speed: null, heading: null }, timestamp: Date.now() }
          : await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active || AppState.currentState !== 'active') return;
        await api.updateLocation(route.truckId, {
          latitude: fix.coords.latitude,
          longitude: fix.coords.longitude,
          speedKmh:
            fix.coords.speed == null || fix.coords.speed < 0 ? null : fix.coords.speed * 3.6,
          heading: fix.coords.heading == null || fix.coords.heading < 0 ? null : fix.coords.heading,
          recordedAt: new Date(fix.timestamp).toISOString(),
        });
        if (active) {
          setLastSent(new Date().toISOString());
          setError('');
        }
      } catch (e) {
        if (active) setError(errorMessage(e));
      } finally {
        inFlight.current = false;
      }
    };
    void send();
    const interval = setInterval(send, 20000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void send();
    });
    return () => {
      active = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [enabled, route?.id, route?.truckId, route?.status]);
  return { enabled, requesting, error, lastSent, toggle };
}
