"use client";

import React, { useState } from 'react';
import { Users, LogIn } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 text-white p-3 rounded-full mb-4">
            <Users size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Supnum Timetable</h1>
          <p className="text-slate-600 text-center">Connectez-vous pour accéder à l'application</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Entrez votre nom d'utilisateur"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
