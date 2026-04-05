import { useEffect, useRef, useState } from 'react';
import NetInfo from "@react-native-community/netinfo";
import { useListingsStore } from '@/stores/useListingsStore';
import { supabase } from '@/lib/supabase';

export const useNetworkObserver = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const setOnlineStatus = useListingsStore((state) => state.setOnlineStatus);
  const fetchListings = useListingsStore((state) => state.fetchListings);
  const isFirstRun = useRef(true);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!(state.isConnected && (state.isInternetReachable ?? true));
      
      // 1. Update local state so components like ListingDetails can use it
      setIsConnected(isOnline);
      
      // 2. Update your global store
      setOnlineStatus(isOnline);

      if (isOnline) {
        if (isFirstRun.current) {
          isFirstRun.current = false;
          return; 
        }

        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);

        reconnectTimeout.current = setTimeout(async () => {
          console.log("Network Restored: Syncing fresh data...");
          
          try {
            await supabase.auth.getSession();
            await fetchListings();
          } catch (error) {
            console.warn("Reconnection sync failed:", error);
          }
        }, 1500); 
      } else {
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      }
    });

    return () => {
      unsubscribe();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [setOnlineStatus, fetchListings]); // Removed isConnected from deps to avoid loop

  // 3. CRITICAL: Return the state here
  return { isConnected };
};