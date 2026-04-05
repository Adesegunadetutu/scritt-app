// src/stores/useListingsStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface Listing {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  created_at: string;
  category: string | null;
  is_featured?: boolean;
  profiles?: {
    is_verified: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
}

interface ListingsState {
  listings: Listing[];
  featured: Listing[];
  categories: Category[];
  loading: boolean;
  isOffline: boolean; // 👈 Track offline status
  setOnlineStatus: (status: boolean) => void;
  fetchListings: () => Promise<void>;
}

export const useListingsStore = create<ListingsState>((set, get) => ({
  listings: [],
  featured: [],
  categories: [],
  loading: true,
  isOffline: false,

  // Called by your Network Observer in Root Layout
  setOnlineStatus: (status: boolean) => set({ isOffline: !status }),

  fetchListings: async () => {
    const { isOffline } = get();
    set({ loading: true });

    try {
      // 1️⃣ Load cached data first (Keep the UI snappy)
      const [cachedListings, cachedFeatured, cachedCategories] = await Promise.all([
        AsyncStorage.getItem('listings'),
        AsyncStorage.getItem('featured'),
        AsyncStorage.getItem('categories'),
      ]);

      if (cachedListings) set({ listings: JSON.parse(cachedListings) });
      if (cachedFeatured) set({ featured: JSON.parse(cachedFeatured) });
      if (cachedCategories) set({ categories: JSON.parse(cachedCategories) });

      // 2️⃣ If offline, stop here and show cached data
      if (isOffline) {
        set({ loading: false });
        return;
      }

      // 3️⃣ Fetch fresh data with Profile Joins for Verification Badges
      const [featuredRes, listingsRes, categoriesRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*, profiles (is_verified)') // 👈 Added profile join here
          .eq('is_featured', true)
          .limit(5),
        supabase
          .from('listings')
          .select('*, profiles (is_verified)')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .order('name')
      ]);

      // 4️⃣ Update State and AsyncStorage concurrently
      if (featuredRes.data) {
        set({ featured: featuredRes.data });
        AsyncStorage.setItem('featured', JSON.stringify(featuredRes.data));
      }
      
      if (listingsRes.data) {
        set({ listings: listingsRes.data });
        AsyncStorage.setItem('listings', JSON.stringify(listingsRes.data));
      }

      if (categoriesRes.data) {
        set({ categories: categoriesRes.data });
        AsyncStorage.setItem('categories', JSON.stringify(categoriesRes.data));
      }

    } catch (err) {
      console.error('Failed to fetch listings', err);
    } finally {
      set({ loading: false });
    }
  },
}));