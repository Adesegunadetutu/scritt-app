import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface GlobalState {
  cache: Record<string, any>;
  setCache: (key: string, data: any) => void;
  getCache: (key: string) => any;
  clearCache: () => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      cache: {},
      setCache: (key, data) =>
        set((state) => ({
          cache: { ...state.cache, [key]: data },
        })),
      getCache: (key) => get().cache[key],
      clearCache: () => set({ cache: {} }),
    }),
    {
      name: 'global-cache',
      // Casting to StateStorage ensures TypeScript compatibility across platforms
      storage: createJSONStorage(() => 
        (Platform.OS === 'web' ? window.localStorage : AsyncStorage) as StateStorage
      ),
    }
  )
);