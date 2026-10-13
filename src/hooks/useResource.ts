import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from '../api/errors';

export function useResource<T>(loader: () => Promise<T>, key = '', pollMs = 0) {
  const loaderRef = useRef(loader);
  useLayoutEffect(() => {
    loaderRef.current = loader;
  }, [loader]);
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const focused = useRef(false);
  const lastKey = useRef(key);
  const refresh = useCallback(async (silent = false) => {
    const ticket = ++generation.current;
    if (!silent) setRefreshing(true);
    try {
      const value = await loaderRef.current();
      if (focused.current && ticket === generation.current) {
        setData(value);
        setError('');
      }
    } catch (e) {
      if (focused.current && ticket === generation.current) setError(errorMessage(e));
    } finally {
      if (focused.current && ticket === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (lastKey.current !== key) {
        lastKey.current = key;
        setLoading(true);
        setData(undefined);
        setError('');
      }
      void refresh();
      const interval = pollMs
        ? setInterval(() => {
            if (AppState.currentState === 'active') void refresh(true);
          }, pollMs)
        : undefined;
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refresh(true);
      });
      return () => {
        focused.current = false;
        generation.current++;
        if (interval) clearInterval(interval);
        subscription.remove();
      };
    }, [key, pollMs, refresh]),
  );
  return { data, loading, refreshing, error, refresh };
}
