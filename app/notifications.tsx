import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList, 
  StatusBar, 
  Platform,
  RefreshControl
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { 
  ChevronLeft, 
  Bell, 
  MessageCircle, 
  Home, 
  Briefcase, 
  Info, 
  CheckCheck 
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  content: string;
  // Expanded types for Accommodation and Services
  type: 'message' | 'accommodation' | 'service' | 'system';
  is_read: boolean;
  created_at: string;
  data?: {
    chat_id?: string;
    listing_id?: string;
    type_context?: string; // e.g., 'booking_confirmed', 'new_inquiry'
  };
}

// --- YOUR INITIAL SKELETON & SHIMMER LOGIC ---
const NotificationSkeleton = () => (
  <View className="flex-row items-start px-4 py-4 border-b border-gray-50 bg-white">
    <View className="w-10 h-10 bg-gray-100 rounded-full" />
    <View className="flex-1 ml-4">
      <View className="flex-row justify-between items-center">
        <View className="h-4 w-32 bg-gray-100 rounded" />
        <View className="w-2 h-2 bg-gray-50 rounded-full" />
      </View>
      <View className="h-3 w-full bg-gray-50 rounded mt-2" />
      <View className="h-3 w-2/3 bg-gray-50 rounded mt-1.5" />
      <View className="h-2 w-16 bg-gray-50 rounded mt-3" />
    </View>
  </View>
);

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetching Logic (All notifications)
  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      // Smooth transition for your skeleton
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 600);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // 2. Realtime logic
    let channel: any;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}` 
        }, (payload) => {
          setNotifications(current => [payload.new as Notification, ...current]);
        })
        .subscribe();
    };

    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  // 3. Centralized Routing Handler
  const handleNotificationClick = (item: Notification) => {
    markAsRead(item.id);

    const { chat_id, listing_id } = item.data || {};

    switch (item.type) {
      case 'message':
        if (chat_id) router.push(`/messages/${chat_id}`);
        break;
      case 'accommodation':
        if (listing_id) router.push(`/accommodation/${listing_id}`);
        break;
      case 'service':
        if (listing_id) router.push(`/services/${listing_id}`);
        break;
      default:
        // System or general updates
        if (listing_id) router.push(`/listing/${listing_id}`);
        break;
    }
  };

  // 4. Dynamic Icon Helper for all types
  const getIcon = (type: string) => {
    switch (type) {
      case 'message': 
        return <MessageCircle size={20} color="#166534" />;
      case 'accommodation': 
        return <Home size={20} color="#0ea5e9" />;
      case 'service': 
        return <Briefcase size={20} color="#f59e0b" />;
      default: 
        return <Info size={20} color="#6b7280" />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        className="bg-white border-b border-gray-100"
      >
        <View className="px-4 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <ChevronLeft size={28} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-xl font-black text-gray-900">Notifications</Text>
          </View>

          {notifications.some(n => !n.is_read) && (
            <TouchableOpacity onPress={markAllAsRead} className="bg-green-50 px-3 py-1.5 rounded-full">
              <Text className="text-primary font-bold text-xs">Read all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={loading ? Array(8).fill({}) : notifications}
        keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }} 
          />
        }
        renderItem={({ item }) => {
          if (loading) return <NotificationSkeleton />;
          
          return (
            <TouchableOpacity 
              onPress={() => handleNotificationClick(item)}
              className={`flex-row items-start px-4 py-4 border-b border-gray-50 ${item.is_read ? 'bg-white' : 'bg-green-50/30'}`}
            >
              <View className="mt-1 p-2 bg-gray-50 rounded-xl">
                {getIcon(item.type)}
              </View>
              
              <View className="flex-1 ml-4">
                <View className="flex-row justify-between items-start">
                  <Text 
                    className={`text-[15px] flex-1 mr-2 ${item.is_read ? 'font-medium text-gray-600' : 'font-bold text-gray-900'}`}
                  >
                    {item.title}
                  </Text>
                  {!item.is_read && <View className="w-2 h-2 bg-primary rounded-full mt-1.5" />}
                </View>
                
                <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                  {item.content}
                </Text>
                
                <Text className="text-[10px] text-gray-400 mt-2 font-semibold uppercase tracking-wider">
                  {formatDistanceToNow(new Date(item.created_at))} ago
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View className="flex-1 items-center mt-24 px-10">
              <View className="bg-gray-50 p-6 rounded-full">
                <Bell size={48} color="#d1d5db" />
              </View>
              <Text className="text-gray-900 font-bold text-lg mt-4 text-center">No notifications yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}