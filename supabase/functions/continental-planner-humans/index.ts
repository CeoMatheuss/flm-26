// continental-planner-humans
// Gera competições continentais (Principal/Secundária) para cada continente onde existem ligas D1 humanas.
// Calendário: dispara no DIA 13 (2 dias antes do início). Início real é dia 15.
// Pode ser chamado por cron ou manualmente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CONTINENTS = [
  "América do Sul", "Europa", "América do Norte",
  "África", "Ásia", "Oceania",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { 
    season?: number; 
    startDate?: string; // YYYY-MM-DD
    continent?: string;
    tier?: 'principal' | 'secundaria' | 'both';
    force?: boolean;
  } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const season = body.season ?? 1;
  const startDate = body.startDate ?? new Date().toISOString().slice(0, 10);
  const tierFilter = body.tier ?? 'both';
  const targetContinents = body.continent ? [body.continent] : CONTINENTS;
  
  const results: any[] = [];

  for (const continent of targetContinents) {
    for (const tier of (['principal', 'secundaria'] as const)) {
      if (tierFilter !== 'both' && tierFilter !== tier) continue;

      // Verifica se já existe uma para esta temporada
      const { data: existing } = await supabase
        .from("continental_competitions")
        .select("id, status")
        .eq("continent", continent)
        .eq("tier", tier)
        .eq("season", season)
        .maybeSingle();

      if (existing && existing.status === "in_progress" && !body.force) {
        results.push({ continent, tier, skipped: "already in progress", id: existing.id });
        continue;
      }

      // Chama RPC para criar
      const { data: compId, error } = await supabase.rpc("start_continental_tournament", {
        _continent: continent,
        _tier: tier,
        _season: season,
        _start_date: startDate,
      });

      if (error) {
        results.push({ continent, tier, error: error.message });
        continue;
      }
      
      results.push({ continent, tier, competition_id: compId, status: "created" });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
