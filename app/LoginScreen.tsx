"use client";

import React, { useState } from 'react';
import { Users, LogIn } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Ajouter automatiquement @supnum.mr si pas présent
      const fullUsername = username.includes('@') ? username : `${username}@supnum.mr`;
      await onLogin(fullUsername, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* Header avec logo */}
        <div className="p-8 text-center" style={{ backgroundColor: '#c4d79b' }}>
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-4 p-2 shadow-lg">
            <img src="/supnum.png" alt="SupNum" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2 leading-tight">Institut Supérieur du Numérique</h1>
          <p className="text-gray-700 text-base font-semibold">Gestion des emplois du temps</p>
        </div>

        {/* Formulaire */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 pr-32 border-2 border-slate-200 rounded-xl outline-none transition-all text-slate-900 placeholder-slate-400 focus:border-[#a8c070] focus:ring-2 focus:ring-[#a8c070]/30"
                  placeholder="admin"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm select-none pointer-events-none">
                  @supnum.mr
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none transition-all text-slate-900 focus:border-[#a8c070] focus:ring-2 focus:ring-[#a8c070]/30"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-slate-900 py-3.5 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ backgroundColor: '#c4d79b' }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Se connecter
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
