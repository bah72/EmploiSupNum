import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Trash2, UserPlus, Shield, GraduationCap, Key } from 'lucide-react';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [newPassword, setNewPassword] = useState('');
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form states
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('etudiant');
    const [newUserName, setNewUserName] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            console.log('Tentative de chargement des utilisateurs...');
            const res = await fetch('/api/users');
            
            if (!res.ok) {
                console.error('Erreur HTTP:', res.status, res.statusText);
                setMsg({ type: 'error', text: `Erreur HTTP ${res.status}: ${res.statusText}` });
                return;
            }
            
            const data = await res.json();
            console.log('Réponse API:', data);
            
            if (data.error) {
                console.error('Erreur API:', data.error);
                setMsg({ type: 'error', text: data.error });
                setUsers([]);
            } else {
                setUsers(Array.isArray(data) ? data : []);
                if (Array.isArray(data) && data.length === 0) {
                    setMsg({ type: 'error', text: 'Aucun utilisateur trouvé dans la base de données' });
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setMsg({ type: 'error', text: 'Erreur de connexion à l\'API. Vérifiez la configuration Supabase.' });
            setUsers([]);
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
                    name: newUserName,
                    email: `${newUserUsername}@example.com`
                }),
            });

            if (res.ok) {
                notify('Utilisateur ajouté avec succès', 'success');
                setNewUserUsername('');
                setNewUserPassword('');
                setNewUserRole('etudiant');
                setNewUserName('');
                setShowAddForm(false);
                fetchUsers();
            } else {
                const error = await res.json();
                notify(error.error || 'Erreur lors de l\'ajout', 'error');
            }
        } catch (error) {
            console.error('Error adding user:', error);
            notify('Erreur lors de l\'ajout', 'error');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            return;
        }

        try {
            const res = await fetch(`/api/users?id=${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                notify('Utilisateur supprimé avec succès', 'success');
                fetchUsers();
            } else {
                const error = await res.json();
                notify(error.error || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            notify('Erreur lors de la suppression', 'error');
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/users?id=${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            });

            if (res.ok) {
                notify(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'} avec succès`, 'success');
                fetchUsers();
            } else {
                const error = await res.json();
                notify(error.error || 'Erreur lors de la mise à jour', 'error');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            notify('Erreur lors de la mise à jour', 'error');
        }
    };

    const handleOpenResetPassword = (user: any) => {
        setSelectedUser(user);
        setNewPassword('');
        setShowResetPasswordModal(true);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedUser || !newPassword) {
            notify('Veuillez entrer un nouveau mot de passe', 'error');
            return;
        }

        if (newPassword.length < 6) {
            notify('Le mot de passe doit contenir au moins 6 caractères', 'error');
            return;
        }

        try {
            const res = await fetch(`/api/users/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    newPassword: newPassword
                }),
            });

            if (res.ok) {
                notify('Mot de passe réinitialisé avec succès', 'success');
                setShowResetPasswordModal(false);
                setSelectedUser(null);
                setNewPassword('');
            } else {
                const error = await res.json();
                notify(error.error || 'Erreur lors de la réinitialisation', 'error');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            notify('Erreur lors de la réinitialisation', 'error');
        }
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return <Shield size={16} className="text-red-600" />;
            case 'prof':
                return <GraduationCap size={16} className="text-blue-600" />;
            default:
                return <UserPlus size={16} className="text-green-600" />;
        }
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'prof':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-green-100 text-green-800 border-green-200';
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gestion des Utilisateurs</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Gérez les comptes utilisateurs et leurs permissions
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchUsers}
                        className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                        title="Rafraîchir la liste"
                    >
                        🔄 Rafraîchir
                    </button>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <UserPlus size={18} />
                        Ajouter un utilisateur
                    </button>
                </div>
            </div>

            {/* Message de notification */}
            {msg && (
                <div className={`mb-4 p-4 rounded-lg border ${
                    msg.type === 'success'
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                    {msg.text}
                </div>
            )}

            {/* État de chargement */}
            {loading && (
                <div className="flex items-center justify-center h-32">
                    <div className="text-slate-500">Chargement des utilisateurs...</div>
                </div>
            )}

            {/* Tableau des utilisateurs */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-4 font-semibold text-slate-700">Utilisateur</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Rôle</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Statut</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Dernière connexion</th>
                                <th className="text-right p-4 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-slate-500">
                                        Aucun utilisateur trouvé
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div>
                                                <div className="font-medium text-slate-900">{user.name || user.username}</div>
                                                <div className="text-sm text-slate-500">{user.username}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {getRoleIcon(user.role)}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>
                                                    {user.role === 'admin' ? 'Administrateur' : 
                                                     user.role === 'prof' ? 'Professeur' : 'Étudiant'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleToggleStatus(user.id, user.is_active)}
                                                className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                                style={{
                                                    backgroundColor: user.is_active ? '#10b981' : '#ef4444'
                                                }}
                                                title={user.is_active ? 'Cliquez pour désactiver' : 'Cliquez pour activer'}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                                                        user.is_active ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {user.created_at ? (
                                                <div>
                                                    <div>{new Date(user.created_at).toLocaleDateString('fr-FR', { 
                                                        day: '2-digit', 
                                                        month: '2-digit', 
                                                        year: 'numeric' 
                                                    })}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {new Date(user.created_at).toLocaleTimeString('fr-FR', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenResetPassword(user)}
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                                    title="Réinitialiser le mot de passe"
                                                >
                                                    <Key size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    title="Supprimer l'utilisateur"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Formulaire d'ajout */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Ajouter un utilisateur</h3>
                        
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nom complet
                                </label>
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nom d'utilisateur
                                </label>
                                <input
                                    type="text"
                                    value={newUserUsername}
                                    onChange={(e) => setNewUserUsername(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Rôle
                                </label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="etudiant">Étudiant</option>
                                    <option value="prof">Professeur</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Ajouter
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de réinitialisation du mot de passe */}
            {showResetPasswordModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Réinitialiser le mot de passe
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Utilisateur : <span className="font-medium text-slate-900">{selectedUser.name}</span> ({selectedUser.username})
                        </p>
                        
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nouveau mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Minimum 6 caractères"
                                    required
                                    minLength={6}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Le mot de passe doit contenir au moins 6 caractères
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Key size={16} />
                                    Réinitialiser
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowResetPasswordModal(false);
                                        setSelectedUser(null);
                                        setNewPassword('');
                                    }}
                                    className="flex-1 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
