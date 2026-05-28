import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import fs from 'node:fs'
import path from 'node:path'

const DEST_URL = "https://otfnvykeilfsvwgbcnhy.supabase.co"
const DEST_KEY = process.env.FOOTBALL_SERVICE_ROLE_KEY

if (!DEST_KEY) {
  console.error("Erro: A variável de ambiente FOOTBALL_SERVICE_ROLE_KEY não está definida.")
  process.exit(1)
}

const destClient = createClient(DEST_URL, DEST_KEY)

async function pushData() {
  const dataDir = path.join(process.cwd(), 'data')
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'))

  console.log(`Encontrados ${files.length} arquivos para migração.`)

  for (const file of files) {
    const tableName = file.replace('.csv', '')
    console.log(`Processando tabela: ${tableName}...`)

    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      cast: true // Tenta converter tipos automaticamente
    })

    if (records.length === 0) {
      console.log(`  - Tabela vazia, pulando.`)
      continue
    }

    // Chunk records to avoid large request errors
    const chunkSize = 500
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      
      const { error } = await destClient
        .from(tableName)
        .upsert(chunk)

      if (error) {
        console.error(`Erro ao inserir chunk na tabela ${tableName}:`, error.message)
        // Se a tabela não existir, podemos sugerir criar o schema primeiro
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
           console.error(`  - Dica: Verifique se as migrations foram aplicadas no projeto de destino.`)
           break // Pula o resto dessa tabela
        }
      } else {
        console.log(`  - ${i + chunk.length}/${records.length} linhas enviadas.`)
      }
    }
  }

  console.log("Migração de dados finalizada!")
}

pushData().catch(console.error)
