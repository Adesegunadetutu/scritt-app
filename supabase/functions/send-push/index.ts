import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const { record, table } = payload

    console.log("🔥 Edge function triggered for table:", table)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ===============================
    // 1. PRIVATE MESSAGES
    // ===============================
    if (table === 'messages') {
  console.log("📩 New message record:", record)

  // 👤 Receiver (gets push)
  const { data: user, error } = await supabase
    .from('profiles')
    .select('push_token, notifications_enabled')
    .eq('id', record.receiver_id)
    .single()

  if (error) {
    console.error("❌ Error fetching receiver:", error)
  }

  // 👤 Sender (name for notification)
  const { data: sender, error: senderError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', record.sender_id)
    .single()

  if (senderError) {
    console.error("❌ Error fetching sender:", senderError)
  }

  const senderName =
    sender?.full_name || "Someone"

  if (
    user?.push_token &&
    user.notifications_enabled !== false &&
    user.push_token.startsWith("ExponentPushToken")
  ) {
    console.log("📲 Sending push to:", user.push_token)

    await sendPush(
      user.push_token,
      "New Message",
      `${senderName}: ${record.content || "You have a new message"}`,
      {
        screen: `/chat/${record.conversation_id}`,
        params: { id: record.conversation_id },
      }
    )
  } else {
    console.log("⚠️ Skipping push (invalid or missing token):", user)
  }
}

    // ===============================
// 2. NEW LISTINGS (GLOBAL PUSH)
// ===============================
else if (table === 'listings') {
  console.log("📦 New listing:", record)

  // Get all users who can receive notifications
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('notifications_enabled', true)
    .neq('id', record.user_id)

  if (error) {
    console.error("❌ Error fetching profiles:", error)
  }

  const tokens =
    profiles
      ?.map(p => p.push_token)
      .filter(t => t && t.startsWith("ExponentPushToken")) || []

  console.log("📲 GLOBAL listing tokens:", tokens.length)

  if (tokens.length > 0) {
    await sendPush(
      tokens,
      "🛒 New Listing Posted!",
      `${record.title} just got listed. Check it out now!`,
      {
        screen: `/listing/${record.id}`,
      }
    )
  }
}

   // ===============================
    // 3. NEW ACCOMMODATIONS (Housing)
    // ===============================
    else if (table === 'accommodations') {
      console.log("🏠 New accommodation record:", record)

      // Fetch users who want to be notified
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('notifications_enabled', true)
        .neq('id', record.user_id) // Don't notify the poster

      if (profileError) console.error("❌ Profile Fetch Error:", profileError)

      const tokens = profiles
        ?.map(p => p.push_token)
        .filter(t => t && t.startsWith("ExponentPushToken")) || []

      if (tokens.length > 0) {
        // Format price nicely (since it's numeric)
        const priceTag = record.price ? `₦${record.price.toLocaleString()}` : 'Check Price'
        
        await sendPush(
          tokens,
          "🏠 New Accommodation Available!",
          `${record.title} - ${priceTag} in ${record.location || 'your area'}`,
          { 
            screen: `/accommodation/${record.id}`, // Update this to your actual route
            id: String(record.id) 
          }
        )
      }
    }

    // ===============================
    // 4. NEW ROOMMATE REQUESTS
    // ===============================
    else if (table === 'roommate_requests') {
      console.log("👥 New roommate request:", record)

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('notifications_enabled', true)
        .neq('id', record.user_id) 

      if (profileError) console.error("❌ Profile Fetch Error:", profileError)

      const tokens = profiles
        ?.map(p => p.push_token)
        .filter(t => t && t.startsWith("ExponentPushToken")) || []

      if (tokens.length > 0) {
        const priceText = record.price ? `₦${record.price.toLocaleString()}` : 'Contact for details'
        const locationText = record.location ? ` in ${record.location}` : ''

        await sendPush(
          tokens,
          "👥 New Roommate Request!",
          `${record.title} | ${priceText}${locationText}`,
          { 
            screen: `/roommates/${record.id}`, // Ensure this route exists in your app
            id: String(record.id) 
          }
        )
      }
    }

    // ===============================
    // 5. NEW VEHICLE LISTINGS
    // ===============================
    else if (table === 'vehicles') {
      console.log("🚗 New vehicle record listed:", record)

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('notifications_enabled', true)
        .neq('id', record.user_id) // Don't notify the poster

      if (profileError) console.error("❌ Profile Fetch Error:", profileError)

      const tokens = profiles
        ?.map(p => p.push_token)
        .filter(t => t && t.startsWith("ExponentPushToken")) || []

      if (tokens.length > 0) {
        const vehiclePrice = record.price ? `₦${record.price.toLocaleString()}` : 'Check Price'
        const vehicleTitle = `${record.year_of_manufacture || ''} ${record.make || ''} ${record.model || 'Vehicle'}`.trim()
        const locationTag = record.location ? ` in ${record.location}` : ''

        await sendPush(
          tokens,
          "🚗 New Vehicle Listed!",
          `${vehicleTitle} available for ${vehiclePrice}${locationTag}.`,
          { 
            screen: `/vehicles/${record.id}`, 
            editId: String(record.id) 
          }
        )
      }
    }

    return new Response("Done", { status: 200 })
  } catch (err) {
    console.error("❌ Function error:", err)
    return new Response("Error", { status: 500 })
  }
})



// ✅ FIXED PUSH FUNCTION (ANDROID 13 SAFE)
// =======================================
async function sendPush(
  to: string | string[],
  title: string,
  body: string,
  data: any
) {
 const messages = Array.isArray(to)
  ? to.map(token => ({
      to: token,

      sound: "default",
      title,
      body,

      priority: "high",

      // 👇 VERY IMPORTANT
      channelId: "default",

      // 👇 REQUIRED for Android 13+ reliability
      data,

      // 👇 Add this
      android: {
        channelId: "default",
        priority: "max",
        sound: "default",
        vibrate: [0, 250, 250, 250],
      },

      // 👇 Add this (forces notification display)
      _displayInForeground: true,
    }))
  : [{
      to,

      sound: "default",
      title,
      body,

      priority: "high",
      channelId: "default",

      data,

      android: {
        channelId: "default",
        priority: "max",
        sound: "default",
        vibrate: [0, 250, 250, 250],
      },

      _displayInForeground: true,
    }]

  console.log("🚀 Sending messages:", JSON.stringify(messages, null, 2))

  const response = await fetch(
    'https://exp.host/--/api/v2/push/send',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    }
  )

  const res = await response.json()

  console.log("📩 FULL Expo response:", JSON.stringify(res, null, 2))

  if (res.data) {
    for (const item of res.data) {
      if (item.status === "error") {
        console.error("❌ Push error:", item.message, item.details)
      } else {
        console.log("✅ Push sent successfully:", item.id)
      }
    }
  } else {
    console.log("⚠️ Unexpected Expo response:", res)
  }

  return res
}