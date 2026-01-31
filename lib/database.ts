import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Dossier local pour le développement
const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'timetable.json');

// Configuration Supabase
console.log('Initialisation lib/database.ts...');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (SUPABASE_URL) console.log('SUPABASE_URL détectée');
if (SUPABASE_KEY) console.log('SUPABASE_KEY détectée');

const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

if (supabase) {
  console.log('Client Supabase initialisé avec succès.');
} else {
  console.warn('ATTENTION: Client Supabase NON initialisé (variables manquantes).');
}

// S'assurer que le dossier local existe en mode dev (non-Vercel)
if (!supabase && !fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) { }
}

export interface TimetableData {
  id?: string;
  user_id: string;
  data_type: 'assignment_rows' | 'schedule' | 'config' | 'custom_rooms' | 'custom_subjects';
  data_content: any;
  created_at?: string;
  updated_at?: string;
}

interface DatabaseStructure {
  [userId: string]: {
    [dataType: string]: {
      data_content: any;
      updated_at: string;
    }
  }
}

/**
 * Logique de stockage Hybride
 * - Si Supabase est configuré : utilise la table 'timetable_storage'
 * - Sinon : utilise le fichier local JSON
 */

// Charger la base de données intégrale
async function loadDatabase(): Promise<{ data: DatabaseStructure, source: 'cloud' | 'local' | 'empty' }> {
  // 1. Tenter Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('timetable_storage')
        .select('value')
        .eq('key', 'main_db')
        .maybeSingle();

      if (!error && data) return { data: data.value, source: 'cloud' };
      if (error) console.error('Erreur Supabase Load:', error);
    } catch (e) {
      console.error('Erreur Supabase Load exception:', e);
    }
  }

  // 2. Fallback Local JSON
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return { data: JSON.parse(data), source: 'local' };
    }
  } catch (error) {
    console.error('Erreur chargement local:', error);
  }
  return { data: {}, source: 'empty' };
}

// Sauvegarder la base de données intégrale
async function saveDatabase(data: DatabaseStructure): Promise<{ success: boolean, source: string, error?: string }> {
  // 1. Sauvegarder sur Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('timetable_storage')
        .upsert({ key: 'main_db', value: data, updated_at: new Date().toISOString() });

      if (!error) return { success: true, source: 'cloud' };
      return { success: false, source: 'cloud', error: `Supabase Error: ${error.message} (${error.code})` };
    } catch (e: any) {
      return { success: false, source: 'cloud', error: e.message };
    }
  }

  // 2. Sauvegarder Localement
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return { success: true, source: 'local' };
  } catch (error: any) {
    return { success: false, source: 'local', error: error.message };
  }
}

export class TimetableDatabase {
  static async saveData(userId: string, dataType: TimetableData['data_type'], dataContent: any): Promise<{ success: boolean, source?: string, error?: string }> {
    try {
      const { data: db } = await loadDatabase();
      if (!db[userId]) db[userId] = {};
      db[userId][dataType] = {
        data_content: dataContent,
        updated_at: new Date().toISOString()
      };
      return await saveDatabase(db);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  static async saveAllData(userId: string, allData: Record<string, any>): Promise<{ success: boolean, source?: string, error?: string }> {
    try {
      const { data: db } = await loadDatabase();
      if (!db[userId]) db[userId] = {};

      for (const [dataType, dataContent] of Object.entries(allData)) {
        db[userId][dataType] = {
          data_content: dataContent,
          updated_at: new Date().toISOString()
        };
      }

      return await saveDatabase(db);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  static async loadData(userId: string, dataType: TimetableData['data_type']): Promise<any | null> {
    const { data: db } = await loadDatabase();
    return db[userId]?.[dataType]?.data_content || null;
  }

  static async loadAllData(userId: string): Promise<Record<string, any>> {
    const { data: db } = await loadDatabase();
    const userData: Record<string, any> = {};
    if (db[userId]) {
      for (const [dataType, data] of Object.entries(db[userId])) {
        userData[dataType] = data.data_content;
      }
    }
    return userData;
  }

  static async deleteUserData(userId: string): Promise<{ success: boolean, source?: string, error?: string }> {
    const { data: db } = await loadDatabase();
    delete db[userId];
    return await saveDatabase(db);
  }

  static async getUsers(): Promise<string[]> {
    const { data: db } = await loadDatabase();
    return Object.keys(db);
  }

  // Gestion des utilisateurs de l'application (auth)
  static async getAppUsers(): Promise<any[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('timetable_storage')
          .select('value')
          .eq('key', 'app_users')
          .maybeSingle();
        if (!error && data) return data.value;
      } catch (e) { }
    }
    const usersPath = path.join(dataDir, 'users.json');
    try {
      if (fs.existsSync(usersPath)) {
        return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      }
    } catch (e) { }
    return [];
  }

  static async saveAppUsers(users: any[]): Promise<{ success: boolean, source: string, error?: string }> {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('timetable_storage')
          .upsert({ key: 'app_users', value: users, updated_at: new Date().toISOString() });
        if (!error) return { success: true, source: 'cloud' };
        return { success: false, source: 'cloud', error: error.message };
      } catch (e: any) {
        return { success: false, source: 'cloud', error: e.message };
      }
    }
    const usersPath = path.join(dataDir, 'users.json');
    try {
      fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
      return { success: true, source: 'local' };
    } catch (e: any) {
      return { success: false, source: 'local', error: e.message };
    }
  }
}