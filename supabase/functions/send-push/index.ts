import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const payload = await req.json()
  const { record } = payload 

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Get recipient token using receiver_id from your table
  const { data: user } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', record.receiver_id) // Matches your column_name: receiver_id
    .single()

  if (user?.push_token) {
    // 2. Push to Expo
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.push_token,
        title: `New Message`, 
        body: record.content, // Matches your column_name: content
        data: { 
          screen: "/(tabs)/messages/chat", 
          id: record.conversation_id // Matches your column_name: conversation_id
        },
      }),
    })
  }

  return new Response("Done")
})