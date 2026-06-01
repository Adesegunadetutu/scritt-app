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
import { useRouter, useFocusEffect } from 'expo-router';
import { GradientAvatar } from '@/components/GradientAvatar';
import { useListingsStore, Listing } from '@/stores/useListingsStore';
import MarqueeAnnouncement from '@/components/MarqueeAnnouncement';
import TopSellers from '@/components/TopSellers';


const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.6 + 12;
const isSmallDevice = width < 375;

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
  
  // Dynamically map premium icon/border colors based on the section theme
  const isAccommodations = title.toLowerCase().includes('accommod') || icon === 'business';
  const iconColor = isAccommodations ? '#3A7B66' : '#D97706';
  const cardBg = isAccommodations ? '#EDF7F4' : '#FFF9F2';
  const borderColor = isAccommodations ? '#D1E7DD' : '#FFE8CC';
  const badgeBg = isAccommodations ? '#D1E7DD' : '#FFE8CC';

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => router.push(route)}
      className="flex-1 h-36 rounded-[24px] p-4 justify-between border"
      style={{ 
        backgroundColor: cardBg,
        borderColor: borderColor,
      }} 
    >
      {/* Top Section: Icon Badge & Meta Text */}
      <View className="w-full">
        {/* Soft Circular Icon Badge */}
        <View 
          style={{ backgroundColor: badgeBg }}
          className="w-7 h-7 rounded-full items-center justify-center mb-2.5 self-start"
        >
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>

        {/* Left-aligned Premium Title */}
        <Text 
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-[#1A1A1A] text-base font-black tracking-tight mb-0.5 text-left"
        >
          {title}
        </Text>
        
        {/* Short context description placeholder to balance the card layout */}
        <Text className="text-[#666666] text-[9px] font-bold leading-3 text-left" numberOfLines={1}>
          {isAccommodations ? "Find verified stays fast." : "Discover expert local pros."}
        </Text>
      </View>

      {/* Bottom Section: Premium Compact Capsule Button */}
      <View className="bg-white border border-gray-100 self-start px-2.5 py-1 rounded-full shadow-sm flex-row items-center mt-1">
        <Text className="font-black text-[#1A1A1A] text-[9px] mr-0.5">
          Explore
        </Text>
        <Ionicons name="chevron-forward" size={10} color="#1A1A1A" />
      </View>
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
    vehicles, 
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
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [sellersLoading, setSellersLoading] = useState(true);
  
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
          .select('last_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (profile.last_name) setFirstName(profile.last_name.split(' ')[0]);
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


  const fetchTopSellers = async () => {
  try {
    setSellersLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, business_name, avatar_url, role, is_verified')
      .eq('role', 'user') // Or 'vendor' depending on how roles are assigned
      .eq('is_verified', true) // 👈 Adds the verification check
      .limit(10);

    if (error) throw error;
    setTopSellers(data || []);
  } catch (err: any) {
    console.error("Error fetching top sellers:", err.message);
  } finally {
    setSellersLoading(false);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchListings(),
      fetchUserData(),
      fetchTopSellers()
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
  fetchTopSellers();

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
            if (payload.new.last_name) setFirstName(payload.new.last_name.split(' ')[0]);
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
        <View className="px-4 mb-4 mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
                onPress={() => router.push('/profile')} 
                activeOpacity={0.8} 
                className="mr-3"
              >
                <GradientAvatar 
                  uri={userAvatar ? `${userAvatar}?t=${new Date().getTime()}` : null} 
                  size={42} 
                  idSuffix="home" 
                />
              </TouchableOpacity>
            
            <View className="flex-shrink">
          <Text className="text-gray-400 text-[11px] font-bold tracking-widest">
            {greeting}
          </Text>

          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-[14px] font-bold text-gray-900"
          >
            {firstName}! 👋
          </Text>
        </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/notifications')} activeOpacity={0.7} className="p-2 bg-gray-50 rounded-full relative">
            <Ionicons name="notifications-outline" size={24} color="#1f2937" />
            {hasUnread && (
              <View className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </TouchableOpacity>
        </View>

        <View className="px-4 mb-2">
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/search')} className="bg-gray-100 rounded-2xl px-4 py-3 flex-row items-center">
            <Ionicons name="search-outline" size={20} color="#9ca3af" />
            <Text className="text-gray-400 ml-2 font-medium">Search items...</Text>
          </TouchableOpacity>

          <View className="mt-4">
      {/* --- REUSABLE ANNOUNCEMENT DISCLAIMER --- */}
              <MarqueeAnnouncement 
                text="Disclaimer: Do NOT pay for any items, services, or accommodation until you have inspected and received them."
                duration={15000} // Tailor the speed as needed
              />
      </View>

        </View>
        <TopSellers sellers={topSellers} loading={sellersLoading} />

       {/* --- ROOMMATE & LISTING SECTION --- */}
      <View className="px-4 flex-row justify-between items-center w-full">
  
  {/* 1. FIND ROOMMATE CARD (Left Asymmetrical Card - Absolute Width Percentage) */}
  <TouchableOpacity 
    activeOpacity={0.9}
    onPress={() => router.push('/roommates')} 
    className="w-[62%] h-36 rounded-[24px] overflow-hidden relative bg-[#EDF7F4] border border-[#D1E7DD] p-3.5 justify-between" 
  >
    {/* Background Illustration Overlay */}
    <View style={{ position: 'absolute', right: -12, bottom: 0, width: '50%', height: '85%' }}>
      <Image 
        source={require('../../assets/roommate_find.png')} 
        contentFit="contain"
        style={{ width: '100%', height: '100%' }}
        cachePolicy="disk"
      />
    </View>

    {/* Text & Icon Stack Container */}
    <View className="z-10 justify-between flex-1 w-[55%]">
      <View>
        {/* Soft Circular Icon Badge */}
        <View className="w-6 h-6 rounded-full bg-[#D1E7DD] items-center justify-center mb-1">
          <Ionicons name="people" size={12} color="#3A7B66" />
        </View>

        <Text 
          numberOfLines={1}
          adjustsFontSizeToFit
          className="font-black text-[#1A1A1A] text-[14px] tracking-tight mb-0.5"
        >
          Find Roommate
        </Text>
        
        <Text className="text-[#666666] text-[9px] font-bold leading-3" numberOfLines={2}>
          Connect with verified roommates near you.
        </Text>
      </View>

      {/* Premium Green Interactive Capsule Button */}
      <View className="bg-[#006B42] self-start px-3 py-1 rounded-full mt-1 shadow-sm">
        <Text className="font-black text-white text-[9px]">
          Search Now
        </Text>
      </View>
    </View>
  </TouchableOpacity>


  {/* 2. LIST A ROOM CARD (Right Asymmetrical Card - Absolute Width Percentage) */}
  <TouchableOpacity 
    activeOpacity={0.9}
    onPress={() => router.push('/roommates/choice')}
    className="w-[35%] h-36 bg-[#FFF9F2] border border-[#FFE8CC] rounded-[24px] p-3.5 justify-between" 
  >
    {/* Text & Icon Stack Container */}
    <View className="flex-1 justify-between w-full">
      <View>
        {/* Soft Circular Icon Badge with Sub-Icon Layer */}
        <View className="w-6 h-6 rounded-full bg-[#FFE8CC] items-center justify-center mb-1 relative self-start">
          <Ionicons name="home" size={12} color="#D97706" />
          <View className="absolute -bottom-0.5 -right-0.5 bg-[#FFF9F2] rounded-full p-[0.5px]">
            <Ionicons name="add-circle" size={8} color="#D97706"/>
          </View>
        </View>

        <Text 
          numberOfLines={1}
          adjustsFontSizeToFit
          className="font-black text-[#1A1A1A] text-[14px] tracking-tight mb-0.5"
        >
          List a Room
        </Text>

        <Text className="text-[#666666] text-[9px] font-bold leading-3" numberOfLines={2}>
          Post your space fast.
        </Text>
      </View>

      {/* Premium White Interactive Capsule Button */}
      <View className="bg-white border border-gray-200 self-start px-2.5 py-1 rounded-full mt-1 shadow-sm">
        <Text className="font-black text-[#1A1A1A] text-[9px]">
          List Now
        </Text>
      </View>
    </View>
  </TouchableOpacity>

</View>


{/* --- FEATURED LISTINGS SECTION --- */}
<View className="mb-4 mt-4 bg-white">
  
  {/* Premium Clean Header Row */}
  <View className="px-5 flex-row justify-between items-center mb-4 mt-2">
  {/* Left Side: Icon + Title Group */}
  <View className="flex-row items-center">
    <Ionicons name="sparkles" size={20} color="#D97706" />
    <Text className="text-[#1A1A1A] text-xl font-black tracking-tight ml-2">
      Featured Listings
    </Text>
  </View>
  
  {/* Right Side: See All Link */}
  <TouchableOpacity 
    activeOpacity={0.7}
    onPress={() => router.push('/featured')}
    className="flex-row items-center"
  >
    <Text className="text-[#D97706] text-xs font-bold mr-0.5">See All</Text>
    <Ionicons name="chevron-forward" size={14} color="#D97706" />
  </TouchableOpacity>
</View>

  {/* Premium Horizontal Content Slider Area */}
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false} 
    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
    onScroll={handleScroll}
    scrollEventThrottle={16}
    snapToInterval={172} // Matches card width (160px) + margin spacing (12px)
    decelerationRate="fast"
    ref={scrollViewRef}
  >
    {storeLoading && featured.length === 0 ? (
      [1, 2, 3].map((val) => <FeaturedSkeleton key={`featured-skel-${val}`} />)
    ) : (
      featured.map((item, index) => {
        const itemImage = String(item.images?.[0] || item.images);
        const itemPrice = item.price ? `₦${Number(item.price).toLocaleString()}` : "Contact for Price";
        const itemLocation = item.location || "Lagos";

        return (
          <TouchableOpacity
            key={`featured-${item.id}`}
            activeOpacity={0.95}
            onPress={() => {
              scrollToItem(index); 
              router.push(`/listing/${item.id}`);
            }}
            className="bg-white border border-gray-100 rounded-[24px] mr-3 w-[160px] overflow-hidden"
            style={{
              elevation: 4,
              shadowColor: '#AAB8C2',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
            }}
          >
            {/* Aspect Container for Product Asset Imagery */}
            <View className="w-full h-[140px] bg-gray-50 relative">
              <Image
                source={{ uri: itemImage }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="disk"
              />
              
              {/* Absolute Top Floating Heart/Favorites Toggle Action */}
              <TouchableOpacity 
                activeOpacity={0.8}
                className="absolute top-2 right-2 bg-white w-7 h-7 rounded-full items-center justify-center shadow-sm"
                onPress={() => { /* Toggle your item favorite profile state logic */ }}
              >
                <Ionicons name="heart-outline" size={15} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {/* Structured Info Card Metadata Stack */}
            <View className="p-3">
              <Text 
                className="text-gray-900 text-[13px] font-bold mb-0.5" 
                numberOfLines={1}
              >
                {item.title}
              </Text>
              
              <Text 
                className="text-[#005d14] text-[12px] font-black mb-1"
                numberOfLines={1}
              >
                {itemPrice}
              </Text>

              {/* Geo-location Metadata Layout Row */}
              <View className="flex-row items-center opacity-60">
                <Ionicons name="location-sharp" size={10} color="#888888" />
                <Text className="text-gray-500 text-[10px] font-bold ml-0.5 capitalize" numberOfLines={1}>
                  {itemLocation}
                </Text>
              </View>
            </View>

          </TouchableOpacity>
        );
      })
    )}
  </ScrollView>

  {/* Refined Proportional Pagination System Indicators */}
  <View className="flex-row justify-center items-center mt-2 h-2"> 
    {(featured.length > 0 ? featured : [1, 2, 3]).map((_, index) => {
      const isActive = activeIndex === index;
      return (
        <View
          key={`dot-${index}`}
          className={`h-1.5 rounded-full mx-0.5 ${
            isActive ? 'w-4 bg-[#005d14]' : 'w-1.5 bg-gray-200'
          }`}
        />
      );
    })}
  </View>
</View>

        <View className="px-4 mt-2 mb-4 flex-row gap-3">
          <FeatureCard title="Accommodations" route="/accommodations" icon="business" bgColor="#ffffff" />
          <FeatureCard title="Services" route="/services" icon="construct" bgColor="#ffffff" />
        </View>

        {/* --- AUTOMOBILE/VEHICLE LISTINGS SECTION --- */}
<View className="mb-6 mt-2 bg-white">
  
  {/* Premium Clean Header Row */}
  <View className="px-5 flex-row justify-between items-center mb-4">
    {/* Left Side: Icon + Title Group */}
    <View className="flex-row items-center">
      <Ionicons name="car-sport" size={22} color="#005d14" />
      <Text className="text-[#1A1A1A] text-xl font-black tracking-tight ml-2">
        Vehicles
      </Text>
    </View>
    
    {/* Right Side: See All Link */}
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => router.push('/vehicles/vehicles')} 
      className="flex-row items-center"
    >
      <Text className="text-[#005d14] text-xs font-bold mr-0.5">See All</Text>
      <Ionicons name="chevron-forward" size={14} color="#005d14" />
    </TouchableOpacity>
  </View>

  {/* Premium Horizontal Content Slider Area */}
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false} 
    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
    snapToInterval={172} 
    decelerationRate="fast"
  >
    {storeLoading && vehicles.length === 0 ? (
      [1, 2, 3].map((val) => <FeaturedSkeleton key={`auto-skel-${val}`} />)
    ) : (
      // Maps directly from the pristine store vehicles table array
      vehicles
        .slice(0, 6) 
        .map((item) => {
          // 1️⃣ Map your table's custom image_urls field safely
          const itemImage = Array.isArray(item.image_urls) && item.image_urls.length > 0 
            ? item.image_urls[0] 
            : String(item.image_urls || '');

          // 2️⃣ Generate a fallback title using your database's 'make' and 'model' keys
          const itemTitle = item.title || `${item.make || ''} ${item.model || ''}`.trim() || "Vehicle";
          
          const itemPrice = item.price ? `₦${Number(item.price).toLocaleString()}` : "Contact for Price";
          
          // Fallback context default if location metadata isn't strictly on the vehicle table schema yet
          const itemLocation = item.location || "Lagos";

          return (
            <TouchableOpacity
              key={`auto-${item.id}`}
              activeOpacity={0.95}
              onPress={() => router.push(`/vehicles/${item.id}`)}
              className="bg-white border border-gray-100 rounded-[24px] mr-3 w-[160px] overflow-hidden"
              style={{
                elevation: 4,
                shadowColor: '#AAB8C2',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
              }}
            >
              {/* Aspect Container for Vehicle Imagery */}
              <View className="w-full h-[140px] bg-gray-50 relative">
                {itemImage ? (
                  <Image
                    source={{ uri: itemImage }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-gray-100">
                    <Ionicons name="car-outline" size={32} color="#9ca3af" />
                  </View>
                )}
                
                
              </View>

              {/* Structured Info Card Metadata Stack */}
              <View className="p-3">
                <Text 
                  className="text-gray-900 text-[13px] font-bold mb-0.5" 
                  numberOfLines={1}
                >
                  {itemTitle}
                </Text>
                
                <Text 
                  className="text-[#005d14] text-[12px] font-black mb-1"
                  numberOfLines={1}
                >
                  {itemPrice}
                </Text>

                {/* Geo-location Metadata Layout Row */}
                <View className="flex-row items-center opacity-60">
                  <Ionicons name="location-sharp" size={10} color="#888888" />
                  <Text className="text-gray-500 text-[10px] font-bold ml-0.5 capitalize" numberOfLines={1}>
                    {itemLocation}
                  </Text>
                </View>
              </View>

            </TouchableOpacity>
          );
        })
    )}
  </ScrollView>
</View>


      {/* Header */}
  <View className="px-5 flex-row justify-between items-center mb-4">
  {/* Left Side: Icon + Title Group */}
  <View className="flex-row items-center">
    <Ionicons name="time" size={20} color="#EAA535" />
    <Text className="text-[#1A1A1A] text-xl font-black tracking-tight ml-2">
      Recent Listings
    </Text>
  </View>
  
  {/* Right Side: See All Link */}
  <TouchableOpacity 
    activeOpacity={0.7}
    onPress={() => router.push('/recent')}
    className="flex-row items-center"
  >
    <Text className="text-[#005d14] text-xs font-bold mr-0.5">See All</Text>
    <Ionicons name="chevron-forward" size={14} color="#005d14" />
  </TouchableOpacity>
</View>
        <View className="px-4 mb-6">
          
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
                    // If the clicked category is already selected, unclick it (reset to "all")
                    if (selectedCategorySlug === cat.slug) {
                      setSelectedCategorySlug("all");
                    } else {
                      setSelectedCategorySlug(cat.slug);
                      categoryScrollRef.current?.scrollTo({
                        x: index * 88 - (width / 2) + 44, 
                        animated: true,
                      });
                    }
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
  }, [storeLoading, featured, categories, firstName, userAvatar, hasUnread, selectedCategorySlug, vehicles, router, activeIndex, listings, topSellers, sellersLoading]);

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