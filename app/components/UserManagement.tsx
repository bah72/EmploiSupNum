
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Trash2, UserPlus, Check, X, Shield, GraduationCap, Power } from 'lucide-react';

export default function UserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form states
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('student');
    const [newUserName, setNewUserName] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const notify = (text: string, type: 'success' | 'error') => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3000);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUserUsername,
                    password: newUserPassword,
                    role: newUserRole,
                    name: newUserName
                }),
            });

            if (res.ok) {
                notify('Utilisateur créé avec succès', 'success');
                setNewUserUsername('');
                setNewUserPassword('');
                setNewUserName('');
                setNewUserRole('student');
                setShowAddForm(false);
                fetchUsers();
            } else {
                const data = await res.json();
                notify(data.error || 'Erreur lors de la création', 'error');
            }
        } catch (error) {
            notify('Erreur technique', 'error');
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${username} ?`)) return;

        try {
            const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                notify('Utilisateur supprimé', 'success');
                fetchUsers();
            } else {
                const data = await res.json();
                notify(data.error || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            notify('Erreur technique', 'error');
        }
    };

    const toggleUserStatus = async (user: User) => {
        // Pour l'instant, l'API PUT gère les mises à jour génériques
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id,
                    isActive: !user.isActive
                })
            });

            if (res.ok) {
                fetchUsers();
            } else {
                notify("Erreur lors de la mise à jour", 'error');
            }
        } catch (e) {
            notify("Erreur technique", 'error');
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield size={24} className="text-green-600" />
                        Gestion des Utilisateurs
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Créez et gérez les comptes d'accès à l'application</p>
                </div>

                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    {showAddForm ? <X size={18} /> : <UserPlus size={18} />}
                    {showAddForm ? 'Fermer' : 'Nouveau compte'}
                </button>
            </div>

            {msg && (
                <div className={`p-4 rounded-md mb-6 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {msg.text}
                </div>
            )}

            {showAddForm && (
                <div className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-semibold text-slate-700 mb-4">Nouvel Utilisateur</h3>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                            <input
                                type="text"
                                value={newUserName}
                                onChange={e => setNewUserName(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Jean Dupont"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Identifiant</label>
                            <input
                                type="text"
                                value={newUserUsername}
                                onChange={e => setNewUserUsername(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: etudiant1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
                            <input
                                type="password"
                                value={newUserPassword}
                                onChange={e => setNewUserPassword(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                            <div className="flex bg-white rounded border border-slate-300 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('admin')}
                                    className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${newUserRole === 'admin' ? 'bg-green-100 text-green-700' : 'hover:bg-slate-50'}`}
                                >
                                    <Shield size={16} /> Admin
                                </button>
                                <div className="w-px bg-slate-300"></div>
                                <button
                                    type="button"
                                    onClick={() => setNewUserRole('student')}
                                    className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${newUserRole === 'student' ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-50'}`}
                                >
                                    <GraduationCap size={16} /> Étudiant
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-2 mt-2 flex justify-end">
                            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 transition-colors">
                                Créer le compte
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="py-3 px-4">Utilisateur</th>
                            <th className="py-3 px-4">Rôle</th>
                            <th className="py-3 px-4">Statut</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4">
                                    <div className="font-medium text-slate-800">{user.name || user.username}</div>
                                    <div className="text-slate-400 text-xs">@{user.username}</div>
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {user.role === 'admin' ? <Shield size={12} /> : <GraduationCap size={12} />}
                                        {user.role === 'admin' ? 'Administrateur' : 'Étudiant'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <button
                                        onClick={() => toggleUserStatus(user)}
                                        disabled={user.username === 'admin'}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${user.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {user.isActive ? <Check size={12} /> : <Power size={12} />}
                                        {user.isActive ? 'Actif' : 'Désactivé'}
                                    </button>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    {user.username !== 'admin' && (
                                        <button
                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-500">Aucun utilisateur trouvé</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
