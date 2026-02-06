import { User } from '../app/types';
import { AuthService } from './auth';

export type Permission = 
  | 'view_schedule'
  | 'edit_schedule'
  | 'manage_users'
  | 'save_to_database'
  | 'export_data'
  | 'delete_data'
  | 'view_statistics'
  | 'manage_rooms'
  | 'manage_subjects';

export interface RolePermissions {
  [key: string]: Permission[];
}

// Définition des permissions par rôle
const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    'view_schedule',
    'edit_schedule',
    'manage_users',
    'save_to_database',
    'export_data',
    'delete_data',
    'view_statistics',
    'manage_rooms',
    'manage_subjects'
  ],
  prof: [
    'view_schedule',
    'export_data'
  ],
  student: [
    'view_schedule'
  ]
};

// Gestionnaire des rôles
export class RoleManager {
  // Vérifier si un utilisateur a une permission spécifique
  static hasPermission(user: User, permission: Permission): boolean {
    if (!user || !user.isActive) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  }

  // Obtenir toutes les permissions d'un utilisateur
  static getUserPermissions(user: User): Permission[] {
    if (!user || !user.isActive) return [];
    return ROLE_PERMISSIONS[user.role] || [];
  }

  // Vérifier si un utilisateur peut accéder à une fonctionnalité
  static canAccess(user: User, feature: string): boolean {
    const featurePermissions: Record<string, Permission> = {
      'planning_view': 'view_schedule',
      'planning_edit': 'edit_schedule',
      'user_management': 'manage_users',
      'database_save': 'save_to_database',
      'data_export': 'export_data',
      'data_delete': 'delete_data',
      'statistics_view': 'view_statistics',
      'room_management': 'manage_rooms',
      'subject_management': 'manage_subjects'
    };

    const requiredPermission = featurePermissions[feature];
    if (!requiredPermission) return false;
    
    return this.hasPermission(user, requiredPermission);
  }

  // Filtrer les éléments de l'interface selon les permissions
  static filterUIElements<T>(
    user: User, 
    elements: Array<{ id: string; requiredPermission?: Permission; item: T }>
  ): T[] {
    return elements
      .filter(element => {
        if (!element.requiredPermission) return true;
        return this.hasPermission(user, element.requiredPermission);
      })
      .map(element => element.item);
  }

  // Obtenir le niveau d'accès pour l'affichage
  static getAccessLevel(user: User): 'full' | 'partial' | 'readonly' {
    if (!user || !user.isActive) return 'readonly';
    
    switch (user.role) {
      case 'admin':
        return 'full';
      case 'prof':
        return 'readonly';
      case 'student':
        return 'readonly';
      default:
        return 'readonly';
    }
  }

  // Valider si une action est autorisée
  static validateAction(user: User, action: string, context?: any): { 
    allowed: boolean; 
    reason?: string; 
  } {
    // Vérification de base
    if (!user || !user.isActive) {
      return { allowed: false, reason: 'Utilisateur non connecté ou inactif' };
    }

    // Vérification du domaine email
    if (!user.email.endsWith('@supnum.mr')) {
      return { allowed: false, reason: 'Domaine email non autorisé' };
    }

    // Vérification des permissions spécifiques
    const permissionMap: Record<string, Permission> = {
      'edit_course': 'edit_schedule',
      'delete_course': 'delete_data',
      'add_user': 'manage_users',
      'save_changes': 'save_to_database',
      'export_pdf': 'export_data'
    };

    const requiredPermission = permissionMap[action];
    if (requiredPermission && !this.hasPermission(user, requiredPermission)) {
      return { 
        allowed: false, 
        reason: `Permission requise: ${requiredPermission}` 
      };
    }

    // Vérifications contextuelles supplémentaires
    if (action === 'edit_course' && user.role !== 'admin') {
      return { allowed: false, reason: 'Seuls les administrateurs peuvent modifier les cours' };
    }

    return { allowed: true };
  }

  // Obtenir les informations sur le rôle
  static getRoleInfo(role: string): { 
    name: string; 
    description: string; 
    color: string; 
    icon: string;
  } {
    const roleInfo = {
      admin: {
        name: 'Administrateur',
        description: 'Accès complet à toutes les fonctionnalités',
        color: '#ef4444',
        icon: '👑'
      },
      prof: {
        name: 'Professeur',
        description: 'Peut consulter et imprimer les plannings',
        color: '#8b5cf6',
        icon: '👨‍🏫'
      },
      student: {
        name: 'Étudiant',
        description: 'Accès en consultation uniquement',
        color: '#3b82f6',
        icon: '🎓'
      }
    };

    return roleInfo[role as keyof typeof roleInfo] || roleInfo.student;
  }

  // Mettre à jour le rôle d'un utilisateur (admin uniquement)
  static async updateUserRole(
    adminUser: User, 
    targetUserId: string, 
    newRole: 'admin' | 'prof' | 'student'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.hasPermission(adminUser, 'manage_users')) {
      return { success: false, error: 'Permission refusée' };
    }

    // Implémentation avec Supabase ou base locale
    try {
      // TODO: Implémenter la mise à jour dans la base de données
      console.log(`Updating user ${targetUserId} to role ${newRole} by ${adminUser.username}`);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }
}
