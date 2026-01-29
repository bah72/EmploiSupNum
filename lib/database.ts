import Database from 'better-sqlite3';
import path from 'path';

// Créer ou ouvrir la base de données SQLite
const dbPath = path.join(process.cwd(), 'data', 'timetable.db');
const db = new Database(dbPath);

// Créer les tables si elles n'existent pas
db.exec(`
  CREATE TABLE IF NOT EXISTS timetable_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    data_type TEXT NOT NULL,
    data_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_user_data_type ON timetable_data(user_id, data_type);
`);

export interface TimetableData {
  id?: number;
  user_id: string;
  data_type: 'assignment_rows' | 'schedule' | 'config' | 'custom_rooms' | 'custom_subjects';
  data_content: string;
  created_at?: string;
  updated_at?: string;
}

export class TimetableDatabase {
  // Sauvegarder des données
  static saveData(userId: string, dataType: TimetableData['data_type'], dataContent: any): boolean {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO timetable_data (user_id, data_type, data_content, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(userId, dataType, JSON.stringify(dataContent));
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return false;
    }
  }

  // Charger des données
  static loadData(userId: string, dataType: TimetableData['data_type']): any | null {
    try {
      const stmt = db.prepare(`
        SELECT data_content FROM timetable_data 
        WHERE user_id = ? AND data_type = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `);
      
      const result = stmt.get(userId, dataType) as { data_content: string } | undefined;
      return result ? JSON.parse(result.data_content) : null;
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      return null;
    }
  }

  // Charger toutes les données d'un utilisateur
  static loadAllData(userId: string): Record<string, any> {
    try {
      const stmt = db.prepare(`
        SELECT data_type, data_content FROM timetable_data 
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `);
      
      const results = stmt.all(userId) as { data_type: string; data_content: string }[];
      const data: Record<string, any> = {};
      
      for (const result of results) {
        if (!data[result.data_type]) {
          data[result.data_type] = JSON.parse(result.data_content);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Erreur lors du chargement de toutes les données:', error);
      return {};
    }
  }

  // Supprimer les données d'un utilisateur
  static deleteUserData(userId: string): boolean {
    try {
      const stmt = db.prepare('DELETE FROM timetable_data WHERE user_id = ?');
      stmt.run(userId);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
  }

  // Obtenir la liste des utilisateurs avec des données
  static getUsers(): string[] {
    try {
      const stmt = db.prepare('SELECT DISTINCT user_id FROM timetable_data ORDER BY user_id');
      const results = stmt.all() as { user_id: string }[];
      return results.map(r => r.user_id);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  }
}

export default db;