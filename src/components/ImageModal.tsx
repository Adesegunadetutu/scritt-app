import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ImagePreviewModal({ visible, imageUrl, onClose }: any) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity 
          onPress={onClose} 
          className="absolute top-12 right-6 z-10 bg-black/50 p-2 rounded-full"
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        {/* The Full Screen Image */}
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.fullImage} 
          contentFit="contain" 
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)', // Dark overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },
});