// /hooks/useAppInit.ts
import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/lib/supabase";

export const useAppInit = () => {
  const [isReady, setIsReady] = useState(false);

  const loadCachedData = useAppStore((s) => s.loadCachedData);
  const setUser = useAppStore((s) => s.setUser);
  const setListings = useAppStore((s) => s.setListings);

  useEffect(() => {
    const init = async () => {
      console.log("INIT START");
      try {
        loadCachedData();
        console.log("CACHE LOADED");

        // ADD 'await' HERE so data is actually there when the app opens
        fetchFreshData(); 
      } catch (e) {
        console.log("Init error:", e);
      } finally {
        console.log("SETTING READY TRUE");
        setTimeout(() => {
        setIsReady(true);
      }, 500);
      }
    };

    init();
  }, []);

  const fetchFreshData = async () => {
    try {
      // 👤 Fetch user
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUser(userData.user);
      }

      // 🛍️ Fetch listings
      const { data: listings } = await supabase
        .from("listings")
        .select("*");

      if (listings) {
        setListings(listings);
      }
    } catch (err) {
      console.log("Offline or fetch failed");
    }
  };

  return { isReady };
};