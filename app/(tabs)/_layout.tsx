import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#005D14', // Scritt Green
        tabBarInactiveTintColor: '#94A3B8', 
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom, 
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          borderTopWidth: 0, 
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ) 
        }} 
      />

      <Tabs.Screen 
        name="favorites" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "heart" : "heart-outline"} color={color} focused={focused} />
          ) 
        }} 
      />

      <Tabs.Screen
        name="create-listing"
        options={{
          tabBarIcon: () => (
            <View style={styles.centerButtonContainer}>
              <View style={styles.innerButton}>
                 <Ionicons name="add" size={32} color="white" />
              </View>
            </View>
          ),
        }}
      />

      <Tabs.Screen 
        name="messages" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "chatbubble" : "chatbubble-outline"} color={color} focused={focused} />
          ) 
        }} 
      />

      <Tabs.Screen 
        name="profile" 
        options={{ 
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} focused={focused} />
          ) 
        }} 
      />
    </Tabs>
  );
}

function TabIcon({ name, color, focused }: { name: any, color: string, focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <View style={styles.iconContainer}>
        <Ionicons name={name} size={26} color={color} />
        {focused && <View style={styles.activeDot} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Ensures space for the iOS Home Indicator line
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40, // Fixed height for the icon area
    width: 40,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#005D14',
    position: 'absolute',
    bottom: -8, // Forces the dot to stay exactly 8px below the icon
  },
  centerButtonContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, 
  },
  innerButton: {
    width: 60,
    height: 60,
    backgroundColor: '#EFA33E',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#ffffff',
    top: -15, 
    elevation: 8,
    shadowColor: '#EFA33E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  }
});