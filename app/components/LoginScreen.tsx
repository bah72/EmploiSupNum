import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginScreenProps {
    onLogin: (user: User) => void;
}

console.log('=== COMPONENTS LOGINSCREEN MOUNTED ===');
console.log('This is the components/LoginScreen.tsx');

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    console.log('=== LoginScreen Component Mounted ===');
    console.log('Current email state:', email);
    console.log('Current password state:', password ? '***' : 'none');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('=== LOGIN ATTEMPT (COMPONENTS) ===');
        console.log('Email:', email);
        console.log('Password:', password ? '***' : 'none');

        try {
            // Validation simple de l'email @supnum.mr
            if (!email.endsWith('@supnum.mr')) {
                setError('Seuls les emails @supnum.mr sont autorisés');
                setLoading(false);
                return;
            }

            // TENTATIVE DE CONNEXION RÉELLE avec Supabase
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                console.error('Supabase auth error:', authError);
                setError('Identifiants invalides dans la base Supabase');
                setLoading(false);
                return;
            }

            console.log('Supabase auth success:', data);

            // RÉCUPÉRATION DU RÔLE (déduction par email pour l'instant)
            let role: 'admin' | 'prof' | 'student' = 'student';
            if (email === 'moussa.ba@supnum.mr') {
                role = 'admin';
            } else if (email === 'cheikh.dhib@supnum.mr') {
                role = 'prof';
            } else if (/^\d{6,}$/.test(email.split('@')[0])) {
                role = 'student';
            }

            const user = {
                id: data.user!.id,
                username: email.split('@')[0],
                email: data.user!.email!,
                role,
                isActive: true
            };

            console.log('=== LOGIN SUCCESS (COMPONENTS) ===');
            console.log('User created:', user);
            onLogin(user);
        } catch (err: any) {
            console.error('=== LOGIN ERROR (COMPONENTS) ===');
            console.error('Exception:', err);
            setError('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Connexion SupNum</h1>
                    <p className="text-slate-500 mt-2">Veuillez vous identifier pour continuer</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm flex items-center">
                        <span className="font-bold mr-2">!</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email institutionnel</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                placeholder="votre.nom@supnum.mr"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${loading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}
              transition-colors`}
                    >
                        {loading ? 'Connexion en cours...' : 'Se connecter'}
                    </button>
                </form>

                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-semibold text-slate-700 mb-2 text-sm">Comptes disponibles :</h3>
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-slate-600">Admin : moussa.ba@supnum.mr (mot de passe: 12345678)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-slate-600">Prof : cheikh.dhib@supnum.mr (mot de passe: 12345678)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-slate-600">Étudiant : 25064@supnum.mr (mot de passe: 12345678)</span>
                        </div>
                    </div>
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                        <p className="font-medium">Note :</p>
                        <p>• Ces comptes doivent être créés dans Supabase Auth</p>
                        <p>• Mot de passe uniforme : 12345678</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
