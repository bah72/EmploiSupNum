import { User } from '../app/types';

// Validation du domaine @supnum.mr
export function validateSupnumEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@supnum\.mr$/;
  return emailRegex.test(email);
}

// Extraction du username depuis l'email
export function getUsernameFromEmail(email: string): string {
  return email.split('@')[0];
}

// Validation des rôles
export function isValidRole(role: string): role is 'admin' | 'prof' | 'student' {
  return ['admin', 'prof', 'student'].includes(role);
}

// Service d'authentification
export class AuthService {
  // Vérifier si l'email est autorisé
  static async validateEmail(email: string): Promise<{ valid: boolean; error?: string }> {
    if (!validateSupnumEmail(email)) {
      return { 
        valid: false, 
        error: 'Seuls les emails @supnum.mr sont autorisés' 
      };
    }
    return { valid: true };
  }

  // Authentification avec Supabase Auth
  static async signIn(email: string, password?: string): Promise<{ user: User | null; error?: string }> {
    try {
      // Valider l'email d'abord
      const emailValidation = await this.validateEmail(email);
      if (!emailValidation.valid) {
        return { user: null, error: emailValidation.error };
      }

      // Pour le développement, simuler l'authentification
      // En production, utilisez Supabase Auth
      const username = getUsernameFromEmail(email);
      
      // Vérification du mot de passe
      const isValidPassword = await this.validatePassword(email, password);
      if (!isValidPassword.valid) {
        return { user: null, error: isValidPassword.error };
      }
      
      // Rôle basé sur l'email spécifique
      let role: 'admin' | 'prof' | 'student' = 'student';
      if (email === 'moussa.ba@supnum.mr') {
        role = 'admin';
      } else if (email === 'cheikh.dhib@supnum.mr') {
        role = 'prof';
      } else if (email === '25064@supnum.mr') {
        role = 'student';
      } else if (/^\d{6,}$/.test(username)) {
        // Matricule : 6 chiffres ou plus
        role = 'student';
      } else if (username.includes('prof') || username.startsWith('p_')) {
        role = 'prof';
      }

      const user: User = {
        id: username,
        username,
        email,
        role,
        isActive: true
      };

      return { user };
    } catch (error) {
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Erreur d\'authentification' 
      };
    }
  }

  // Validation du mot de passe selon le type d'utilisateur
  static async validatePassword(email: string, password?: string): Promise<{ valid: boolean; error?: string }> {
    const username = getUsernameFromEmail(email);
    
    // Utilisateurs spécifiques avec mots de passe personnalisés
    if (email === 'moussa.ba@supnum.mr') {
      if (password !== 'moussa.ba') {
        return { 
          valid: false, 
          error: 'Mot de passe incorrect. Utilisez: moussa.ba' 
        };
      }
      return { valid: true };
    }
    
    if (email === 'cheikh.dhib@supnum.mr') {
      if (password !== 'cheikh.dhib') {
        return { 
          valid: false, 
          error: 'Mot de passe incorrect. Utilisez: cheikh.dhib' 
        };
      }
      return { valid: true };
    }
    
    if (email === '25064@supnum.mr') {
      if (password !== '12345678') {
        return { 
          valid: false, 
          error: 'Mot de passe incorrect. Utilisez: 12345678' 
        };
      }
      return { valid: true };
    }
    
    // Mot de passe par défaut pour les étudiants (matricule)
    if (/^\d{6,}$/.test(username)) {
      if (password !== '12345678') {
        return { 
          valid: false, 
          error: 'Mot de passe incorrect. Le mot de passe par défaut pour les étudiants est : 12345678' 
        };
      }
      return { valid: true };
    }
    
    // Pour admin et prof, mot de passe = username (pour le développement)
    if (username === 'admin' || username.includes('prof') || username.startsWith('p_')) {
      if (password !== username) {
        return { 
          valid: false, 
          error: `Mot de passe incorrect. Utilisez votre nom d'utilisateur : ${username}` 
        };
      }
      return { valid: true };
    }
    
    // Pour les autres étudiants, mot de passe par défaut
    if (password !== '12345678') {
      return { 
        valid: false, 
        error: 'Mot de passe incorrect. Le mot de passe par défaut est : 12345678' 
      };
    }
    
    return { valid: true };
  }

  // Vérifier les permissions
  static hasPermission(user: User, action: string): boolean {
    switch (action) {
      case 'view_schedule':
        return true; // Tout le monde peut voir
      case 'edit_schedule':
        return user.role === 'admin' || user.role === 'prof';
      case 'manage_users':
        return user.role === 'admin';
      case 'save_to_database':
        return user.role === 'admin';
      case 'export_data':
        return user.role === 'admin' || user.role === 'prof';
      default:
        return false;
    }
  }

  // Obtenir les permissions de l'utilisateur
  static getUserPermissions(user: User): string[] {
    const permissions = ['view_schedule'];
    
    if (user.role === 'admin') {
      permissions.push('edit_schedule', 'manage_users', 'save_to_database', 'export_data');
    } else if (user.role === 'prof') {
      permissions.push('edit_schedule', 'export_data');
    }
    
    return permissions;
  }
}
