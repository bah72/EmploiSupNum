import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { User, UserRole } from '@/app/types';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAppUsers(): Promise<User[]> {
    try {
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Convertir les données de Supabase au format User
        return data.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role as UserRole,
            name: user.name,
            isActive: user.is_active
        }));
    } catch (error) {
        console.error('Error fetching users from Supabase:', error);
        // Fallback vers le système local si Supabase n'est pas disponible
        return [];
    }
}

async function saveAppUser(user: Partial<User>) {
    try {
        const { data, error } = await supabase
            .from('app_users')
            .upsert({
                username: user.username,
                email: user.email,
                role: user.role,
                name: user.name,
                is_active: user.isActive
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving user to Supabase:', error);
        throw error;
    }
}

export async function GET() {
    try {
        const users = await getAppUsers();
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, email, role, name } = body;

        if (!username || !email || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Valider le domaine email
        if (!email.endsWith('@supnum.mr')) {
            return NextResponse.json({ error: 'Only @supnum.mr emails are allowed' }, { status: 400 });
        }

        // Vérifier si l'utilisateur existe déjà
        const { data: existingUser } = await supabase
            .from('app_users')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUser) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        const newUser = await saveAppUser({
            username,
            email,
            role: role as UserRole,
            name: name || username,
            isActive: true
        });

        return NextResponse.json(newUser);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        // Empêcher la modification des utilisateurs par défaut
        const { data: currentUser } = await supabase
            .from('app_users')
            .select('username')
            .eq('id', id)
            .single();

        if (currentUser && ['moussa.ba', 'cheikh.dhib', '25064'].includes(currentUser.username)) {
            return NextResponse.json({ error: 'Cannot modify default users' }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('app_users')
            .update({
                username: updates.username,
                email: updates.email,
                role: updates.role,
                name: updates.name,
                is_active: updates.isActive
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        // Vérifier si c'est un utilisateur par défaut
        const { data: userToDelete } = await supabase
            .from('app_users')
            .select('username')
            .eq('id', id)
            .single();

        if (userToDelete && ['moussa.ba', 'cheikh.dhib', '25064'].includes(userToDelete.username)) {
            return NextResponse.json({ error: 'Cannot delete default users' }, { status: 403 });
        }

        const { error } = await supabase
            .from('app_users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
