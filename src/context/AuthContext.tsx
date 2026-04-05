import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// Define what the context will provide
type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // In your AuthContext.tsx
useEffect(() => {
  const checkSession = async () => {
    try {
      // Add a small timeout or just ensure it hits finally
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (e) {
      console.warn("Auth session fetch failed (likely offline)");
    } finally {
      setLoading(false); // ALWAYS set loading to false
    }
  };

  checkSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });

  return () => subscription.unsubscribe();
}, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access
export const useAuth = () => useContext(AuthContext);