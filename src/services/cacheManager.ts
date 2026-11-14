const DEFAULT_TTL = 1000 * 30; // 30 seconds
const STORAGE_PREFIX = 'factura-cache:';

interface CacheEntry<T = unknown> {
  value: T;
  expiry: number;
}

const memoryCache = new Map<string, CacheEntry>();
let cacheGeneration = 0;

const getStorageKey = (key: string) => `${STORAGE_PREFIX}${key}`;

const readFromStorage = <T>(key: string): CacheEntry<T> | null => {
  try {
    const raw = localStorage.getItem(getStorageKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch (error) {
    // Si el contenido se corrompe, lo eliminamos para evitar errores futuros
    localStorage.removeItem(getStorageKey(key));
    return null;
  }
};

export const cacheManager = {
  get<T>(key: string): T | null {
    const now = Date.now();
    const entry = memoryCache.get(key) ?? readFromStorage<T>(key);

    if (!entry) {
      return null;
    }

    if (entry.expiry && entry.expiry < now) {
      this.delete(key);
      return null;
    }

    // Re-hidratar memoria para accesos posteriores
    memoryCache.set(key, entry);
    return entry.value as T;
  },

  set<T>(key: string, value: T, ttl: number = DEFAULT_TTL) {
    const entry: CacheEntry<T> = {
      value,
      expiry: ttl === Infinity ? Infinity : Date.now() + ttl,
    };

    memoryCache.set(key, entry);
    try {
      localStorage.setItem(getStorageKey(key), JSON.stringify(entry));
    } catch (error) {
      // Si el storage está lleno, limpiamos sólo la clave actual
      localStorage.removeItem(getStorageKey(key));
    }
  },

  delete(key: string) {
    memoryCache.delete(key);
    localStorage.removeItem(getStorageKey(key));
  },

  clearNamespace(namespace: string) {
    cacheGeneration++;
    Array.from(memoryCache.keys()).filter(key => key.startsWith(namespace)).forEach(key => memoryCache.delete(key));
    const prefix = getStorageKey(namespace);
    Object.keys(localStorage)
      .filter((storageKey) => storageKey.startsWith(prefix))
      .forEach((storageKey) => localStorage.removeItem(storageKey));
  },

  clearAll() {
    cacheGeneration++;
    memoryCache.clear();
    Object.keys(localStorage)
      .filter((storageKey) => storageKey.startsWith(STORAGE_PREFIX))
      .forEach((storageKey) => localStorage.removeItem(storageKey));
  },
};

interface FetchOptions {
  ttl?: number;
  forceRefresh?: boolean;
  useCache?: boolean;
}

export async function fetchWithCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: FetchOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, forceRefresh = false, useCache = true } = options;

  if (!forceRefresh && useCache) {
    const cached = cacheManager.get<T>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  }

  const generation = cacheGeneration;
  const freshValue = await fetcher();
  if (generation === cacheGeneration) cacheManager.set(cacheKey, freshValue, ttl);
  return freshValue;
}
