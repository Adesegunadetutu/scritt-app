// src/hooks/useListings.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useListings() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load listings from Supabase
  async function load() {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('is_sold', false)
      .order('created_at', { ascending: false });

    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // Initial load
    load();

    // Realtime subscription for listings table
    const channel = supabase
      .channel('public:listings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        () => load()
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading, reload: load };
}
