import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Lire le fichier des politiques RLS
    const policiesPath = join(process.cwd(), 'supabase', 'policies.sql');
    const policiesContent = await readFile(policiesPath, 'utf-8');

    // Lire le fichier d'initialisation des utilisateurs
    const seedPath = join(process.cwd(), 'supabase', 'seed_users.sql');
    const seedContent = await readFile(seedPath, 'utf-8');

    return NextResponse.json({
      policies: policiesContent,
      seed: seedContent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read security files' },
      { status: 500 }
    );
  }
}
