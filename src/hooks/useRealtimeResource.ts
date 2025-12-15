import * as React from 'react';
import { fetchWithCache } from '../services/cacheManager';

interface UseRealtimeResourceOptions<T> {
  cacheKey: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  interval?: number;
  enabled?: boolean;
  useCacheOnMount?: boolean;
}

interface FetchControlOptions {
  forceFresh?: boolean;
  silent?: boolean;
}

interface UseRealtimeResourceResult<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  refetch: (options?: FetchControlOptions) => Promise<T | null>;
  isStale: boolean;
}

export function useRealtimeResource<T>(options: UseRealtimeResourceOptions<T>): UseRealtimeResourceResult<T> {
  const { cacheKey, fetcher, ttl, interval = 15000, enabled = true, useCacheOnMount = true } = options;

  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<unknown>(null);
  const [isStale, setIsStale] = React.useState<boolean>(false);

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  const isMounted = React.useRef(true);
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const performFetch = React.useCallback(
    async (fetchOptions: FetchControlOptions = {}) => {
      if (!enabled) return null;

      const shouldUseCache = fetchOptions.forceFresh ? false : useCacheOnMount;
      if (!fetchOptions.silent) {
        setLoading(true);
      }

      try {
        const freshData = await fetchWithCache(cacheKey, () => fetcherRef.current(), {
          ttl,
          forceRefresh: fetchOptions.forceFresh,
          useCache: shouldUseCache,
        });

        if (isMounted.current) {
          setData(freshData);
          setError(null);
          setIsStale(false);
        }

        return freshData;
      } catch (err) {
        if (isMounted.current) {
          setError(err);
          setIsStale(true);
        }
        return null;
      } finally {
        if (!fetchOptions.silent && isMounted.current) {
          setLoading(false);
        }
      }
    },
    [cacheKey, ttl, enabled, useCacheOnMount]
  );

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    performFetch({ forceFresh: false });

    if (interval === null || interval === undefined || interval <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      performFetch({ forceFresh: true, silent: true });
    }, interval);

    return () => {
      window.clearInterval(timerId);
    };
  }, [performFetch, enabled, interval]);

  React.useEffect(() => {
    const revalidateOnFocus = () => {
      performFetch({ forceFresh: true, silent: true });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        revalidateOnFocus();
      }
    };

    window.addEventListener('focus', revalidateOnFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', revalidateOnFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performFetch]);

  const refetch = React.useCallback(
    async (options?: FetchControlOptions) => performFetch({ forceFresh: options?.forceFresh, silent: options?.silent }),
    [performFetch]
  );

  return { data, loading, error, refetch, isStale };
}

export default useRealtimeResource;
