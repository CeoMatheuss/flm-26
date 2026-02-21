import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user is authenticated
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { sellerId } = body;

    if (!sellerId || typeof sellerId !== 'string') {
      return new Response(JSON.stringify({ error: 'Seller ID inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get the seller's game save
    const { data: save } = await adminClient
      .from('game_saves')
      .select('club_data')
      .eq('user_id', sellerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!save || !save.club_data) {
      return new Response(JSON.stringify({ error: 'Time não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const clubData = save.club_data as any;
    const players = clubData.players || [];
    const loanedPlayers = clubData.loanedPlayers || [];
    const clubName = clubData.name || 'Clube';
    const clubProfile = clubData.clubProfile || null;

    // Return squad WITHOUT overall ratings - only name, position, age, loan status
    const squad = players.map((p: any) => {
      const isLoanedOut = loanedPlayers.some((l: any) => l.player?.id === p.id && l.direction === 'out');
      const isLoanedIn = loanedPlayers.some((l: any) => l.player?.id === p.id && l.direction === 'in');
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        age: p.age,
        isLoanedOut,
        isLoanedIn,
      };
    });

    // Add loaned-in players that might not be in the main squad
    for (const loan of loanedPlayers) {
      if (loan.direction === 'in' && !squad.some((s: any) => s.id === loan.player?.id)) {
        squad.push({
          id: loan.player?.id,
          name: loan.player?.name,
          position: loan.player?.position,
          age: loan.player?.age,
          isLoanedOut: false,
          isLoanedIn: true,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      clubName,
      shield: clubProfile ? {
        primaryColor: clubProfile.primaryColor,
        secondaryColor: clubProfile.secondaryColor,
        pattern: clubProfile.pattern,
        shape: clubProfile.shape,
      } : null,
      squad,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
