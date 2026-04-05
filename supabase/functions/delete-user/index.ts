import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// supabase/functions/delete-user/index.ts

serve(async (req) => {
  // 1. Force CORS to be wide open
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { userId } = await req.json();
  if (!userId) throw new Error("No userId");

  console.log("Starting manual cleanup for:", userId);

  // MANUALLY CLEAR DATA FIRST (The "Power Move")
  // This prevents 500 errors from foreign key conflicts
  await adminClient.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  await adminClient.from('conversations').delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  await adminClient.from('listings').delete().eq('user_id', userId);
  await adminClient.from('profiles').delete().eq('id', userId);

  // NOW DELETE THE AUTH USER
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;

  return new Response(JSON.stringify({ message: "Account wiped successfully" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

} catch (error: any) {
  console.error("CRITICAL FAILURE:", error.message);
  return new Response(JSON.stringify({ error: error.message }), {
    status: 200, // We return 200 but send the error so Expo doesn't crash
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
} 
});