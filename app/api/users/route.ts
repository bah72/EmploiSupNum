
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { User, UserRole } from '@/app/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

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


function getUsers(): User[] {
    if (!fs.existsSync(USERS_FILE)) {
        const initialUsers = [DEFAULT_ADMIN, DEFAULT_STUDENT];
        fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
        return initialUsers;
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading users file:", error);
        return [DEFAULT_ADMIN, DEFAULT_STUDENT];
    }
}

function saveUsers(users: User[]) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function GET() {
    const users = getUsers();
    // Don't return passwords
    const safeUsers = users.map(({ password, ...user }) => user);
    return NextResponse.json(safeUsers);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, role, name } = body;

        if (!username || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const users = getUsers();

        if (users.find(u => u.username === username)) {
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
        saveUsers(users);

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

        const users = getUsers();
        const index = users.findIndex(u => u.id === id);

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
        saveUsers(users);

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

        let users = getUsers();
        const userToDelete = users.find(u => u.id === id);

        if (!userToDelete) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Prevent deleting the default users (admin and etudiant)
        if (userToDelete.username === 'admin' || userToDelete.username === 'etudiant') {
            return NextResponse.json({ error: 'Cannot delete default users' }, { status: 403 });
        }

        users = users.filter(u => u.id !== id);
        saveUsers(users);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
