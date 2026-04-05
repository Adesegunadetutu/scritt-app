import { create } from 'zustand';

interface CacheState {
  hasCachedData: boolean;
  setHasCachedData: (status: boolean) => void;
}

export const useCacheStore = create<CacheState>((set) => ({
  hasCachedData: false, // Default to false
  setHasCachedData: (status) => set({ hasCachedData: status }),
}));