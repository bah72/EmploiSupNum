import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Créer le client Supabase
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export async function POST(request: Request) {
    if (!supabase) {
        // Fallback local handled in auth-secure.ts, but here it's an API route.
        // If we are here, we expect Supabase usage.
        return NextResponse.json({ error: 'Supabase non configuré sur le serveur' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Identifiants manquants' }, { status: 400 });
        }

        // Rechercher l'utilisateur (avec Service Role on contourne RLS)
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('is_active', true)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            // Enregistrer l'échec
            await supabase
                .from('users')
                .update({
                    last_failed_login: new Date().toISOString(),
                    failed_login_count: (user.failed_login_count || 0) + 1
                })
                .eq('id', user.id);

            return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
        }

        // Succès : MAJ dernière connexion
        await supabase
            .from('users')
            .update({
                last_login: new Date().toISOString(),
                failed_login_count: 0
            })
            .eq('id', user.id);

        // Générer token
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password_hash, ...secureUser } = user;

        return NextResponse.json({
            success: true,
            user: secureUser,
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
