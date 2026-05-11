
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const countries = [
  "Argentina",
  "Alemanha",
  "Espanha",
  "Itália",
  "Portugal",
  "Inglaterra",
  "França",
  "Brasil"
];

async function fillTeams() {
  console.log("Filling teams for all countries...");

  for (const country of countries) {
    const { data: leagues } = await supabase
      .from("world_leagues")
      .select("id")
      .eq("country", country)
      .limit(1);

    if (!leagues || leagues.length === 0) {
      console.log(`No league found for ${country}, skipping.`);
      continue;
    }

    const leagueId = leagues[0].id;

    const { count } = await supabase
      .from("world_teams")
      .select("*", { count: "exact", head: true })
      .eq("country", country);

    const needed = 64 - (count || 0);

    if (needed > 0) {
      console.log(`Creating ${needed} bot teams for ${country}...`);
      const newTeams = [];
      for (let i = 1; i <= needed; i++) {
        newTeams.push({
          name: `${country} Bot ${i + (count || 0)}`,
          country: country,
          league_id: leagueId,
          is_bot: true,
          strength: Math.floor(Math.random() * 30) + 50 // 50-80
        });
      }

      // Insert in chunks of 50
      for (let i = 0; i < newTeams.length; i += 50) {
        const chunk = newTeams.slice(i, i + 50);
        const { error } = await supabase.from("world_teams").insert(chunk);
        if (error) console.error(`Error inserting teams for ${country}:`, error);
      }
    } else {
      console.log(`${country} already has enough teams (${count}).`);
    }
  }

  console.log("Resetting all national cups...");
  // Clear all cup related data
  await supabase.from("national_cup_matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("national_cup_teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("national_cup_prizes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error: resetError } = await supabase.from("national_cups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  
  if (resetError) {
    console.error("Error resetting cups:", resetError);
  } else {
    console.log("All cups reset successfully.");
  }
}

fillTeams();
