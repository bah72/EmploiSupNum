import { NextResponse } from 'next/server';
import { TimetableDatabase } from '@/lib/database';
import { User } from '@/app/types';

async function getAppUsers(): Promise<User[]> {
    return await TimetableDatabase.getAppUsers();
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        // Validation simple de l'email @supnum.mr
        if (!email.endsWith('@supnum.mr')) {
            return NextResponse.json({ error: 'Seuls les emails @supnum.mr sont autorisés' }, { status: 400 });
        }

        // Validation du mot de passe selon l'utilisateur
        const username = email.split('@')[0];
        let isValidPassword = false;
        let role: 'admin' | 'prof' | 'student' = 'student';

        if (email === 'moussa.ba@supnum.mr') {
            isValidPassword = password === 'moussa.ba';
            role = 'admin';
        } else if (email === 'cheikh.dhib@supnum.mr') {
            isValidPassword = password === 'cheikh.dhib';
            role = 'prof';
        } else if (email === '25064@supnum.mr') {
            isValidPassword = password === '12345678';
            role = 'student';
        } else if (/^\d{6,}$/.test(username)) {
            // Matricule : 6 chiffres ou plus
            isValidPassword = password === '12345678';
            role = 'student';
        } else {
            // Pour les autres utilisateurs
            isValidPassword = password === '12345678';
            role = 'student';
        }

        if (!isValidPassword) {
            return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
        }

        // Créer l'utilisateur
        const user = {
            id: username,
            username,
            email,
            role,
            isActive: true
        };

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
