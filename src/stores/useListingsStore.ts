// src/stores/useListingsStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { getSmartFeed } from '@/utils/feedLogic';

export interface Listing {
  lng: number;
  lat: number;
  location: any;
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  created_at: string;
  category: string | null;
  is_featured?: boolean;
  user_id: string; 
  dist_km?: number;
  profiles?: {
    is_verified: boolean;
    full_name?: string; 
    avatar_url?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
}

export interface Vehicle {
  title: string;
  id: string;
  user_id: string;
  make: string | null;
  model: string | null;
  year_of_manufacture?: number;
  mileage_km?: number;
  price: string | number;
  description?: string;
  image_urls: string[] | null;
  is_available?: boolean;
  condition?: string;
  transmission?: string;
  is_first_body?: boolean;
  is_ac_chilling?: boolean;
  engine_never_opened?: boolean;
  created_at: string;
  updated_at?: string;
  location?: string;
  profiles?: {
    is_verified: boolean;
    full_name?: string;
    avatar_url?: string;
  };
}

interface ListingsState {
  listings: Listing[];
  featured: Listing[];
  categories: Category[];
  vehicles: Vehicle[]; 
  sellers: any[];
  loading: boolean;
  isOffline: boolean; 
  setOnlineStatus: (status: boolean) => void;
  fetchListings: () => Promise<void>;
}

export const useListingsStore = create<ListingsState>((set, get) => ({
  listings: [],
  featured: [],
  categories: [],
  vehicles: [], 
  sellers: [],
  loading: true,
  isOffline: false,

  // Called by your Network Observer in Root Layout
  setOnlineStatus: (status: boolean) => set({ isOffline: !status }),

  fetchListings: async () => {
    const { isOffline } = get();
    set({ loading: true });

    try {
      // 1️⃣ Load cached data first (Keep the UI snappy)
      const [cachedListings, cachedFeatured, cachedCategories, cachedVehicles, cachedSellers] = await Promise.all([
        AsyncStorage.getItem('listings'),
        AsyncStorage.getItem('featured'),
        AsyncStorage.getItem('categories'),
        AsyncStorage.getItem('vehicles'), 
        AsyncStorage.getItem('sellers'), 
      ]);

      // Check if any offline cache metrics are pre-loaded
      const hasCache = cachedListings || cachedFeatured || cachedCategories || cachedVehicles || cachedSellers;

      if (cachedListings) set({ listings: JSON.parse(cachedListings) });
      if (cachedFeatured) set({ featured: JSON.parse(cachedFeatured) });
      if (cachedCategories) set({ categories: JSON.parse(cachedCategories) });
      if (cachedVehicles) set({ vehicles: JSON.parse(cachedVehicles) }); 
      if (cachedSellers) set({ sellers: JSON.parse(cachedSellers) });

      // 🔥 FIX: Drop loading flag immediately if data exists locally so skeletons hide gracefully
      if (hasCache) {
        set({ loading: false });
      }

      // 2️⃣ If offline, stop here and show cached data
      if (isOffline) {
        set({ loading: false });
        return;
      }

      // 3️⃣ Fetch fresh data with Profile Joins for Verification Badges
      const [featuredRes, listingsRes, categoriesRes, vehiclesRes, sellersRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*, profiles (is_verified)') 
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('listings')
          .select('*, profiles (is_verified)')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .order('name'),
        supabase
          .from('vehicles') 
          .select('*, profiles (is_verified)')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('is_verified', true)
          .limit(10)
      ]);

      // 4️⃣ Update State and AsyncStorage concurrently
      if (featuredRes.data) {
        const smartFeatured = getSmartFeed(featuredRes.data, 1);
        set({ featured: smartFeatured });
        AsyncStorage.setItem('featured', JSON.stringify(smartFeatured));
      }
      
      if (listingsRes.data) {
        const smartListings = getSmartFeed(listingsRes.data, 2);
        set({ listings: smartListings });
        AsyncStorage.setItem('listings', JSON.stringify(smartListings));
      }

      if (categoriesRes.data) {
        set({ categories: categoriesRes.data });
        AsyncStorage.setItem('categories', JSON.stringify(categoriesRes.data));
      }

      if (vehiclesRes.data) {
        const smartVehicles = getSmartFeed(vehiclesRes.data, 2);
        set({ vehicles: smartVehicles });
        AsyncStorage.setItem('vehicles', JSON.stringify(smartVehicles));
      }

      if (sellersRes.data) {
        set({ sellers: sellersRes.data });
        AsyncStorage.setItem('sellers', JSON.stringify(sellersRes.data));
      }

    } catch (err) {
      console.error('Failed to fetch listings', err);
    } finally {
      set({ loading: false });
    }
  },
}));