import fs from 'fs';
import path from 'path';

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'timetable.json');

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

// Charger la base de données depuis le fichier JSON
function loadDatabase(): DatabaseStructure {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Erreur lors du chargement de la base de données:', error);
    return {};
  }
}

// Sauvegarder la base de données dans le fichier JSON
function saveDatabase(data: DatabaseStructure): boolean {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la base de données:', error);
    return false;
  }
}

export class TimetableDatabase {
  // Sauvegarder des données
  static saveData(userId: string, dataType: TimetableData['data_type'], dataContent: any): boolean {
    try {
      const db = loadDatabase();
      
      if (!db[userId]) {
        db[userId] = {};
      }
      
      db[userId][dataType] = {
        data_content: dataContent,
        updated_at: new Date().toISOString()
      };
      
      return saveDatabase(db);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return false;
    }
  }

  // Charger des données
  static loadData(userId: string, dataType: TimetableData['data_type']): any | null {
    try {
      const db = loadDatabase();
      
      if (db[userId] && db[userId][dataType]) {
        return db[userId][dataType].data_content;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      return null;
    }
  }

  // Charger toutes les données d'un utilisateur
  static loadAllData(userId: string): Record<string, any> {
    try {
      const db = loadDatabase();
      const userData: Record<string, any> = {};
      
      if (db[userId]) {
        for (const [dataType, data] of Object.entries(db[userId])) {
          userData[dataType] = data.data_content;
        }
      }
      
      return userData;
    } catch (error) {
      console.error('Erreur lors du chargement de toutes les données:', error);
      return {};
    }
  }

  // Supprimer les données d'un utilisateur
  static deleteUserData(userId: string): boolean {
    try {
      const db = loadDatabase();
      delete db[userId];
      return saveDatabase(db);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
  }

  // Obtenir la liste des utilisateurs avec des données
  static getUsers(): string[] {
    try {
      const db = loadDatabase();
      return Object.keys(db);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  }
}