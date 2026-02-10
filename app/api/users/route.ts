import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '../../lib/auth-secure';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Créer le client Supabase
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export async function GET() {
    if (!supabase) {
        // Mode local ou hors ligne : retourner les utilisateurs par défaut (lecture seule)
        // Note: On ne retourne pas les mots de passe même hashés par sécurité
        const { DEFAULT_USERS } = require('../../constants');
        return NextResponse.json(DEFAULT_USERS.map((u: any) => {
            const { password, ...userWithoutPassword } = u;
            return { ...userWithoutPassword, is_active: true };
        }));
    }

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, email, role, name, created_at, last_login, is_active')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!supabase) {
        return NextResponse.json({ error: 'Ajout impossible en mode local' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { username, password, role, name } = body;

        // Validation basique
        if (!username || !password || !role || !name) {
            return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
        }

        // Hasher le mot de passe
        const passwordHash = await hashPassword(password);

        // Insérer l'utilisateur
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    email: username, // On utilise le username comme email pour l'instant
                    password_hash: passwordHash,
                    role,
                    name,
                    is_active: true
                }
            ])
            .select('id, username, email, role, name, created_at, is_active')
            .single();

        if (error) {
            // Gérer l'erreur de contrainte unique (utilisateur déjà existant)
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Cet utilisateur existe déjà' }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    if (!supabase) {
        return NextResponse.json({ error: 'Modification impossible en mode local' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID requis' }, { status: 400 });
        }

        // On ne permet pas de modifier le mot de passe via cette route basique pour l'instant
        // (faudrait le hasher si présent)
        if (updates.password) {
            delete updates.password;
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select('id, username, email, role, name, is_active')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!supabase) {
        return NextResponse.json({ error: 'Suppression impossible en mode local' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
