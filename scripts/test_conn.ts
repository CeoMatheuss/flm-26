import { createClient } from '@supabase/supabase-js'

const SOURCE_URL = "https://bwowgkpjcbnozpktlnsl.supabase.co"
const SOURCE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3b3dna3BqY2Jub3pwa3RsbnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzE1MjYsImV4cCI6MjA5NDAwNzUyNn0.mqtmOaAyIjAI0INAKqqLbto_4s6rKWqXK_sQM7R-xbs"

const TARGET_URL = process.env.VITE_SUPABASE_URL || "https://devjicsgksuxnnlkcliq.supabase.co"
const TARGET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

console.log(`Source URL: ${SOURCE_URL}`)
console.log(`Target URL: ${TARGET_URL}`)

const source = createClient(SOURCE_URL, SOURCE_KEY)
const target = createClient(TARGET_URL, TARGET_KEY)

async function testConnection() {
  console.log("Testing connections...")
  
  const { data: sourceData, error: sourceError } = await source.from('profiles').select('id').limit(1)
  if (sourceError) {
    console.error("Source connection failed:", sourceError.message)
  } else {
    console.log("Source connection OK")
  }

  const { data: targetData, error: targetError } = await target.from('profiles').select('id').limit(1)
  if (targetError) {
    console.error("Target connection failed:", targetError.message)
  } else {
    console.log("Target connection OK")
  }
}

testConnection()
