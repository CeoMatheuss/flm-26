import { createClient } from '@supabase/supabase-js'

/**
 * MIGRATION SCRIPT: From Current Project to Football Project
 * 
 * Instructions:
 * 1. Add the FOOTBALL_SERVICE_ROLE_KEY to your secrets or .env
 * 2. Run: bun scripts/migrate-to-football.ts
 */

const SOURCE_URL = "https://devjicsgksuxnnlkcliq.supabase.co"
// Use the service role key of the CURRENT project (you'll need to provide this or I'll try to find it)
const SOURCE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY 

const DEST_URL = "https://otfnvykeilfsvwgbcnhy.supabase.co" // Football Project
const DEST_KEY = process.env.FOOTBALL_SERVICE_ROLE_KEY

if (!SOURCE_KEY || !DEST_KEY) {
  console.error("Erro: SUPABASE_SERVICE_ROLE_KEY e FOOTBALL_SERVICE_ROLE_KEY devem estar definidos.")
  process.exit(1)
}

const sourceClient = createClient(SOURCE_URL, SOURCE_KEY)
const destClient = createClient(DEST_URL, DEST_KEY)

const tables = [
  "admin_shop_activity", "custom_tournament_teams", "national_cup_matches", "match_history", 
  "player_competition_stats", "custom_tournament_matches", "profiles", "global_player_ranking", 
  "membership_plans", "migration_logs", "tournament_groups", "premium_sponsorships", 
  "league_squads", "scout_market_config", "journal_updates", "match_worker_logs", 
  "legacy_user_migrations", "player_fatigue_logs", "club_uniform_launches", "suspicious_activity", 
  "player_negotiations", "calendar_schedule", "custom_tournaments", "game_saves", 
  "daily_training_sessions", "tournament_stats", "club_active_effects", "world_league_standings", 
  "cup_news", "tournament_group_standings", "admin_finance_logs", "shop_scout_packs", 
  "league_members", "national_cup_prizes", "national_cups", "global_chat_messages", 
  "club_memberships", "player_development_points", "youth_prospects", "world_cup_competitions", 
  "season_system_state", "world_countries", "disciplinary_records", "tournament_prizes_history", 
  "rivalries", "match_simulation_logs", "world_player_availability", "multiplayer_leagues", 
  "loan_offers", "prize_configurations", "friendly_invites", "shop_purchases", 
  "world_standings", "membership_revenue_history", "abuse_alerts", "world_matches", 
  "world_league_teams", "loan_negotiations", "live_matches", "transfer_log", 
  "free_agent_offers", "world_event_queue", "chat_bans", "world_teams", 
  "national_cup_teams", "clubs", "system_settings", "game_bans", 
  "user_versions", "private_messages", "suspensions", "loan_listings", 
  "newspaper_reactions", "scout_reports", "players", "user_roles", 
  "game_updates", "premium_users", "notification_read_state", "support_messages", 
  "shop_products", "global_ranking", "league_waiting_list", "club_ranking_history", 
  "uniform_sales_history", "beta_access_requests", "club_shop_stats", "world_cup_matches", 
  "club_sponsorships", "admin_logs", "player_training_history", "tournaments", 
  "scout_market_pool", "shop_inventory", "open_friendly_slots", "tournament_rounds", 
  "season_awards", "free_agents_market", "logistic_events", "world_system_config", 
  "cup_config", "world_divisions", "world_leagues", "shipping_companies", 
  "international_competition_clubs", "continental_qualifications", "chat_messages", "live_match_substitutions", 
  "international_matches", "match_narratives", "world_league_config", "world_player_stats", 
  "club_shop_products", "tournament_matches", "security_rate_limits", "transfer_listings", 
  "scout_missions", "club_shop_sales_history", "cup_player_stats", "club_scouts", 
  "auction_history", "league_player_stats", "season_calendar", "auction_bids", 
  "league_registration_logs", "user_notifications", "scouts", "mission_progress", 
  "country_status", "payment_webhooks_logs", "finances", "matches", 
  "world_players", "player_auctions", "countries", "transfer_offers", 
  "shop_items", "world_sync_state", "payment_orders", "league_awards", 
  "league_matches", "international_competitions", "world_league_table", "tournament_history", 
  "auth_verification_codes", "match_event_catalog", "world_league_news", "user_presence", 
  "trade_proposals", "global_chat_reactions", "team_ranking_history"
]

async function migrate() {
  console.log(`Iniciando migração para ${tables.length} tabelas...`)

  for (const table of tables) {
    console.log(`Migrando tabela: ${table}...`)
    
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await sourceClient
        .from(table)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error(`Erro ao ler ${table}:`, error.message)
        break
      }

      if (!data || data.length === 0) {
        hasMore = false
        break
      }

      const { error: insertError } = await destClient
        .from(table)
        .upsert(data, { onConflict: 'id' }) // Ajuste conforme a PK se necessário

      if (insertError) {
        console.error(`Erro ao inserir em ${table}:`, insertError.message)
        // Tentamos continuar com as outras tabelas
      }

      console.log(`  - ${data.length} linhas migradas (${page * pageSize + data.length} total)`)
      
      if (data.length < pageSize) {
        hasMore = false
      } else {
        page++
      }
    }
  }

  console.log("Migração concluída!")
}

migrate().catch(console.error)
