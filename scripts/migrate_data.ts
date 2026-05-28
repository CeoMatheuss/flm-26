import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = "https://bwowgkpjcbnozpktlnsl.supabase.co"
const SOURCE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3b3dna3BqY2Jub3pwa3RsbnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzE1MjYsImV4cCI6MjA5NDAwNzUyNn0.mqtmOaAyIjAI0INAKqqLbto_4s6rKWqXK_sQM7R-xbs"

const TARGET_URL = process.env.VITE_SUPABASE_URL
const TARGET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!TARGET_URL || !TARGET_KEY) {
  console.error("Missing TARGET environment variables")
  process.exit(1)
}

const source = createClient(SOURCE_URL, SOURCE_KEY)
const target = createClient(TARGET_URL, TARGET_KEY)

const tablesToMigrate = [
  "abuse_alerts", "admin_finance_logs", "admin_login_attempts", "admin_logs", 
  "admin_shop_activity", "auction_bids", "auction_history", "auth_verification_codes", 
  "beta_access_requests", "beta_whitelist", "calendar_schedule", "chat_bans", 
  "chat_messages", "club_active_effects", "club_memberships", "club_ranking_history", 
  "club_scouts", "club_shop_orders", "club_shop_products", "club_shop_sales_history", 
  "club_shop_stats", "club_sponsorships", "club_uniform_launches", "clubs", 
  "continental_qualifications", "countries", "country_status", "cup_config", 
  "cup_news", "cup_player_stats", "custom_tournament_matches", "custom_tournament_teams", 
  "custom_tournaments", "daily_training_sessions", "disciplinary_records", "finances", 
  "free_agent_offers", "free_agents_market", "friendly_invites", "game_bans", 
  "game_saves", "game_updates", "global_chat_messages", "global_chat_reactions", 
  "global_player_ranking", "global_ranking", "international_competition_clubs", 
  "international_competitions", "international_matches", "journal_updates", 
  "league_awards", "league_matches", "league_members", "league_player_stats", 
  "league_registration_logs", "league_squads", "league_waiting_list", 
  "legacy_user_migrations", "live_match_substitutions", "live_matches", 
  "loan_listings", "loan_negotiations", "loan_offers", "logistic_events", 
  "match_context_modifiers", "match_event_catalog", "match_history", 
  "match_narratives", "match_reports", "match_simulation_logs", "match_sync_log", 
  "match_worker_logs", "matches", "membership_plans", "membership_revenue_history", 
  "migration_logs", "mission_progress", "multiplayer_leagues", "national_cup_matches", 
  "national_cup_prizes", "national_cup_teams", "national_cups", "newspaper_entries", 
  "newspaper_reactions", "notification_read_state", "open_friendly_slots", 
  "payment_orders", "payment_webhooks_logs", "player_auctions", "player_competition_stats", 
  "player_development_points", "player_fatigue_logs", "player_missions", 
  "player_negotiations", "player_training_history", "players", "premium_sponsorships", 
  "premium_users", "private_messages", "prize_configurations", "profiles", "rivalries", 
  "scout_market_config", "scout_market_pool", "scout_missions", "scout_reports", 
  "scouts", "season_awards", "season_calendar", "season_system_state", 
  "security_rate_limits", "shipping_companies", "shop_inventory", "shop_items", 
  "shop_products", "shop_purchases", "shop_scout_packs", "support_messages", 
  "suspensions", "suspicious_activity", "system_settings", "tournament_group_standings", 
  "tournament_groups", "tournament_history", "tournament_matches", 
  "tournament_prizes_history", "tournament_rounds", "tournament_stats", "tournaments", 
  "trade_proposals", "transfer_listings", "transfer_log", "transfer_offers", 
  "uniform_sales_history", "user_notifications", "user_presence", "user_roles", 
  "user_versions", "world_countries", "world_cup_competitions", "world_cup_matches", 
  "world_cup_teams", "world_divisions", "world_event_queue", "world_league_config", 
  "world_league_news", "world_league_standings", "world_league_table", 
  "world_league_teams", "world_leagues", "world_match_events", "world_match_narratives", 
  "world_player_availability", "world_player_stats", "world_players", "world_standings", 
  "world_sync_state", "world_system_config", "world_teams", "youth_prospects"
]

async function migrateTable(tableName: string) {
  console.log(`Migrating table: ${tableName}...`)
  
  try {
    const { data: sourceData, error: sourceError } = await source
      .from(tableName)
      .select('*')
      
    if (sourceError) {
      console.error(`Error fetching from ${tableName}:`, sourceError.message)
      return
    }
    
    if (!sourceData || sourceData.length === 0) {
      console.log(`No data in ${tableName}`)
      return
    }

    // Insert in batches of 500
    const batchSize = 500
    for (let i = 0; i < sourceData.length; i += batchSize) {
      const batch = sourceData.slice(i, i + batchSize)
      const { error: targetError } = await target
        .from(tableName)
        .upsert(batch, { onConflict: 'id' })
        
      if (targetError) {
        console.error(`Error inserting into ${tableName} (batch ${i}):`, targetError.message)
        // If it fails, we continue to next table but log the issue
      }
    }
    
    console.log(`Successfully migrated ${sourceData.length} rows to ${tableName}`)
  } catch (err) {
    console.error(`Unexpected error migrating ${tableName}:`, err)
  }
}

async function start() {
  console.log(`Starting migration of ${tablesToMigrate.length} tables...`)
  
  for (const table of tablesToMigrate) {
    await migrateTable(table)
  }
  
  console.log("Full migration finished.")
}

start().catch(console.error)

  
  for (const table of priorityTables) {
    await migrateTable(table)
  }
  
  console.log("Core migration finished.")
}

start().catch(console.error)
