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

async function getTables() {
  const { data, error } = await target.rpc('get_tables_list')
  if (error) {
    // Fallback if RPC doesn't exist - though we checked tables via tool
    return [
      "profiles", "clubs", "players", "world_teams", "world_players", "world_leagues",
      "world_matches", "multiplayer_leagues", "league_members", "finances"
      // Add more as needed or fetch dynamically if possible
    ]
  }
  return data.map(t => t.tablename)
}

async function migrateTable(tableName) {
  console.log(`Migrating table: ${tableName}...`)
  
  // 1. Fetch from source
  const { data: sourceData, error: sourceError } = await source
    .from(tableName)
    .select('*')
    .limit(1000) // Batching would be better for huge tables
    
  if (sourceError) {
    console.error(`Error fetching from ${tableName}:`, sourceError.message)
    return
  }
  
  if (!sourceData || sourceData.length === 0) {
    console.log(`No data in ${tableName}`)
    return
  }

  // 2. Insert into target
  const { error: targetError } = await target
    .from(tableName)
    .upsert(sourceData, { onConflict: 'id' })
    
  if (targetError) {
    console.error(`Error inserting into ${tableName}:`, targetError.message)
  } else {
    console.log(`Successfully migrated ${sourceData.length} rows to ${tableName}`)
  }
}

async function start() {
  // For safety, let's list core tables first to ensure dependencies are met
  const priorityTables = [
    "profiles", 
    "countries", 
    "world_countries",
    "world_leagues", 
    "world_teams", 
    "clubs", 
    "players", 
    "world_players"
  ]
  
  console.log("Starting migration...")
  
  for (const table of priorityTables) {
    await migrateTable(table)
  }
  
  console.log("Core migration finished.")
}

start().catch(console.error)
