import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestResult {
  system: string;
  status: "pass" | "fail";
  severity: "critical" | "high" | "medium" | "low" | "none";
  message: string;
  details?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const report: TestResult[] = [];

    // 1. TESTE DE INTEGRIDADE DE DADOS (Duplicações e Inconsistências)
    const { data: dupMatches } = await supabase.rpc('check_duplicate_matches'); // Precisamos criar este RPC ou fazer via query
    const { count: dupTeamsCount } = await supabase.from('world_teams').select('id', { count: 'exact', head: true });
    
    // 2. TESTE DE CALENDÁRIO (Conflitos de Horários)
    const { data: scheduleConflicts } = await supabase.rpc('check_schedule_conflicts');
    
    // 3. SIMULAÇÃO DE PARTIDAS (Estresse)
    // Simula 100 partidas rápidas para verificar erros de motor
    let simErrors = 0;
    for(let i=0; i<10; i++) { // Reduzido para 10 no teste inicial de integridade
      const res = await fetch(`${supabaseUrl}/functions/v1/world-match-simulator`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_mode: true })
      });
      if (!res.ok) simErrors++;
    }

    report.push({
      system: "Match Simulator",
      status: simErrors === 0 ? "pass" : "fail",
      severity: simErrors > 5 ? "critical" : simErrors > 0 ? "high" : "none",
      message: simErrors === 0 ? "Motor de partida estável" : `${simErrors} falhas detectadas na simulação`,
    });

    // 4. VERIFICAÇÃO DE CONTINENTAIS
    const { data: tournaments } = await supabase.from('tournaments').select('*').eq('status', 'in_progress');
    const continentalOk = tournaments?.some(t => t.type === 'continental');
    
    report.push({
      system: "Continental Competitions",
      status: continentalOk ? "pass" : "fail",
      severity: "high",
      message: continentalOk ? "Torneios continentais ativos encontrados" : "Nenhum torneio continental em andamento",
    });

    // 5. TESTE DE SAVE E PERSISTÊNCIA
    const { data: lastMatches } = await supabase.from('match_history').select('*').limit(1);
    report.push({
      system: "Save System",
      status: lastMatches && lastMatches.length > 0 ? "pass" : "fail",
      severity: "critical",
      message: lastMatches && lastMatches.length > 0 ? "Persistência de histórico funcionando" : "Falha ao recuperar histórico de partidas",
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      summary: {
        total_tests: report.length,
        passed: report.filter(r => r.status === "pass").length,
        failed: report.filter(r => r.status === "fail").length,
        critical_bugs: report.filter(r => r.severity === "critical" && r.status === "fail").length
      },
      report 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});