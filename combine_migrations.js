const fs = require('fs');
const path = require('path');

const migrationsDir = 'supabase/migrations';
const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

files.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  process.stdout.write(`-- Migration: ${file}\n`);
  process.stdout.write(content);
  process.stdout.write('\n\n');
});
