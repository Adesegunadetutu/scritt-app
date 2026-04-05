import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, 
  Alert , Modal,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getSupabaseImage } from '@/utils/getSupabaseImage';

// --- 1️⃣ MEMOIZED MESSAGE COMPONENT ---
const MemoizedMessage = React.memo(({ item, currentUserId, onLongPress, onImagePress }: any) => {
  const isMe = item.sender_id === currentUserId;
  const isDeleted = item.content === '🚫 This message was deleted';
  
  const isEdited = useMemo(() => {
    if (!item.updated_at || isDeleted) return false;
    return (new Date(item.updated_at).getTime() - new Date(item.inserted_at).getTime() > 2000);
  }, [item.updated_at, item.inserted_at, isDeleted]);

  const timeString = useMemo(() => 
    new Date(item.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [item.inserted_at]
  );

  return (
    <TouchableOpacity 
      onLongPress={() => !isDeleted && onLongPress(item)} 
      activeOpacity={0.9}
      className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <View 
        className={`rounded-2xl shadow-sm overflow-hidden ${
          isMe 
            ? (isDeleted ? 'bg-gray-200' : 'bg-[#166534] rounded-tr-none') 
            : 'bg-white rounded-tl-none border border-gray-100'
        }`} 
        style={{ maxWidth: '85%' }}
      >
        {item.image_url && !isDeleted && (
          <TouchableOpacity onPress={() => onImagePress(item.image_url)}>
            <Image source={{ uri: item.image_url }} className="w-64 h-48" resizeMode="cover" />
          </TouchableOpacity>
        )}

        <View className="px-3 py-2">
          <Text className={`text-[15px] ${
            isDeleted ? 'text-gray-500 italic' : (isMe ? 'text-white' : 'text-gray-800')
          }`}>
            {item.content}
          </Text>
          
          <View className="flex-row items-center justify-end mt-1">
            {isEdited && (
              <Text className={`text-[9px] italic mr-1 ${isMe ? 'text-green-200/70' : 'text-gray-400'}`}>
                edited
              </Text>
            )}
            <Text className={`text-[10px] ${isMe && !isDeleted ? 'text-green-100' : 'text-gray-400'}`}>
              {timeString}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// --- 2️⃣ MAIN CHATROOM COMPONENT ---
export default function ChatRoom() {
  const router = useRouter();
  const { id: conversationId, topic: initialTopic, prefillTitle, prefillImage, table: originTable, initialMessage } = useLocalSearchParams();

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<{id: string, full_name: string, avatar_url: string} | null>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const sortedId = useMemo(() => (conversationId as string)?.split('_').sort().join('_'), [conversationId]);
  
  // Refs to prevent duplicate sends on re-renders
  const hasSentPrefill = useRef(false);
  const hasSentInitialMessage = useRef(false);

  useEffect(() => {
    if (!conversationId) return;
    let channel: any;

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const parts = (conversationId as string).split('_');
      const otherId = parts[0] === user.id ? parts[1] : parts[0];

      await fetchRecipientProfile(otherId);
      await fetchMessages();

      channel = supabase.channel(`chat:${sortedId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${sortedId}` 
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => (prev.find(m => m.id === payload.new.id) ? prev : [payload.new, ...prev]));
          }
          if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
          }
          if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const others = Object.keys(state).filter(key => key !== user.id);
          setIsOtherUserOnline(others.length > 0);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
        });
    };

    initialize();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [conversationId, sortedId]);

  // Combined logic for Prefill & Initial Message
  useEffect(() => {
    if (!currentUserId || !recipient) return;

    const handlePrefills = async () => {
      // 1. Send Prefill (Interest Image/Text)
      if ((prefillTitle || prefillImage) && !hasSentPrefill.current) {
        hasSentPrefill.current = true;
        const titleStr = Array.isArray(prefillTitle) ? prefillTitle[0] : prefillTitle;
        const imagePath = Array.isArray(prefillImage) ? prefillImage[0] : prefillImage;
        const tableStr = Array.isArray(originTable) ? originTable[0] : (originTable || 'listing');

        const tableMap: Record<string, string> = {
          'accommodation': 'accommodation_listings',
          'listing': 'listing-images',
          'service': 'service_portfolios'
        };

        const targetBucket = tableMap[tableStr] || 'listing-images';
        const finalImageUrl = imagePath ? getSupabaseImage(imagePath, targetBucket) : undefined;
        await sendMessage(`Interested in: ${titleStr}`, 'image', finalImageUrl);
      }

      // 2. Send Initial Message
      if (initialMessage && !hasSentInitialMessage.current) {
        hasSentInitialMessage.current = true;
        const msgStr = Array.isArray(initialMessage) ? initialMessage[0] : initialMessage;
        await sendMessage(msgStr, 'text');
      }
    };

    handlePrefills();
  }, [currentUserId, recipient]);

  const fetchRecipientProfile = async (otherId: string) => {
    const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', otherId).single();
    if (profile) setRecipient(profile);
  };

  const fetchMessages = async () => {
    if (!sortedId) return;
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', sortedId).order('inserted_at', { ascending: false });
    if (data) setMessages(data);
  };

  const sendMessage = async (content = newMessage, type = 'text', imageUri?: string) => {
  // Allow sending if there is either text OR an image
  const trimmedContent = content?.trim() || '';
  if (!trimmedContent && !imageUri) return;
  if (!currentUserId || !recipient) return;

  const currentTopic = messages[0]?.topic || (initialTopic as string)?.replace(/_/g, ' ');
  const itemThumbnail = (prefillImage as string) || messages.find(m => m.item_thumbnail)?.item_thumbnail;
  const tempId = Math.random().toString(36).substring(7);
  
  const optimisticMessage = {
    id: tempId,
    conversation_id: sortedId,
    content: trimmedContent,
    sender_id: currentUserId,
    receiver_id: recipient.id,
    image_url: imageUri || null, // Ensure the image URL is included here
    item_thumbnail: itemThumbnail,
    topic: currentTopic,
    inserted_at: new Date().toISOString(),
    is_read: false,
    is_sending: true,
  };

  setMessages(prev => [optimisticMessage, ...prev]);
  if (type === 'text') setNewMessage('');

  const { data, error } = await supabase.from('messages').insert([{
    conversation_id: sortedId,
    content: trimmedContent,
    sender_id: currentUserId,
    receiver_id: recipient.id,
    image_url: imageUri || null,
    item_thumbnail: itemThumbnail,
    topic: currentTopic,
    is_read: false
  }]).select().single();

  if (error) {
    console.error("DB Insert Error:", error.message);
    setMessages(prev => prev.filter(m => m.id !== tempId));
    Alert.alert("Error", "Message failed to send.");
  } else {
    setMessages(prev => prev.map(m => m.id === tempId ? data : m));
  }
};

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
  if (!currentUserId) return;
  setUploading(true);
  
  try {
    // 1. Get file extension and create a unique name
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

    // 2. Convert URI to ArrayBuffer (The fix for APKs)
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    // 3. Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Get the Public URL and call sendMessage
    if (data) {
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Trigger the send message function with the URL
      // We pass an empty string for content so it doesn't try to send 'undefined'
      await sendMessage('', 'image', urlData.publicUrl);
    }
  } catch (e: any) { 
    console.error("Upload Error:", e.message);
    Alert.alert("Upload Failed", "Could not upload image. Check your storage bucket permissions.");
  } finally { 
    setUploading(false); 
  }
};

  const handleLongPress = useCallback((message: any) => {
    if (message.sender_id !== currentUserId) return;
    Alert.alert("Message Options", "", [
      { text: "Edit", onPress: () => { setEditingMessage(message); setNewMessage(message.content); } },
      { text: "Delete", style: "destructive", onPress: () => confirmDelete(message.id) },
      { text: "Cancel", style: "cancel" }
    ]);
  }, [currentUserId]);

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Message", "This will replace the message text for everyone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setMessages(prev => prev.map(m => m.id === id ? { ...m, content: '🚫 This message was deleted', image_url: null } : m));
          await supabase.from('messages').update({ content: '🚫 This message was deleted', image_url: null, item_thumbnail: null, updated_at: new Date().toISOString() }).eq('id', id);
      }}
    ]);
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !newMessage.trim()) return;
    const { error } = await supabase.from('messages').update({ content: newMessage.trim(), updated_at: new Date().toISOString() }).eq('id', editingMessage.id);
    if (!error) {
      setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: newMessage.trim(), updated_at: new Date().toISOString() } : m));
      setEditingMessage(null);
      setNewMessage('');
    }
  };

  const renderItem = useCallback(({ item }: any) => (
    <MemoizedMessage item={item} currentUserId={currentUserId} onLongPress={handleLongPress}  onImagePress={(url: string) => setSelectedImage(url)}/>
  ), [currentUserId, handleLongPress ]);

  return (
    <View className="flex-1 bg-app-bg">
      <Stack.Screen options={{ headerShown: false }} />
            <View 
  style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10 }}
  className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center"
>
  {/* Back Arrow */}
  <TouchableOpacity 
    onPress={() => router.back()} 
    className="mr-3 p-1"
  >
    <Ionicons name="arrow-back" size={24} color="#374151" />
  </TouchableOpacity>

  {/* Avatar */}
  <View className="w-10 h-10 bg-gray-200 rounded-full mr-3 overflow-hidden border border-gray-100">
    <Image 
      source={{ uri: recipient?.avatar_url || `https://ui-avatars.com/api/?name=${recipient?.full_name || 'User'}&background=075E54&color=fff` }} 
      className="w-full h-full" 
    />
  </View>

  {/* Name and Status */}
  <View className="flex-1">
    <Text className="text-[17px] font-bold text-gray-900 leading-tight">
      {recipient?.full_name || "Loading..."}
    </Text>
    <View className="flex-row items-center mt-0.5">
      <View className={`w-2 h-2 rounded-full mr-1.5 ${isOtherUserOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
      <Text className={`text-[11px] font-bold tracking-tighter ${isOtherUserOnline ? 'text-green-600' : 'text-gray-400'}`}>
        {isOtherUserOnline ? 'online' : 'offline'}
      </Text>
    </View>
  </View>
</View>
         
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
        className="flex-1"
      >

        <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <TouchableOpacity 
            className="absolute top-12 right-6 z-10 p-2 bg-black/50 rounded-full"
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              className="w-full h-full" 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

        <FlatList
          data={messages}
          inverted
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderItem}
          initialNumToRender={15}
        />

        <View className="flex-row items-center p-3 bg-white border-t border-gray-200 pb-8">
          {editingMessage ? (
            <TouchableOpacity onPress={() => { setEditingMessage(null); setNewMessage(''); }} className="mr-3">
              <Ionicons name="close-circle" size={28} color="#ef4444" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={pickImage} className="mr-3">
              <Ionicons name="add" size={28} color="#075E54" />
            </TouchableOpacity>
          )}

          <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 mr-2">
            <TextInput
              placeholder={editingMessage ? "Edit message..." : "Message"}
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              className="text-[16px] max-h-24"
            />
          </View>

          <TouchableOpacity 
            onPress={editingMessage ? handleUpdateMessage : () => sendMessage()}
            disabled={uploading}
            className={`w-11 h-11 rounded-full items-center justify-center ${editingMessage ? 'bg-primary' : 'bg-secondary'}`}
          >
            {uploading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name={editingMessage ? "checkmark" : "send"} size={20} color="white" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}