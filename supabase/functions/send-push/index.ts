import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const payload = await req.json()
  const { record, table } = payload 

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // --- LOGIC FOR PRIVATE MESSAGES ---
  // --- 1. PRIVATE MESSAGES ---
if (table === 'messages') {
  const { data: user } = await supabase
    .from('profiles')
    .select('push_token, notifications_enabled')
    .eq('id', record.receiver_id) // Match receiver_id from your schema
    .single()

 if (user?.push_token && user.notifications_enabled !== false) {
    await sendPush(user.push_token, `New Message`, record.content, {
      // FIX: Use the dynamic path that matches your file: app/chat/[id].tsx
      screen: `/chat/${record.conversation_id}`, 
      // Including these helps if you're using a notification listener
      params: { id: record.conversation_id } 
    })
  }
}

// --- 2. NEW LISTINGS ---
else if (table === 'listings') {
  const categoryValue = record.category;

  // Step A: Find users who favorited items in this category
  // Using the join-free method to avoid PGRST200 errors
  const { data: favoriteEntries } = await supabase
    .from('favorites')
    .select('user_id, listings!inner(category)')
    .eq('listings.category', categoryValue)
    .neq('user_id', record.user_id); // Filter out the person who posted (record.user_id)

  const userIds = [...new Set(favoriteEntries?.map(f => f.user_id) || [])];

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('push_token')
      .in('id', userIds)
      .eq('notifications_enabled', true);

    const tokens = profiles?.map(p => p.push_token).filter(t => t) || [];

    if (tokens.length > 0) {
      await sendPush(
        tokens, 
        "📦 New Match Found!", 
        `A new ${record.title} was listed in ${categoryValue}.`,
        { screen: `/listing/${record.id}` }
      );
    }
  }
}
  return new Response("Done")
})

async function sendPush(to: string | string[], title: string, body: string, data: any) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      title,
      body,
      sound: 'default',
      data,
    }),
  });

  const res = await response.json();

  console.log("📩 Expo response:", JSON.stringify(res));

  return res;
}