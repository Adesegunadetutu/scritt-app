1     // src/components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
export default function Button({ title, onPress, variant = 'primary', disabled = false }: {
title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean;
}) {
const base = 'py-3 rounded-xl items-center';
const variants = {
primary: 'bg-brand',secondary: 'bg-black',
ghost: 'bg-gray-100',
 } as const;
const textColor = variant === 'ghost' ? 'text-gray-800' : 'text-white';
return (
<TouchableOpacity onPress={onPress} disabled={disabled} className={`${base} ${variants[variant]} ${disabled ? 'opacity-60' : ''}`}>
<Text className={`font-semibold ${textColor}`}>{title}</Text>
</TouchableOpacity>
 );
20     }
21     
