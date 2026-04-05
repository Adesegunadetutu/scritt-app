import { TouchableOpacity } from "react-native";
import { Plus } from "lucide-react-native"; // Corrected import source
import React from "react";

export default function FloatingAddButton({ onPress }: any) {
  return (
    <TouchableOpacity 
  onPress={onPress}
  activeOpacity={0.9}
  className="bg-primary w-16 h-16 rounded-full items-center justify-center shadow-lg shadow-green-900"
>
  <Plus color="white" size={30} />
</TouchableOpacity>
  );
}