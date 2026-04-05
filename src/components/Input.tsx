import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  className?: string;
}

export default function Input({ className = '', ...props }: InputProps) {
  return (
    <TextInput
      {...props}
      className={`border border-gray-200 rounded-xl px-3 py-3 ${className}`}
    />
  );
}
