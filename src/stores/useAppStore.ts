import { create } from "zustand";
import { storage } from "../lib/storage";

type AppState = {
  user: any;
  listings: any[];

  setUser: (user: any) => void;
  setListings: (listings: any[]) => void;

  loadCachedData: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  listings: [],

  setUser: (user) => {
    set({ user });
    storage.set("user", JSON.stringify(user));
  },

  setListings: (listings) => {
    set({ listings });
    storage.set("listings", JSON.stringify(listings));
  },

  loadCachedData: async () => {
    const cachedUser = await storage.getString("user");
    const cachedListings = await storage.getString("listings");

    set({
      user: cachedUser ? JSON.parse(cachedUser) : null,
      listings: cachedListings ? JSON.parse(cachedListings) : [],
    });
  },
}));