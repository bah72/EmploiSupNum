"use client";

import React, { useState } from 'react';
import { Shield, Users, Database, Lock, Key, Eye, AlertTriangle, CheckCircle, Copy, Terminal } from 'lucide-react';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'users' | 'setup'>('overview');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const policies = [
    {
      name: "Users can view own data",
      table: "timetable_storage",
      action: "SELECT",
      description: "Les utilisateurs peuvent voir leurs propres données et les données publiques"
    },
    {
      name: "Admins can view all data", 
      table: "timetable_storage",
      action: "SELECT",
      description: "Les administrateurs peuvent voir toutes les données"
    },
    {
      name: "Users can insert own data",
      table: "timetable_storage", 
      action: "INSERT",
      description: "Les utilisateurs peuvent insérer leurs propres données"
    },
    {
      name: "Only admins can delete data",
      table: "timetable_storage",
      action: "DELETE", 
      description: "Seuls les administrateurs peuvent supprimer des données"
    },
    {
      name: "Anyone can view active users",
      table: "app_users",
      action: "SELECT",
      description: "Tout le monde peut voir les utilisateurs actifs"
    },
    {
      name: "Only admins can manage users",
      table: "app_users",
      action: "ALL",
      description: "Seuls les administrateurs peuvent gérer les utilisateurs"
    }
  ];

  const defaultUsers = [
    {
      username: "moussa.ba",
      email: "moussa.ba@supnum.mr", 
      role: "admin",
      name: "Moussa Ba",
      password: "moussa.ba",
      color: "bg-green-100 text-green-700"
    },
    {
      username: "cheikh.dhib",
      email: "cheikh.dhib@supnum.mr",
      role: "prof", 
      name: "Cheikh Dhib",
      password: "cheikh.dhib",
      color: "bg-purple-100 text-purple-700"
    },
    {
      username: "25064",
      email: "25064@supnum.mr",
      role: "student",
      name: "Étudiant 25064", 
      password: "12345678",
      color: "bg-blue-100 text-blue-700"
    }
  ];

  const setupCommands = [
    {
      title: "Créer les tables",
      command: `CREATE TABLE timetable_storage (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'prof', 'student')),
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
    },
    {
      title: "Appliquer les politiques RLS",
      command: "psql -v ON_ERROR_STOP=1 --username \"$POSTGRES_USER\" --dbname \"$POSTGRES_DB\" < supabase/policies.sql"
    },
    {
      title: "Initialiser les utilisateurs",
      command: "psql -v ON_ERROR_STOP=1 --username \"$POSTGRES_USER\" --dbname \"$POSTGRES_DB\" < supabase/seed_users.sql"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="text-green-600" size={32} />
            Centre de Sécurité Supnum Timetable
          </h1>
          <p className="text-slate-600 mt-2">
            Configuration des politiques de sécurité, gestion des utilisateurs et monitoring du système
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Aperçu', icon: Eye },
              { id: 'policies', label: 'Politiques RLS', icon: Lock },
              { id: 'users', label: 'Utilisateurs', icon: Users },
              { id: 'setup', label: 'Installation', icon: Terminal }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield size={20} className="text-green-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Double Authentification</h3>
                </div>
                <p className="text-slate-600 text-sm">
                  Validation @supnum.mr + Policies RLS pour une protection complète
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">3 Rôles Sécurisés</h3>
                </div>
                <p className="text-slate-600 text-sm">
                  Admin, Prof, Étudiant avec permissions granulaires
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Database size={20} className="text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Stockage Supabase</h3>
                </div>
                <p className="text-slate-600 text-sm">
                  Données utilisateur sécurisées avec Row Level Security
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Key size={20} className="text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Matricules</h3>
                </div>
                <p className="text-slate-600 text-sm">
                  Login par matricule pour les étudiants (ex: 25064@supnum.mr)
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Lock size={20} className="text-red-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Protection Système</h3>
                </div>
                <p className="text-slate-600 text-sm">
                  Nettoyage automatique et validation périodique
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={20} className="text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Audit Complet</h3>
                </div>
                <p className="text-slate-600 text-sm">
                  Logs d'accès et monitoring des activités
                </p>
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Lock size={20} />
                  Politiques Row Level Security (RLS)
                </h2>
                <p className="text-slate-600 mt-1">
                  Politiques de sécurité appliquées sur les tables Supabase
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                {policies.map((policy, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{policy.name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Database size={14} />
                            {policy.table}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            {policy.action}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-2">{policy.description}</p>
                      </div>
                      <div className="ml-4">
                        <CheckCircle className="text-green-500" size={20} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <Users size={20} />
                  Utilisateurs par Défaut
                </h2>
                <p className="text-slate-600 mt-1">
                  Comptes système prédéfinis et protégés
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {defaultUsers.map((user, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.color}`}>
                          {user.role.toUpperCase()}
                        </span>
                        <Shield size={16} className="text-slate-400" />
                      </div>
                      <h3 className="font-medium text-slate-900 mb-1">{user.name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Email:</span>
                          <span className="font-mono text-slate-700">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Password:</span>
                          <span className="font-mono text-slate-700">{user.password}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle size={12} />
                          Compte système protégé
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <Terminal size={20} />
                    Commandes d'Installation
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Scripts SQL pour configurer la sécurité Supabase
                  </p>
                </div>
                <div className="divide-y divide-slate-200">
                  {setupCommands.map((cmd, index) => (
                    <div key={index} className="p-6">
                      <h3 className="font-medium text-slate-900 mb-3">{cmd.title}</h3>
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{cmd.command}</code>
                        </pre>
                        <button
                          onClick={() => copyToClipboard(cmd.command)}
                          className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                          title="Copier"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-medium text-amber-900 mb-2">Important</h3>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Exécutez ces commandes dans l'ordre indiqué</li>
                      <li>• Assurez-vous d'avoir les permissions administrateur sur Supabase</li>
                      <li>• Vérifiez les variables d'environnement avant de démarrer</li>
                      <li>• Testez l'accès avec les utilisateurs par défaut</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
