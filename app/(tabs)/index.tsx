import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Animated,
  Dimensions, 
  StatusBar, 
  Platform
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import ListingCard from '@/components/ListingCard';
import Header from "@/components/Header";
import { Ionicons } from "@expo/vector-icons";
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { GradientAvatar } from '@/components/GradientAvatar';
import { useListingsStore, Listing } from '@/stores/useListingsStore';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.6 + 12;

// --- SKELETONS ---
const ListingSkeleton = () => (
  <View style={{ padding: 6, width: '100%' }}>
    <View className="w-full aspect-square bg-gray-100 rounded-3xl" />
    <View className="h-4 w-3/4 bg-gray-100 rounded-md mt-3" />
    <View className="h-4 w-1/2 bg-gray-100 rounded-md mt-2" />
  </View>
);

const FeaturedSkeleton = () => (
  <View 
    style={{ width: width * 0.75, height: 180 }} 
    className="mr-3 rounded-[20px] bg-gray-100" 
  />
);

const CategorySkeleton = () => (
  <View className="items-center mr-6">
    <View className="w-16 h-16 bg-gray-100 rounded-3xl mb-2" />
    <View className="h-3 w-12 bg-gray-100 rounded-md" />
  </View>
);

function FeatureCard({ 
  title, 
  route, 
  icon, 
  bgColor 
}: { 
  title: string, 
  route: string, 
  icon: any,
  bgColor: string 
}) {
  const router = useRouter();
  
  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => router.push(route)}
      className="flex-1 bg-accent p-4 rounded-3xl border border-gray-100 shadow-sm items-center justify-center"
      style={{ elevation: 2 }} 
    >
      <View 
        style={{ backgroundColor: bgColor }}
        className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
      >
        <Ionicons name={icon} size={24} color="#16a34a" />
      </View>
      <Text className="text-gray-900 text-[14px] font-bold text-center">
        {title}
      </Text>
      <Text className="text-primary text-[10px] font-medium mt-1">Explore</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  // --- ZUSTAND STORE ---
  const { 
    listings, 
    featured, 
    categories, 
    loading: storeLoading, 
    fetchListings 
  } = useListingsStore();

  // --- LOCAL STATE ---
  const [userId, setUserId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [firstName, setFirstName] = useState("User");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>("all");
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  
  const categoryScrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const skeletonData = Array(6).fill({});
  const scrollViewRef = useRef<ScrollView>(null);
  const isOffline = useListingsStore((state) => state.isOffline);



  const ListEmptyComponent = () => (
  <View className="flex-1 items-center justify-center p-10">
    <Ionicons 
      name={isOffline ? "wifi-outline" : "search-outline"} 
      size={80} 
      color="#d1d5db" 
    />
    <Text className="text-xl font-bold mt-4 text-gray-800">
  {isOffline ? "No Connection" : "No results"}
</Text>

<Text className="text-center text-gray-500 mt-2">
  {isOffline 
    ? "We couldn't find any cached data. Please connect to the internet to load listings." 
    : "Try adjusting your filters."}
</Text>
  </View>
);


  // --- ANIMATION ---
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { 
          toValue: 1.05, 
          duration: 800, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.timing(pulseAnim, { 
          toValue: 1, 
          duration: 800, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);
  

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      setUserId(user?.id || null);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.full_name) setFirstName(profile.full_name.split(' ')[0]);
          setUserAvatar(profile.avatar_url);
        }

        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        setHasUnread(count ? count > 0 : false);
      }
    } catch (err) {
      console.error('User Fetch Error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchListings(),
      fetchUserData()
    ]);
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / ITEM_WIDTH);
    setActiveIndex(index);
  };

  const scrollToItem = (index: number) => {
    setActiveIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * ITEM_WIDTH,
      animated: true,
    });
  };

  useEffect(() => {
  fetchListings();
  fetchUserData();

  let listingsSub: any;
  let userSub: any; // Combine Profile and Notifications here

  const setupSubscriptions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // 1. Public Listings (Broadcast to everyone)
    listingsSub = supabase
      .channel('public-listings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listings' },
        () => fetchListings()
      )
      .subscribe();

    if (user) {
      // 2. Private User Data (Combined into ONE channel)
      userSub = supabase
        .channel(`user-updates-${user.id}`)
        // Add Notification Listener
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchUserData()
        )
        // Add Profile Listener (Registering BOTH before calling .subscribe())
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.avatar_url) setUserAvatar(payload.new.avatar_url);
            if (payload.new.full_name) setFirstName(payload.new.full_name.split(' ')[0]);
          }
        )
        .subscribe();
    }
  };

  setupSubscriptions();

  return () => {
    if (listingsSub) supabase.removeChannel(listingsSub);
    if (userSub) supabase.removeChannel(userSub);
  };
}, []); // ✅ REMOVE fetchListingsno

  useEffect(() => {
    if (!selectedCategorySlug || selectedCategorySlug.toLowerCase() === "all") {
      setFilteredListings(listings);
    } else {
      const filtered = listings.filter(item => 
        item.category?.toLowerCase() === selectedCategorySlug.toLowerCase()
      );
      setFilteredListings(filtered);
    }
  }, [selectedCategorySlug, listings]);

  const ListHeader = useMemo(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  


    return (
      <View className="bg-white">
        <View className="px-4 mb-6 mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
                onPress={() => router.push('/profile')} 
                activeOpacity={0.8} 
                className="mr-3"
              >
                <GradientAvatar 
                  uri={userAvatar} 
                  size={42} 
                  idSuffix="home" 
                />
              </TouchableOpacity>
            
            <View className="flex-row items-baseline">
              <Text className="text-gray-400 text-[12px] font-bold tracking-widest">{greeting}</Text>
              <Text className="text-[14px] font-bold text-gray-900 ml-1.5">{firstName}! 👋</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/notifications')} activeOpacity={0.7} className="p-2 bg-gray-50 rounded-full relative">
            <Ionicons name="notifications-outline" size={24} color="#1f2937" />
            {hasUnread && (
              <View className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </TouchableOpacity>
        </View>

        <View className="px-4 mb-6">
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/search')} className="bg-gray-100 rounded-2xl px-4 py-3 flex-row items-center">
            <Ionicons name="search-outline" size={20} color="#9ca3af" />
            <Text className="text-gray-400 ml-2 font-medium">Search items...</Text>
          </TouchableOpacity>
        </View>

        {/* --- ROOMMATE & LISTING SECTION --- */}
        <View className="px-4 flex-row" style={{ gap: 12 }}>
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push('/roommates')} 
            className="flex-[2.3] h-36 rounded-[28px] overflow-hidden relative" 
            style={{ backgroundColor: '#E8F6EF' }} 
          >
            <View style={{ position: 'absolute', right: -10, bottom: -15, width: '55%', height: '100%' }}>
                <Image 
                  source={require('../../assets/roommate_find.png')} 
                  contentFit="contain"
                  style={{ width: '100%', height: '100%' }}
                  cachePolicy="disk"
                />
            </View>
            <View className="p-4 justify-center h-full z-10 w-[50%]">
              <Text className="text-[14px] font-extrabold text-[#1B1B1B] leading-5 mb-2">Roommate Finder</Text>
              <View className="bg-white self-start px-3 py-2 rounded-full shadow-sm">
                <Text className="text-[#006B42] text-[8px] font-bold">Search Now</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push('/roommates/choice')}
            className="flex-1 h-36 bg-[#FFF9E1] rounded-[28px] items-center justify-center p-2" 
          >
            <View className="mb-1 relative">
              <Ionicons name="home" size={32} color="#006B42" />
              <View className="absolute -bottom-1 -right-1 bg-[#FFF9E1] rounded-full">
                <Ionicons name="add-circle" size={16} color="#006B42"/>
              </View>
            </View>
            <Text className="text-[#006B42] text-[12px] font-bold text-center leading-4">List a Room</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4 mt-4">
  {/* Header */}
  <View className="flex-row items-center justify-between px-4 mb-4">
    <Text className="text-xl font-medium text-gray-900">Featured Listings</Text>
    {!storeLoading && (
      <TouchableOpacity onPress={() => router.push('/featured')}>
        <Ionicons name="arrow-forward" size={22} color="#16a34a" />
      </TouchableOpacity>
    )}
  </View>

  {/* Slider */}
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false} 
    contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
    onScroll={handleScroll}
    scrollEventThrottle={16}
    snapToInterval={width * 0.75 + 12} // Should match card width + mr-3
    decelerationRate="fast"
    ref={scrollViewRef}
  >
    {storeLoading && featured.length === 0 ? (
      [1, 2, 3].map((val) => <FeaturedSkeleton key={`featured-skel-${val}`} />)
    ) : (
      featured.map((item, index) => (
        <TouchableOpacity
          key={`featured-${item.id}`}
          onPress={() => {
            scrollToItem(index); 
            router.push(`/listing/${item.id}`);
          }}
          // Updated width to match your Skeleton's width (0.75) for consistency
          style={{ width: width * 0.75, height: 180 }} 
          className="mr-3 relative overflow-hidden rounded-[20px] bg-gray-200"
        >
          <Image
            source={{ uri: String(item.images?.[0] || item.images) }}
            style={{ width: '100%', height: '100%' }}
            className="rounded-[20px]"
            cachePolicy="disk"
          />
        </TouchableOpacity>
      ))
    )}
  </ScrollView>

  {/* Pagination Dots - Fixed Visibility */}
  <View className="flex-row justify-center items-center mt-4 h-2"> 
    {(featured.length > 0 ? featured : [1, 2, 3]).map((_, index) => {
      const isActive = activeIndex === index;
      return (
        <View
          key={`dot-${index}`}
          className={`h-1.5 rounded-full mx-1 ${
            isActive ? 'w-4 bg-primary' : 'w-1.5 bg-gray-300'
          }`}
        />
      );
    })}
  </View>
</View>

        <View className="px-4 mt-2 mb-8 flex-row gap-3">
          <FeatureCard title="Accommodations" route="/accommodations" icon="business" bgColor="#ffffff" />
          <FeatureCard title="Services" route="/services" icon="construct" bgColor="#ffffff" />
        </View>

        <View className="px-4 mb-6">
          <Text className="text-xl font-medium mb-2 text-gray-900">Recent Listings</Text>
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 10 }}
          >
            {storeLoading && categories.length === 0 ? (
              [1, 2, 3, 4, 5].map((val) => <CategorySkeleton key={`cat-skel-${val}`} />)
            ) : (
              categories.map((cat, index) => (
                <TouchableOpacity 
                  key={`cat-item-${cat.id}-${index}`} 
                  onPress={() => {
                    setSelectedCategorySlug(cat.slug);
                    categoryScrollRef.current?.scrollTo({
                      x: index * 88 - (width / 2) + 44, 
                      animated: true,
                    });
                  }}
                  className="items-center mr-6"
                >
                  <View 
                    className={`w-16 h-16 rounded-3xl items-center justify-center border mb-2 ${
                      selectedCategorySlug === cat.slug ? 'bg-[#005d14] border-[#005d14]' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <Ionicons
                      name={(cat.icon_name as any) || "grid-outline"}
                      size={24}
                      color={selectedCategorySlug === cat.slug ? "#ffffff" : "#228B22"}
                    />
                  </View>
                  <Text className={`text-[11px] font-semibold ${selectedCategorySlug === cat.slug ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    );
  }, [storeLoading, featured, categories, firstName, userAvatar, hasUnread, selectedCategorySlug, router, activeIndex]);

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <StatusBar barStyle="dark-content" />
      <Header />
      <FlashList
        data={storeLoading && listings.length === 0 ? skeletonData : filteredListings}
        renderItem={({ item, index }) => 
          storeLoading && listings.length === 0 ? (
            <ListingSkeleton key={`list-skel-${index}`} />
          ) : (
            <View style={{ padding: 6 }}>
              <ListingCard item={item} userId={userId} />
            </View>
          )
        }
        numColumns={2}
        keyExtractor={(item, index) => storeLoading && listings.length === 0 ? `skel-${index}` : item.id.toString()}
        ListHeaderComponent={ListHeader}
        // Now it is actually "reading" the variable you created!
        ListEmptyComponent={!storeLoading ? ListEmptyComponent : null}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={{
          paddingHorizontal: 10,
          paddingBottom: 100
        }}
      />
    </SafeAreaView>
  );
}