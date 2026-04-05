import { createContext, useContext, useState } from 'react';

type FavoritesContextType = {
  favorites: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const FavoritesProvider = ({ children }: any) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  const addFavorite = (id: string) => {
    setFavorites(prev => [...prev, id]);
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav !== id));
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  return useContext(FavoritesContext)!;
};