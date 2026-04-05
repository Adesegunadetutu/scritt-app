import { useGlobalStore } from '../stores/globalStore';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 Minutes in milliseconds

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T | null> {
  const { getCache, setCache } = useGlobalStore.getState();

  const cachedEntry = getCache(key);
  const now = Date.now();

  // 1️⃣ Check if cache exists and is still "fresh"
  if (cachedEntry && (now - cachedEntry.timestamp < ttl)) {
    console.log(`%c [Cache Hit] ${key}`, 'color: #00ff00');
    return cachedEntry.data as T;
  }

  try {
    // 2️⃣ Fetch fresh data if expired or missing
    console.log(`%c [Fetching] ${key}`, 'color: #00bfff');
    const data = await fetcher();

    // 3️⃣ Update the store (this updates the timestamp too)
    setCache(key, data);
    return data;
  } catch (error) {
    console.error(`Fetch error for ${key}:`, error);

    // 4️⃣ Fallback: If network fails, return the old data even if expired
    return cachedEntry ? (cachedEntry.data as T) : null;
  }
}