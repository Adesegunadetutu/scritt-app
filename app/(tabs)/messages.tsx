import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, Platform, StatusBar 
} from 'react-native';
import { useFocusEffect, Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { MessageSquareOff } from 'lucide-react-native'; // 1. Added context-specific icon
import { useNetworkObserver } from '@/hooks/useNetworkObserver'; // 2. Import observer

export default function Messages() {
  const router = useRouter();
  const { isConnected } = useNetworkObserver();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 1️⃣ FETCH INBOX
  const fetchInbox = useCallback(async () => {
    if (!isConnected) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data, error } = await supabase
  .from('messages')
  .select(`
    id,
    conversation_id,
    content,
    sender_id,
    receiver_id,
    inserted_at,
    is_read,
    topic,
    sender:profiles!fk_sender(full_name, avatar_url),
    receiver:profiles!fk_receiver(full_name, avatar_url)
  `)
  .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
  .order('inserted_at', { ascending: false });

      if (error) {
        console.error('Supabase Query Error:', error.message);
        return;
      }

      if (data) {
        // Group by conversation_id, take the latest message per conversation
        const latestMessages = data.reduce((acc: any[], current) => {
          const exists = acc.find(item => item.conversation_id === current.conversation_id);
          if (!exists) acc.push(current);
          return acc;
        }, []);

        setConversations(latestMessages);
      }
    } catch (e) {
      console.error('System Error:', e);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  useFocusEffect(
    useCallback(() => {
      fetchInbox();
    }, [fetchInbox])
  );


    // --- OFFLINE RENDER ---
  // 4. Block UI if disconnected
  if (!isConnected) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-green-50 p-6 rounded-full mb-6">
          <MessageSquareOff size={48} color="#166534" />
        </View>
        <Text className="text-2xl font-black text-gray-900 text-center">Connection Lost</Text>
        <Text className="text-gray-500 text-center mt-3 leading-6">
          You need an internet connection to see your messages. Please check your network and try again.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-8 bg-primary w-64 py-4 rounded-[24px] items-center self-center shadow-md active:opacity-70"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header Section */}
      <View 
        style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        className="bg-white border-b border-gray-100 px-4 pb-4 flex-row items-center"
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text className="text-2xl font-black text-gray-900">Messages</Text>
      </View>

      {/* Content Section */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#10b981" size="large" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
  const isMe = item.sender_id === currentUserId;
  
  // 🛡️ Robust check for the other person
  // If I sent it, the other person is the receiver. 
  // If I received it, the other person is the sender.
  const otherPerson = isMe ? item.receiver : item.sender;
  
  // Fallback if the other person deleted their account
  const displayName = otherPerson?.full_name || "Deleted User";
  const avatarUrl = otherPerson?.avatar_url;
  
  const unread = !item.is_read && !isMe;
  const isDeleted = item.content === '🚫 This message was deleted';
  const previewText = isDeleted ? 'Message deleted' : item.content;

  const avatarUri = avatarUrl
    ? { uri: avatarUrl }
    : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D9488&color=fff&bold=true` };
            return (
              <TouchableOpacity
                onPress={() => router.push(`/chat/${item.conversation_id}`)}
                className="flex-row px-4 py-4 items-center border-b border-gray-50"
              >
                <View className="w-14 h-14 bg-gray-200 rounded-full mr-4 overflow-hidden shadow-sm">
                  <Image source={avatarUri} className="w-full h-full" resizeMode="cover" />
                </View>

                <View className="flex-1">
                  <View className="flex-row justify-between mb-1">
                    <Text className={`text-base ${unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {displayName}
                    </Text>
                    <Text className="text-xs text-gray-400">{formatTime(item.inserted_at)}</Text>
                  </View>

                  <View className="flex-row items-center">
                    {item.topic && (
                      <View className="bg-green-100 px-2 py-0.5 rounded mr-2">
                        <Text className="text-[10px] text-green-700 font-bold uppercase">{item.topic}</Text>
                      </View>
                    )}
                    <Text 
                      numberOfLines={1} 
                      className={`flex-1 text-sm ${unread ? 'text-gray-900 font-medium' : 'text-gray-500'} ${isDeleted ? 'italic' : ''}`}
                    >
                      {isMe && !isDeleted ? `You: ${previewText}` : previewText}
                    </Text>
                  </View>
                </View>

                {unread && <View className="w-3 h-3 bg-green-500 rounded-full ml-2" />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}