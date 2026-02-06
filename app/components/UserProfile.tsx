"use client";

import React from 'react';
import { Crown, GraduationCap, UserCheck, Shield, Eye, Edit3, Download } from 'lucide-react';
import { User } from '../types';
import { RoleManager } from '../../lib/roleManager';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

export default function UserProfile({ user, onLogout }: UserProfileProps) {
  const roleInfo = RoleManager.getRoleInfo(user.role);
  const permissions = RoleManager.getUserPermissions(user);
  const accessLevel = RoleManager.getAccessLevel(user);

  const getPermissionIcon = (permission: string) => {
    const icons: Record<string, React.ReactNode> = {
      'view_schedule': <Eye size={14} />,
      'edit_schedule': <Edit3 size={14} />,
      'manage_users': <UserCheck size={14} />,
      'save_to_database': <Download size={14} />,
      'export_data': <Download size={14} />,
      'delete_data': <Shield size={14} />,
      'view_statistics': <Eye size={14} />,
      'manage_rooms': <Edit3 size={14} />,
      'manage_subjects': <Edit3 size={14} />
    };
    return icons[permission] || <Eye size={14} />;
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      'view_schedule': 'Voir planning',
      'edit_schedule': 'Modifier planning',
      'manage_users': 'Gérer utilisateurs',
      'save_to_database': 'Sauvegarder',
      'export_data': 'Exporter',
      'delete_data': 'Supprimer',
      'view_statistics': 'Voir statistiques',
      'manage_rooms': 'Gérer salles',
      'manage_subjects': 'Gérer matières'
    };
    return labels[permission] || permission;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
      {/* En-tête du profil */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: roleInfo.color }}
          >
            {roleInfo.icon}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{user.name || user.username}</h3>
            <p className="text-sm text-slate-600">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Déconnexion
        </button>
      </div>

      {/* Informations sur le rôle */}
      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: roleInfo.color }}
          ></div>
          <span className="font-medium text-slate-700">{roleInfo.name}</span>
        </div>
        <p className="text-xs text-slate-600">{roleInfo.description}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
            Niveau: {accessLevel === 'full' ? 'Complet' : accessLevel === 'partial' ? 'Partiel' : 'Lecture seule'}
          </span>
          {user.isActive && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
              Actif
            </span>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div>
        <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
          <Shield size={16} />
          Permissions accordées
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {permissions.map((permission) => (
            <div
              key={permission}
              className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm"
            >
              {getPermissionIcon(permission)}
              <span className="text-slate-700">{getPermissionLabel(permission)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avertissement de sécurité */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Shield size={16} className="text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-700">
            <p className="font-medium mb-1">Accès sécurisé</p>
            <p>Cette session est protégée par l'authentification @supnum.mr et les permissions sont basées sur votre rôle.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
