'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, LayoutDashboard, Settings, Database, Save, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import { supabase } from '../lib/supabase';

interface TimetableAppProps {
    user: any;
}

export default function TimetableApp({ user }: TimetableAppProps) {
    const { signOut } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');

    const handleSignOut = async () => {
        const result = await signOut();
        if (result.success) {
            console.log('Deconnexion reussie');
        } else {
            console.error('Erreur de deconnexion:', result.error);
            alert('Erreur lors de la deconnexion: ' + result.error);
        }
    };

    const saveToCloud = async () => {
        if (!user) {
            setSaveMessage('Please connect to save your data');
            setSaveStatus('error');
            setShowAuthModal(true);
            return;
        }

        if (!supabase) {
            setSaveMessage('Save service not available');
            setSaveStatus('error');
            return;
        }

        setSaveStatus('saving');
        setSaveMessage('Saving in progress...');

        try {
            const testData = {
                user_id: user.id,
                config: {
                    startDate: '2024-09-02',
                    totalWeeks: 16,
                    numberOfGroups: 4
                },
                custom_rooms: [],
                custom_subjects: [],
                schedule: {},
                assignment_rows: []
            };

            const { data, error } = await supabase
                .from('timetable_data')
                .upsert(testData as any)
                .select();

            if (error) {
                console.error('Erreur Supabase:', error);
                setSaveMessage('Erreur lors de la sauvegarde: ' + error.message);
                setSaveStatus('error');
            } else {
                setSaveMessage('Data saved to cloud successfully');
                setSaveStatus('success');
                
                setTimeout(() => {
                    setSaveStatus('idle');
                    setSaveMessage('');
                }, 3000);
            }
        } catch (error) {
            console.error('Erreur:', error);
            setSaveMessage('Technical error during save');
            setSaveStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header avec authentification */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800">Supnum Timetable</h1>
                    
                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <UserIcon size={18} className="text-slate-600" />
                                    <span className="text-sm text-slate-700">{user.email}</span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <LogIn size={16} />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Modal d'authentification */}
            <AuthModal 
                isOpen={showAuthModal} 
                onClose={() => setShowAuthModal(false)} 
            />

            {/* Contenu principal */}
            <main className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <div className="flex gap-2 mb-6">
                        {[
                            { id: 'planning', label: 'Schedule', icon: Calendar },
                            { id: 'manage', label: 'Manage', icon: LayoutDashboard },
                            { id: 'config', label: 'Settings', icon: Settings },
                            { id: 'data', label: 'Data', icon: Database }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Bouton de sauvegarde */}
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={saveToCloud}
                            disabled={saveStatus === 'saving'}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                                saveStatus === 'saving' 
                                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                                    : saveStatus === 'success'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : saveStatus === 'error'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            <Save size={18} />
                            {saveStatus === 'saving' ? 'Saving...' : 'Save to Cloud'}
                        </button>
                    </div>

                    {/* Messages de statut */}
                    {saveMessage && (
                        <div className={`mb-6 p-4 rounded-lg border ${
                            saveStatus === 'success' 
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : saveStatus === 'error'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                            {saveMessage}
                        </div>
                    )}

                    {/* Message de test */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            UTF-8 Encoding Test
                        </h2>
                        <p className="text-slate-600 mb-4">
                            Testing button labels with proper UTF-8 encoding.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-800 mb-2">
                                Button Labels Test:
                            </h3>
                            <p className="text-blue-700 text-sm">
                                Schedule, Manage, Settings, Data, Save to Cloud
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
