import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { team_name, competition, phase, event_type, result, player_name, colors } = await req.json();

    // Context-aware prompt generation
    let prompt = `Professional sports announcement graphic for ${team_name}. `;
    
    if (event_type === 'champion') {
      prompt += `CELEBRATION: ${team_name} are CHAMPIONS of ${competition}! Golden trophy, fireworks, confetti, "CHAMPIONS" text. `;
    } else if (event_type === 'advanced') {
      prompt += `ACHIEVEMENT: ${team_name} advancing to ${phase} in ${competition}. Excitement, energy, "QUALIFIED" text. `;
    } else if (event_type === 'historic_win') {
      prompt += `VICTORY: Historic win for ${team_name} against a tough rival in ${competition}. Final score: ${result}. High drama. `;
    } else if (event_type === 'mvp') {
      prompt += `PLAYER HIGHLIGHT: ${player_name} is the MOTM for ${team_name} in ${competition}. Heroic pose, skill focus. `;
    } else if (event_type === 'top_scorer') {
      prompt += `STAR PLAYER: ${player_name} is the top scorer of ${competition} for ${team_name}. Golden boot theme. `;
    } else {
      prompt += `MATCH DAY: ${team_name} in ${competition}. Results: ${result}. `;
    }

    prompt += `Style: EA Sports FC 25 / ESPN style, cinematic lighting, 4k, dynamic composition, sports broadcasting package. Colors: ${colors?.primary || 'team colors'} and ${colors?.secondary || 'accents'}. Include subtle player silhouettes or soccer stadium background.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    const aiData = await aiRes.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('Image gen failed:', aiData);
      return new Response(JSON.stringify({ error: 'Image generation failed', details: aiData }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', message: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});