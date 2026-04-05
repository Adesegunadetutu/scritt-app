import React from 'react';
import { View } from 'react-native';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <View className={`bg-white border border-gray-200 rounded-xl ${className}`}>
      {children}
    </View>
  );
}
