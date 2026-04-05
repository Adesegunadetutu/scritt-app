import { useState, useEffect, useCallback } from 'react';
import { useListingsStore } from '@/stores/useListingsStore'; // 1. Import the store
import { fetchWithCache } from '../../src/utils/fetchWithCache';

export function useSyncData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = 1000 * 60 * 30
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. Get the actual boolean value from the store
  const isOffline = useListingsStore((state) => state.isOffline);
  const isConnected = !isOffline; 

  const performSync = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await fetchWithCache(cacheKey, fetcher, ttl);
      setData(result);
    } catch (error) {
      console.error(`Sync Error [${cacheKey}]:`, error);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher, ttl]);

  // 1. Initial Load
  useEffect(() => {
    performSync(true);
  }, [performSync]);

  // 2. Re-sync when network comes back online
  useEffect(() => {
    // Now TypeScript knows isConnected is a boolean (true/false)
    if (isConnected) {
      performSync(false); 
    }
  }, [isConnected, performSync]);

  return { data, loading, isConnected, refetch: () => performSync(true) };
}