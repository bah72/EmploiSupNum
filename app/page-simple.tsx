"use client";

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { secureAuthenticate, SecureUser } from './lib/auth-secure';
import LoginScreen from './LoginScreen';

export default function SimplePage() {
  const [currentUser, setCurrentUser] = useState<SecureUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ msg: string, type: 'error' | 'success' } | null>(null);

  // Initialisation côté client
  useEffect(() => {
    setIsClient(true);

    // Charger l'utilisateur depuis localStorage
    const savedUser = localStorage.getItem('supnum_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Erreur lors du chargement utilisateur:', error);
        localStorage.removeItem('supnum_user');
      }
    }
  }, []);

  const handleLogin = async (username: string, password: string): Promise<void> => {
    try {
      const result = await secureAuthenticate(username, password);
      
      if (result.success && result.user) {
        setCurrentUser(result.user);
        localStorage.setItem('supnum_user', JSON.stringify(result.user));
        setToastMessage({ msg: 'Connexion réussie !', type: 'success' });
      } else {
        setToastMessage({ msg: result.error || 'Erreur de connexion', type: 'error' });
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      setToastMessage({ msg: 'Erreur de connexion', type: 'error' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('supnum_user');
    setToastMessage({ msg: 'Déconnexion réussie', type: 'success' });
  };

  // Masquer automatiquement les messages toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Supnum Timetable</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Connecté: {currentUser.username} ({currentUser.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Tableau de bord</h2>
          <p className="text-gray-600 mb-4">
            Bienvenue sur l'application de gestion des emplois du temps.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Planning</h3>
              <p className="text-sm text-gray-600">Gestion des emplois du temps</p>
            </div>
            
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Cours</h3>
              <p className="text-sm text-gray-600">Gestion des matières et enseignants</p>
            </div>
            
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Utilisateurs</h3>
              <p className="text-sm text-gray-600">Gestion des comptes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast messages */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white ${
          toastMessage.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toastMessage.msg}
        </div>
      )}
    </div>
  );
}
