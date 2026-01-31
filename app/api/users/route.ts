import { NextResponse } from 'next/server';
import { TimetableDatabase } from '@/lib/database';
import { User, UserRole } from '@/app/types';

// Initial default users
const DEFAULT_ADMIN: User = {
    id: 'admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    isActive: true,
    name: 'Administrateur'
};

const DEFAULT_STUDENT: User = {
    id: 'etudiant',
    username: 'etudiant',
    password: '12345678',
    role: 'student',
    isActive: true,
    name: 'Étudiant'
};

async function getAppUsers(): Promise<User[]> {
    const users = await TimetableDatabase.getAppUsers();
    if (users.length === 0) {
        const initialUsers = [DEFAULT_ADMIN, DEFAULT_STUDENT];
        await TimetableDatabase.saveAppUsers(initialUsers);
        return initialUsers;
    }
    return users;
}

async function saveAppUsers(users: User[]) {
    await TimetableDatabase.saveAppUsers(users);
}

export async function GET() {
    const users = await getAppUsers();
    // Don't return passwords
    const safeUsers = users.map(({ password, ...user }: any) => user);
    return NextResponse.json(safeUsers);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, role, name } = body;

        if (!username || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const users = await getAppUsers();

        if (users.find((u: any) => u.username === username)) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        const newUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            username,
            password, // In a real app, hash this!
            role: role as UserRole,
            isActive: true,
            name: name || username
        };

        users.push(newUser);
        await saveAppUsers(users);

        const { password: _, ...safeUser } = newUser;
        return NextResponse.json(safeUser);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const users = await getAppUsers();
        const index = users.findIndex((u: any) => u.id === id);

        if (index === -1) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent deleting/disabling the last admin? Not strictly enforced here but good practice.

        const updatedUser = { ...users[index], ...updates };
        // Determine if password is being updated or kept
        if (!updates.password) {
            updatedUser.password = users[index].password;
        }

        users[index] = updatedUser;
        await saveAppUsers(users);

        const { password: _, ...safeUser } = updatedUser;
        return NextResponse.json(safeUser);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        let users = await getAppUsers();
        const userToDelete = users.find((u: any) => u.id === id);

        if (!userToDelete) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Prevent deleting the default users (admin and etudiant)
        if (userToDelete.username === 'admin' || userToDelete.username === 'etudiant') {
            return NextResponse.json({ error: 'Cannot delete default users' }, { status: 403 });
        }

        users = users.filter((u: any) => u.id !== id);
        await saveAppUsers(users);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
