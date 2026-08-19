/**
 * Script to import auction_players.csv into Supabase players table.
 * Run with: npx tsx scripts/import-players.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function mapPositionGroup(position: string): string {
  switch (position) {
    case 'GK': return 'GK';
    case 'CB': case 'LB': case 'RB': case 'LWB': case 'RWB': return 'DEF';
    case 'CDM': case 'CM': case 'CAM': return 'MID';
    case 'LM': case 'RM': case 'LW': case 'RW': return 'WING';
    case 'ST': case 'CF': return 'ST';
    default: return 'MID';
  }
}

function generateExternalId(name: string, club: string, index: number): string {
  const slug = `${name}_${club}`.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40);
  return `fc24_${slug}_${index}`;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      row[headers[j]] = values[j];
    }
    if (row['PlayerName']) {
      rows.push(row);
    }
  }
  return rows;
}

async function main() {
  console.log('Reading auction_players.csv...');
  const csvPath = resolve(__dirname, '..', 'auction_players.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Validate
  const valid: any[] = [];
  const invalid: any[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row['PlayerName'];
    const ovr = parseInt(row['OVR'], 10);
    let position = row['Position'];
    const posGroupRaw = row['PositionGroup'];

    if (!name) { invalid.push({ row: i + 2, reason: 'Missing PlayerName' }); continue; }
    if (isNaN(ovr) || ovr < 1 || ovr > 99) { invalid.push({ row: i + 2, reason: `Invalid OVR: ${row['OVR']}` }); continue; }
    if (!position) { invalid.push({ row: i + 2, reason: 'Missing Position' }); continue; }

    // Handle multi-position like "CAM, CM" — take the first one
    if (position.includes(',')) {
      position = position.split(',')[0].trim();
    }

    // Validate position is in allowed set
    const VALID_POSITIONS = ['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','ST','CF'];
    if (!VALID_POSITIONS.includes(position)) {
      invalid.push({ row: i + 2, reason: `Invalid position: ${position}` });
      continue;
    }

    const posGroup = posGroupRaw || mapPositionGroup(position);
    const VALID_GROUPS = ['GK', 'DEF', 'MID', 'WING', 'ST'];
    const finalPosGroup = VALID_GROUPS.includes(posGroup) ? posGroup : mapPositionGroup(position);

    if (!name) { invalid.push({ row: i + 2, reason: 'Missing PlayerName' }); continue; }
    if (isNaN(ovr) || ovr < 1 || ovr > 99) { invalid.push({ row: i + 2, reason: `Invalid OVR: ${row['OVR']}` }); continue; }
    if (!position) { invalid.push({ row: i + 2, reason: 'Missing Position' }); continue; }

    const externalId = generateExternalId(name, row['Club'] || '', i);
    if (seenIds.has(externalId)) { invalid.push({ row: i + 2, reason: `Duplicate ID: ${externalId}` }); continue; }
    seenIds.add(externalId);

    valid.push({
      name,
      overall_rating: ovr,
      position,
      position_group: finalPosGroup,
      nationality: row['Nationality'] || null,
      club: row['Club'] || null,
      photo_url: row['Photo'] || null,
      external_id: externalId,
      is_active: true,
    });
  }

  console.log(`Valid: ${valid.length}, Invalid: ${invalid.length}`);
  if (invalid.length > 0) {
    console.log('Invalid rows:', invalid.slice(0, 10));
  }

  // Clear old catalogue
  console.log('Clearing old player catalogue...');
  const { error: deleteErr } = await supabase.from('players').delete().gte('overall_rating', 0);
  if (deleteErr) {
    console.error('Delete error:', deleteErr);
  } else {
    console.log('Old catalogue cleared.');
  }

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('players').insert(batch);
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nImport complete!`);
  console.log(`  Total CSV rows: ${rows.length}`);
  console.log(`  Successfully imported: ${inserted}`);
  console.log(`  Invalid/skipped: ${invalid.length}`);
  console.log(`  Duplicates: 0`);

  // Verify
  const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
  console.log(`  Players in database: ${count}`);
}

main().catch(console.error);
